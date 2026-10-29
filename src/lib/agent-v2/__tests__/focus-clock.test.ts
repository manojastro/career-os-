import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, uid, asRole } from "./database";
let db: PGlite;
let task: string;
beforeAll(async () => {
  db = await createV2Database();
  task = (
    await db.query<{ id: string }>(
      "INSERT INTO tasks(user_id,title) VALUES($1,'Clock fixture') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  // This is a single-session injected serialization delay, NOT multi-session contention proof.
  await db.exec(`ALTER FUNCTION learning_assert_user(uuid) RENAME TO original_learning_assert_user;
 CREATE FUNCTION learning_assert_user(p_user_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 PERFORM original_learning_assert_user(p_user_id);
 PERFORM pg_sleep(0.12);
 PERFORM set_config('fixture.lock_ready',clock_timestamp()::text,true);
 END $$;`);
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("samples after serialized admission, rather than before admission or at transaction start", async () => {
  const r = (
    await db.query<{
      r: { session: { id: string; started_at: string }; server_now: string };
      ready: string;
    }>(
      "SELECT agent_v2_focus($1,'web:clock-start',$2) r,current_setting('fixture.lock_ready') ready",
      [uid, JSON.stringify({ action: "start", task_id: task })],
    )
  ).rows[0];
  expect(Date.parse(r.r.session.started_at)).toBeGreaterThanOrEqual(Date.parse(r.ready));
  const pause = (
    await db.query<{ r: { session: { elapsed_ms: number } }; ready: string }>(
      "SELECT agent_v2_focus($1,'web:clock-pause',$2) r,current_setting('fixture.lock_ready') ready",
      [uid, JSON.stringify({ action: "pause", session_id: r.r.session.id })],
    )
  ).rows[0];
  expect(pause.r.session.elapsed_ms).toBeGreaterThanOrEqual(120);
  const resume = (
    await db.query<{ r: { session: { running_since: string } }; ready: string }>(
      "SELECT agent_v2_focus($1,'web:clock-resume',$2) r,current_setting('fixture.lock_ready') ready",
      [uid, JSON.stringify({ action: "resume", session_id: r.r.session.id })],
    )
  ).rows[0];
  expect(Date.parse(resume.r.session.running_since)).toBeGreaterThanOrEqual(
    Date.parse(resume.ready),
  );
});
