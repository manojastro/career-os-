import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { parseGuide, skillNameFor } from "../src/lib/learning/parse";

const UID = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const db = new PGlite({ extensions: { pgcrypto } });
let date: string;
let topicId: string;
let assignmentId: string;
let taskId: string;

beforeAll(async () => {
  await db.exec(`
    create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    grant usage on schema public,auth to authenticated,service_role;
  `);
  for (const migration of ["202609180001_initial.sql", "202609180002_owned_links.sql", "202610090001_learning_manager.sql", "202610090002_learning_transactions.sql", "202610090003_learning_import_and_scheduler.sql", "202610090004_learning_delivery.sql", "202610090005_learning_timezone.sql"]) {
    try { await db.exec(readFileSync(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8")); }
    catch (cause) { throw new Error(`Migration ${migration}: ${cause instanceof Error ? cause.message : String(cause)}`); }
  }
  await db.exec("grant all on all tables in schema public to authenticated,service_role;");
  await db.query("insert into auth.users(id) values($1),($2)", [UID, OTHER]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [UID]);
  date = (await db.query<{ date: string }>("select (now() at time zone 'Asia/Kolkata')::date::text as date")).rows[0].date;
  await db.query("insert into learning_preferences(user_id,baseline_completed_at) values($1,now())", [UID]);
  const source = (await db.query<{ id: string }>("insert into curriculum_sources(user_id,url,document_id) values($1,'https://docs.google.com/document/d/fixture','fixture') returning id", [UID])).rows[0].id;
  topicId = (await db.query<{ id: string }>("insert into curriculum_topics(user_id,source_id,stable_topic_id,volume,title,completion_criteria) values($1,$2,'II-1','II','Python','Record a tested example') returning id", [UID, source])).rows[0].id;
}, 30_000);
afterAll(async () => { await db.close(); });

describe("real PostgreSQL learning transactions", () => {
  it("validates IANA zones and schedule order in PostgreSQL", async () => {
    await expect(db.query("update learning_preferences set timezone='Mars/Unknown' where user_id=$1", [UID])).rejects.toThrow("invalid_timezone");
    await expect(db.query("update learning_preferences set morning_time='09:00' where user_id=$1", [UID])).rejects.toThrow("invalid_schedule_order");
  });
  it("creates one assignment and task on an identical retry", async () => {
    const input = { idempotency_key: `plan:${date}`, topic_id: topicId, assignment_date: date, plan: [{ step: "Typed example", minutes: 30 }], completion_criteria: "Test the example", source: "agent" };
    const call = async () => (await db.query<{ result: { assignment: { id: string; task_id: string }; replayed: boolean } }>("select learning_create_assignment($1,$2::jsonb) result", [UID, JSON.stringify(input)])).rows[0].result;
    const first = await call(); const retry = await call();
    assignmentId = first.assignment.id; taskId = first.assignment.task_id;
    expect(retry.replayed).toBe(true);
    expect(retry.assignment.id).toBe(assignmentId);
    expect((await db.query("select id from tasks")).rows).toHaveLength(1);
    await expect(db.query("select learning_create_assignment($1,$2::jsonb)", [UID, JSON.stringify({ ...input, rationale: "changed" })])).rejects.toThrow("idempotency_conflict");
  });
  it("rolls back feedback and duration when a later write fails", async () => {
    await db.exec("create function fail_learning_log() returns trigger language plpgsql as $$ begin raise exception 'test_log_failure'; end $$; create trigger fail_learning_log before insert on activity_log for each row execute function fail_learning_log();");
    const input = { idempotency_key: "reply:rollback", assignment_id: assignmentId, kind: "partial", channel: "app", minutes: 15 };
    await expect(db.query("select learning_apply_feedback($1,$2::jsonb)", [UID, JSON.stringify(input)])).rejects.toThrow("test_log_failure");
    expect((await db.query("select id from learning_feedback")).rows).toHaveLength(0);
    expect((await db.query("select id from focus_sessions")).rows).toHaveLength(0);
    expect((await db.query<{ actual_minutes: number }>("select actual_minutes from tasks")).rows[0].actual_minutes).toBe(0);
    await db.exec("drop trigger fail_learning_log on activity_log; drop function fail_learning_log();");
  });
  it("counts timer and reported total compatibly, and a reply retry adds no time", async () => {
    await db.query("select learning_record_focus($1,$2,$3,now()-interval '20 minutes',now(),20,false)", [UID, taskId, "00000000-0000-4000-8000-000000000010"]);
    const input = { idempotency_key: "reply:total45", assignment_id: assignmentId, kind: "partial", channel: "app", minutes: 45, minutes_mode: "total" };
    const first = (await db.query<{ result: { minutes_recorded: number; replayed: boolean } }>("select learning_apply_feedback($1,$2::jsonb) result", [UID, JSON.stringify(input)])).rows[0].result;
    const retry = (await db.query<{ result: { replayed: boolean } }>("select learning_apply_feedback($1,$2::jsonb) result", [UID, JSON.stringify(input)])).rows[0].result;
    expect(first.minutes_recorded).toBe(25);
    expect(retry.replayed).toBe(true);
    expect((await db.query<{ actual_minutes: number }>("select actual_minutes from tasks")).rows[0].actual_minutes).toBe(45);
    expect((await db.query<{ total: number }>("select sum(duration_minutes)::int total from focus_sessions")).rows[0].total).toBe(45);
    expect((await db.query("select id from learning_sessions where focus_session_id is not null")).rows).toHaveLength(2);
  });
  it("rejects unmapped Telegram replies and a reply to a different assignment", async () => {
    const input = { idempotency_key: "reply:telegram42", assignment_id: assignmentId, kind: "completed", channel: "telegram", telegram: { chat_ref: "chat", message_id: "42", reply_to_message_id: "41" } };
    await expect(db.query("select learning_apply_feedback($1,$2::jsonb)", [UID, JSON.stringify(input)])).rejects.toThrow("telegram_reply_not_mapped");
    await db.query("insert into telegram_message_map(user_id,assignment_id,kind,direction,chat_ref,message_id,delivery_status) values($1,$2,'evening_check','outbound','chat','41','sent')", [UID, assignmentId]);
    await expect(db.query("select learning_apply_feedback($1,$2::jsonb)", [UID, JSON.stringify({ ...input, assignment_id: "00000000-0000-4000-8000-000000000099" })])).rejects.toThrow("telegram_assignment_mismatch");
    await db.query("select learning_apply_feedback($1,$2::jsonb)", [UID, JSON.stringify(input)]);
    expect((await db.query<{ status: string }>("select status from tasks")).rows[0].status).toBe("completed");
  });
  it("rejects cross-user RPC access and isolates RLS reads", async () => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [OTHER]);
    await db.exec("set role authenticated");
    expect((await db.query("select id from learning_assignments")).rows).toHaveLength(0);
    await expect(db.query("select learning_apply_feedback($1,$2::jsonb)", [UID, JSON.stringify({ idempotency_key: "reply:cross-user", assignment_id: assignmentId, kind: "completed", channel: "app" })])).rejects.toThrow("learning_access_denied");
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [UID]);
  });
  it("imports atomically, deduplicates revisions and keeps progress and the last source", async () => {
    const fixture = readFileSync(new URL("../src/lib/learning/__tests__/fixtures/guide-complete.txt", import.meta.url), "utf8");
    const source = { url: "https://docs.google.com/document/d/fixture-import", document_id: "fixture-import" };
    const sync = async (text: string) => {
      const report = parseGuide(text);
      const topics = report.topics.map((topic) => ({ ...topic, skill_name: skillNameFor(topic) }));
      return (await db.query<{ result: { outcome: string } }>("select learning_import_curriculum($1,$2,$3,$4) result", [UID, source, JSON.stringify(topics), JSON.stringify({ ...report, topics: undefined })])).rows[0].result;
    };
    expect((await sync(fixture)).outcome).toBe("applied");
    expect((await sync(fixture)).outcome).toBe("unchanged");
    const current = (await db.query<{ id: string; active_version_id: string }>("select id,active_version_id from curriculum_sources where document_id='fixture-import'")).rows[0];
    const topic = (await db.query<{ id: string }>("select id from curriculum_topics where source_id=$1 and stable_topic_id='II-1'", [current.id])).rows[0];
    await db.query("insert into learning_baselines(user_id,topic_id,level,basis) values($1,$2,'Practiced','manual')", [UID, topic.id]);
    await db.exec("create function fail_curriculum_switch() returns trigger language plpgsql as $$ begin if new.active_version_id is distinct from old.active_version_id then raise exception 'test_switch_failure'; end if; return new; end $$; create trigger fail_curriculum_switch before update on curriculum_sources for each row execute function fail_curriculum_switch();");
    await expect(sync(fixture.replace("typed backend language", "typed revised backend language"))).rejects.toThrow("test_switch_failure");
    expect((await db.query<{ active_version_id: string }>("select active_version_id from curriculum_sources where id=$1", [current.id])).rows[0].active_version_id).toBe(current.active_version_id);
    await db.exec("drop trigger fail_curriculum_switch on curriculum_sources; drop function fail_curriculum_switch();");
    expect((await sync(fixture.replace("typed backend language", "typed revised backend language"))).outcome).toBe("applied");
    expect((await db.query<{ id: string }>("select id from curriculum_topics where source_id=$1 and stable_topic_id='II-1'", [current.id])).rows[0].id).toBe(topic.id);
    expect((await db.query("select id from learning_baselines where topic_id=$1", [topic.id])).rows).toHaveLength(1);
    const partial = readFileSync(new URL("../src/lib/learning/__tests__/fixtures/guide-truncated.txt", import.meta.url), "utf8");
    expect((await sync(partial)).outcome).toBe("incomplete_kept_previous");
  });
  it("recovers stale scheduler leases but rejects a finish from the old worker", async () => {
    const claim = async (token: string) => (await db.query<{ result: { claimed: boolean } }>("select learning_claim_run($1,'curriculum_sync',$2,$3,false) result", [UID, date, token])).rows[0].result;
    expect((await claim("worker-first")).claimed).toBe(true);
    expect((await claim("worker-overlap")).claimed).toBe(false);
    await db.exec("update scheduler_runs set lease_until=now()-interval '1 minute'");
    expect((await claim("worker-restart")).claimed).toBe(true);
    await expect(db.query("select learning_finish_run($1,'curriculum_sync',$2,'worker-first','succeeded')", [UID, date])).rejects.toThrow("run_lease_lost");
    await db.query("select learning_finish_run($1,'curriculum_sync',$2,'worker-restart','succeeded')", [UID, date]);
    expect((await claim("worker-after-finish")).claimed).toBe(false);
  });
  it("reserves delivery before sending and never resends an unknown outcome", async () => {
    const begin = async () => (await db.query<{ result: { send_allowed: boolean } }>("select learning_begin_delivery($1,$2,'morning_plan','delivery:fixture','opaque-chat') result", [UID, assignmentId])).rows[0].result;
    expect((await begin()).send_allowed).toBe(true);
    expect((await begin()).send_allowed).toBe(false);
    await db.query("select learning_finish_delivery($1,'delivery:fixture','unknown','','Connection interrupted')", [UID]);
    expect((await begin()).send_allowed).toBe(false);
    await db.query("select learning_finish_delivery($1,'delivery:fixture','sent','902','')", [UID]);
    expect((await begin()).send_allowed).toBe(false);
    await expect(db.query("select learning_finish_delivery($1,'delivery:fixture','sent','903','')", [UID])).rejects.toThrow("delivery_receipt_conflict");
  });
  it("enforces a persisted rate limit", async () => {
    const hit = async () => (await db.query<{ allowed: boolean }>("select learning_rate_limit($1,'fixture',2) allowed", [UID])).rows[0].allowed;
    expect(await hit()).toBe(true); expect(await hit()).toBe(true); expect(await hit()).toBe(false);
  });
});
