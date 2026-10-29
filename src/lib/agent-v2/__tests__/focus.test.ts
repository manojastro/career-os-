import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid, other } from "./database";
let db: PGlite;
let task: string;
let n = 0;
type Session = { id: string; state: string; elapsed_ms: number; task_id: string };
async function call(input: object, key = "web:" + ++n, owner = uid) {
  return (
    await db.query<{ r: { session: Session | null } }>("SELECT agent_v2_focus($1,$2,$3) r", [
      owner,
      key,
      JSON.stringify(input),
    ])
  ).rows[0].r;
}
beforeAll(async () => {
  db = await createV2Database();
  task = (
    await db.query<{ id: string }>(
      "INSERT INTO tasks(user_id,title,type) VALUES($1,'Learn LangGraph','Learn') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("shares a server interval across sources, excludes pause time and finalizes the canonical ledger once", async () => {
  const start = await call({ action: "start", task_id: task }, "web:start");
  expect(start.session?.state).toBe("running");
  await asRole(db, "service_role");
  expect((await call({ action: "status" }, "tg:status")).session?.id).toBe(start.session?.id);
  await asRole(db, "authenticated");
  expect((await call({ action: "start", task_id: task }, "web:again")).session?.id).toBe(
    start.session?.id,
  );
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_focus_intervals SET running_since=now()-interval '125 seconds',started_at=now()-interval '130 seconds' WHERE id=$1",
    [start.session!.id],
  );
  await asRole(db, "authenticated");
  const paused = await call({ action: "pause", session_id: start.session!.id });
  expect(paused.session!.elapsed_ms).toBeGreaterThanOrEqual(125000);
  await call({ action: "resume", session_id: start.session!.id });
  const input = { action: "finish", session_id: start.session!.id, complete: true };
  await call(input, "web:finish");
  await call(input, "web:finish");
  await expect(call({ ...input, complete: false }, "web:finish")).rejects.toThrow(
    "idempotency_conflict",
  );
  await expect(call({ action: "pause", session_id: start.session!.id })).rejects.toThrow(
    "stale_session",
  );
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT duration_minutes FROM focus_sessions WHERE id=$1", [start.session!.id]))
      .rows,
  ).toEqual([{ duration_minutes: 2 }]);
  expect(
    (
      await db.query("SELECT minutes FROM learning_sessions WHERE focus_session_id=$1", [
        start.session!.id,
      ])
    ).rows,
  ).toEqual([{ minutes: 2 }]);
  expect(
    (await db.query("SELECT status,actual_minutes FROM tasks WHERE id=$1", [task])).rows,
  ).toEqual([{ status: "completed", actual_minutes: 2 }]);
});
it("enforces real authenticated ownership, anonymous ACL and read-only interval rows", async () => {
  await asRole(db, "authenticated", other);
  await expect(call({ action: "status" })).rejects.toThrow("learning_access_denied");
  expect((await db.query("SELECT * FROM agent_v2_focus_intervals")).rows).toHaveLength(0);
  await expect(db.exec("UPDATE agent_v2_focus_intervals SET elapsed_ms=900000")).rejects.toThrow(
    "permission denied",
  );
  await asRole(db, "anon");
  await expect(call({ action: "status" })).rejects.toThrow("permission denied");
});
async function newTask(values = "") {
  await db.exec("RESET ROLE");
  const id = (
    await db.query<{ id: string }>(
      `INSERT INTO tasks(user_id,title${values ? ",evidence_required" : ""}) VALUES($1,'Synthetic task'${values ? ",true" : ""}) RETURNING id`,
      [uid],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
  return id;
}
it("rejects another active task and manual time while permitting identity-bound finalization", async () => {
  const one = await newTask(),
    two = await newTask();
  const s = (await call({ action: "start", task_id: one })).session!;
  await expect(call({ action: "start", task_id: two })).rejects.toThrow("active_focus_conflict");
  await db.exec("RESET ROLE");
  await expect(
    db.query(
      "SELECT learning_record_focus($1,$2,gen_random_uuid(),now()-interval '2 minutes',now(),2,false)",
      [uid, one],
    ),
  ).rejects.toThrow("active_focus_conflict");
  await asRole(db, "authenticated");
  await call({ action: "cancel", session_id: s.id });
});
it("records no invented minute for sub-minute completion and preserves evidence guards", async () => {
  const t = await newTask("evidence");
  const s = (await call({ action: "start", task_id: t })).session!;
  await expect(call({ action: "finish", session_id: s.id, complete: true })).rejects.toThrow(
    "evidence_required",
  );
  expect((await call({ action: "status" })).session?.id).toBe(s.id);
  await call({ action: "cancel", session_id: s.id });
  const plain = await newTask();
  const short = (await call({ action: "start", task_id: plain })).session!;
  await call({ action: "finish", session_id: short.id, complete: true });
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT * FROM focus_sessions WHERE id=$1", [short.id])).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("SELECT status,actual_minutes FROM tasks WHERE id=$1", [plain])).rows,
  ).toEqual([{ status: "completed", actual_minutes: 0 }]);
});
it("caps recorded duration at ten hours and refuses changed legacy ledger payloads", async () => {
  const t = await newTask();
  const s = (await call({ action: "start", task_id: t })).session!;
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_focus_intervals SET started_at=now()-interval '12 hours',running_since=now()-interval '12 hours' WHERE id=$1",
    [s.id],
  );
  await asRole(db, "authenticated");
  await call({ action: "finish", session_id: s.id, complete: false });
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT duration_minutes FROM focus_sessions WHERE id=$1", [s.id])).rows,
  ).toEqual([{ duration_minutes: 600 }]);
  await expect(
    db.query("SELECT learning_record_focus($1,$2,$3,now()-interval '1 minute',now(),1,false)", [
      uid,
      t,
      s.id,
    ]),
  ).rejects.toThrow("focus_identity_conflict");
});
it("rejects deleted/foreign tasks, timestamps and arbitrary fields", async () => {
  const t = await newTask();
  await expect(
    call({ action: "start", task_id: t, started_at: new Date().toISOString() }),
  ).rejects.toThrow("invalid_request");
  await asRole(db, "authenticated", other);
  await expect(call({ action: "start", task_id: t }, "web:other", other)).rejects.toThrow(
    "task_not_found",
  );
  await db.exec("RESET ROLE");
  await db.query("UPDATE tasks SET deleted_at=now() WHERE id=$1", [t]);
  await asRole(db, "authenticated");
  await expect(call({ action: "start", task_id: t })).rejects.toThrow("task_not_found");
});
it("retains legacy drafts by rejecting overlap with a remotely started interval even on another task", async () => {
  const legacy = await newTask(),
    remote = await newTask();
  const s = (await call({ action: "start", task_id: remote })).session!;
  await db.exec("RESET ROLE");
  await expect(
    db.query(
      "SELECT learning_record_focus($1,$2,gen_random_uuid(),now()-interval '2 minutes',now(),2,false)",
      [uid, legacy],
    ),
  ).rejects.toThrow("legacy_focus_overlap");
  await asRole(db, "authenticated");
  await call({ action: "cancel", session_id: s.id });
});
