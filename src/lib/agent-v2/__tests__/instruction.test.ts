import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid } from "./database";
let db: PGlite;
let project: string;
let task: string;
const call = async (input: object, key: string) =>
  (
    await db.query<{ r: Record<string, unknown> }>("SELECT agent_v2_instruction($1,$2,$3,NULL) r", [
      uid,
      key,
      JSON.stringify(input),
    ])
  ).rows[0].r;
beforeAll(async () => {
  db = await createV2Database();
  project = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'LangGraph') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  task = (
    await db.query<{ id: string }>(
      "INSERT INTO tasks(user_id,title,project_id) VALUES($1,'Checkpoint implementation',$2) RETURNING id",
      [uid, project],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("resolves existing project tasks and completes the active actual task", async () => {
  const started = await call({ action: "start", query: "LangGraph" }, "web:inst-start");
  expect((started.session as { task_id: string }).task_id).toBe(task);
  const finished = await call({ action: "finish", query: "LangGraph" }, "web:inst-finish");
  expect((finished.session as { state: string }).state).toBe("finished");
});
it("adds one canonical Build task, deduplicates normalized title, rejects changed retry", async () => {
  const input = {
    action: "add",
    query: "LangGraph",
    title: "implementation of semantic caching",
    type: "Build",
  };
  const result = await call(input, "web:inst-add");
  expect(result.task_id).toBeTruthy();
  expect((await call(input, "web:inst-add")).task_id).toBe(result.task_id);
  expect(
    (
      await call(
        { ...input, title: "  IMPLEMENTATION of semantic caching  " },
        "web:inst-duplicate",
      )
    ).task_id,
  ).toBe(result.task_id);
  await expect(call({ ...input, title: "another task" }, "web:inst-add")).rejects.toThrow(
    "idempotency_conflict",
  );
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT type,priority FROM tasks WHERE id=$1", [result.task_id])).rows,
  ).toEqual([{ type: "Build", priority: "medium" }]);
});
it("clarifies ambiguous projects without creating records", async () => {
  await db.query("INSERT INTO projects(user_id,name) VALUES($1,'Second project')", [uid]);
  await asRole(db, "authenticated");
  const r = await call(
    { action: "add", query: "", title: "learn Redis", type: "Learn" },
    "web:ambiguous",
  );
  expect(r.status).toBe("needs_clarification");
  expect(r.candidates).toHaveLength(2);
});
