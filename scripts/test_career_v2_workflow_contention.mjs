// Disposable loopback PostgreSQL only; root owns the cluster lifecycle.
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const url = new URL(process.env.WORKFLOW_TEST_DATABASE_URL ?? "http://unconfigured.invalid");
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/postgres"
)
  throw Error("Explicit loopback fixture admin postgres database required");
const name = "career_workflow_test_" + randomUUID().replaceAll("-", "");
const admin = postgres(url.toString(), { max: 1 });
let clients = [];
const uid = "00000000-0000-4000-8000-000000000001";
const read = (p) => readFile(new URL(p, import.meta.url), "utf8");
try {
  await admin.unsafe(`CREATE DATABASE ${name}`);
  url.pathname = "/" + name;
  const [db, a, b] = (clients = Array.from({ length: 3 }, () =>
    postgres(url.toString(), { max: 1 }),
  ));
  await db.unsafe(
    (await read("../src/lib/control/__tests__/schema-fixture.sql")).replace(
      /CREATE ROLE (anon|authenticated|service_role);/g,
      (_, role) =>
        `DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    ),
  );
  await db.unsafe(
    `CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.role'',true),'''')'; GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role; CREATE UNIQUE INDEX learning_session_focus_unique ON learning_sessions(focus_session_id) WHERE focus_session_id IS NOT NULL; CREATE UNIQUE INDEX telegram_message_map_unique ON telegram_message_map(user_id,chat_ref,message_id,direction) WHERE message_id <> '';`,
  );
  await db`INSERT INTO auth.users VALUES(${uid})`;
  await db`INSERT INTO agent_owner(singleton,user_id) VALUES(true,${uid})`;
  for (const fn of (await read("../drizzle/migrations/0003_learning_transactions_rpc.sql")).match(
    /create or replace function[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await db.unsafe(fn);
  for (const fn of (
    await read("../drizzle/migrations/0004_learning_timezone_delivery_reservations.sql")
  ).match(
    /create or replace function public\.learning_(?:begin|finish)_delivery[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await db.unsafe(fn);
  for (const file of [
    "0005_telegram_control.sql",
    "0006_agent_v2_focus.sql",
    "0007_agent_v2_memory_documents.sql",
    "0008_agent_v2_workflows.sql",
  ])
    await db.unsafe(await read("../drizzle/migrations/" + file));
  for (const c of [a, b]) {
    await c`SELECT set_config('request.jwt.claim.sub',${uid},false),set_config('request.jwt.claim.role','authenticated',false)`;
    await c.unsafe("SET ROLE authenticated");
  }
  const pids = await Promise.all(clients.map((c) => c`SELECT pg_backend_pid() id`));
  assert.equal(new Set(pids.map((p) => p[0].id)).size, 3);
  const prepare = async (c, title) =>
    (
      await c`SELECT agent_v2_workflow(${uid},${"web:" + randomUUID()},${c.json({ action: "prepare", steps: [{ id: "task", kind: "task.create", depends_on: [], input: { title } }] })},'Actual synthetic owner instruction',NULL,NULL) r`
    )[0].r;
  const claim = async (c, id) => (await c`SELECT agent_v2_workflow_claim(${uid},${id}) r`)[0].r;
  const finish = (c, id, token) =>
    c`SELECT agent_v2_workflow_finish(${uid},${id},'task',${token}) r`;
  const p = await prepare(a, "Concurrent once");
  const cs = await Promise.all([claim(a, p.id), claim(b, p.id)]);
  assert.equal(cs.filter(Boolean).length, 1);
  const token = cs.find(Boolean).token;
  await Promise.all([finish(a, p.id, token), finish(b, p.id, token)]);
  assert.equal((await db`SELECT count(*)::int n FROM tasks WHERE title='Concurrent once'`)[0].n, 1);
  // Simulate lost response: reconnect the worker; persisted success must win.
  await a.end();
  clients = clients.filter((c) => c !== a);
  const restarted = postgres(url.toString(), { max: 1 });
  clients.push(restarted);
  await restarted`SELECT set_config('request.jwt.claim.sub',${uid},false),set_config('request.jwt.claim.role','authenticated',false)`;
  await restarted.unsafe("SET ROLE authenticated");
  assert.equal(await claim(restarted, p.id), null);
  await finish(restarted, p.id, token);
  const local = await prepare(b, "Crash after claim");
  const stale = await claim(b, local.id);
  await db`UPDATE agent_v2_workflow_steps SET lease_deadline=clock_timestamp()-interval '1 second' WHERE workflow_id=${local.id}`;
  assert.equal(
    await claim(restarted, local.id),
    null,
    "expired local lease respects retry backoff",
  );
  await db`UPDATE agent_v2_workflow_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE workflow_id=${local.id}`;
  const reclaimed = await claim(restarted, local.id);
  assert.notEqual(reclaimed.token, stale.token);
  await assert.rejects(() => finish(b, local.id, stale.token), /stale_lease/);
  await finish(restarted, local.id, reclaimed.token);
  const rollback = await prepare(b, "Rollback before acknowledgement");
  await db.unsafe(
    `CREATE FUNCTION fixture_fail_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='succeeded' THEN RAISE EXCEPTION 'fixture_ack_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_fail_ack BEFORE UPDATE ON agent_v2_workflow_steps FOR EACH ROW EXECUTE FUNCTION fixture_fail_ack();`,
  );
  await finish(b, rollback.id, (await claim(b, rollback.id)).token);
  assert.equal(
    (await db`SELECT count(*)::int n FROM tasks WHERE title='Rollback before acknowledgement'`)[0]
      .n,
    0,
  );
  assert.equal(
    (await db`SELECT status FROM agent_v2_workflow_steps WHERE workflow_id=${rollback.id}`)[0]
      .status,
    "failed",
  );
  await db.unsafe(
    "DROP TRIGGER fixture_fail_ack ON agent_v2_workflow_steps; DROP FUNCTION fixture_fail_ack();",
  );
  await db`UPDATE agent_v2_workflow_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE workflow_id=${rollback.id}`;
  await finish(b, rollback.id, (await claim(b, rollback.id)).token);
  assert.equal(
    (await db`SELECT count(*)::int n FROM tasks WHERE title='Rollback before acknowledgement'`)[0]
      .n,
    1,
  );
  // Synthetic state-machine fixture, not a registered/live provider capability.
  await db`INSERT INTO agent_v2_kind_policy VALUES('fixture.external','external_write',true)`;
  const external = await prepare(b, "Never externally sent");
  await db`UPDATE agent_v2_workflow_steps SET kind='fixture.external' WHERE workflow_id=${external.id}`;
  const network = await claim(b, external.id);
  await db`UPDATE agent_v2_workflow_steps SET lease_deadline=clock_timestamp()-interval '1 second' WHERE workflow_id=${external.id}`;
  assert.equal(await claim(restarted, external.id), null);
  assert.equal(
    (await db`SELECT status FROM agent_v2_workflow_steps WHERE workflow_id=${external.id}`)[0]
      .status,
    "uncertain",
  );
  await assert.rejects(
    () =>
      b`SELECT agent_v2_workflow_provider_finish(${uid},${external.id},'task',${network.token},${b.json({ id: randomUUID(), verification_ref: "forged" })},NULL)`,
    /permission denied/,
  );
  assert.equal(
    (await db`SELECT count(*)::int n FROM tasks WHERE title='Never externally sent'`)[0].n,
    0,
  );
  await db`INSERT INTO agent_v2_kind_policy VALUES('fixture.read','read',false)`;
  const readPlan = await prepare(b, "Synthetic trusted result receipt");
  await db`UPDATE agent_v2_workflow_steps SET kind='fixture.read' WHERE workflow_id=${readPlan.id}`;
  const readClaim = await claim(b, readPlan.id);
  await assert.rejects(() => finish(b, readPlan.id, readClaim.token), /trusted_provider_required/);
  await db`SELECT set_config('request.jwt.claim.sub',${uid},false),set_config('request.jwt.claim.role','service_role',false)`;
  await db.unsafe("SET ROLE service_role");
  const verified = (
    await db`SELECT agent_v2_workflow_provider_finish(${uid},${readPlan.id},'task',${readClaim.token},${db.json({ id: randomUUID(), verification_ref: "synthetic-test-only" })},NULL) r`
  )[0].r;
  assert.equal(verified.state, "completed");
  await db.unsafe("RESET ROLE");
  console.log(
    "PASS: distinct PostgreSQL backends",
    pids.map((p) => p[0].id).join(","),
    "single winner, atomic replay, restart, local reclaim, stale fence, rollback before acknowledgement, external uncertainty, provider trust",
  );
} finally {
  await Promise.all(clients.map((c) => c.end()));
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name}`);
  await admin.end();
}
