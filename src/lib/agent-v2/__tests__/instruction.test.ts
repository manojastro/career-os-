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
it("uses saved Telegram selection only for verified service context and preserves explicit learning priority", async () => {
  await db.exec("BEGIN");
  try {
    await db.exec("RESET ROLE");
    await db.query(
      "INSERT INTO control_context(user_id,chat_ref,entity,selected_id) VALUES($1,'fixture-chat','projects',$2)",
      [uid, project],
    );
    await asRole(db, "authenticated");
    const input = {
      action: "add",
      query: "",
      title: "learning Redis",
      type: "Learn",
      priority: "high",
    };
    await db.exec("SAVEPOINT rejection");
    await expect(
      db.query("SELECT agent_v2_instruction($1,'tg:fixture:selection',$2,'fixture-chat')", [
        uid,
        JSON.stringify(input),
      ]),
    ).rejects.toThrow("invalid_request");
    await db.exec("ROLLBACK TO rejection");
    await asRole(db, "service_role");
    const r = (
      await db.query<{ r: { task_id: string } }>(
        "SELECT agent_v2_instruction($1,'tg:fixture:selection',$2,'fixture-chat') r",
        [uid, JSON.stringify(input)],
      )
    ).rows[0].r;
    await db.exec("RESET ROLE");
    expect(
      (await db.query("SELECT project_id,type,priority FROM tasks WHERE id=$1", [r.task_id])).rows,
    ).toEqual([{ project_id: project, type: "Learn", priority: "high" }]);
  } finally {
    await db.exec("ROLLBACK");
  }
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
it("explicit task B completion never finishes or attributes active task A's time to B", async () => {
  await db.exec("RESET ROLE");
  const tasks = (
    await db.query<{ id: string; title: string }>(
      "INSERT INTO tasks(user_id,title) VALUES($1,'Active task A'),($1,'Explicit task B') RETURNING id,title",
      [uid],
    )
  ).rows;
  const a = tasks.find((t) => t.title === "Active task A")!.id,
    b = tasks.find((t) => t.title === "Explicit task B")!.id;
  const confusingProject = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'Explicit task B') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  await db.query("UPDATE tasks SET project_id=$1 WHERE id=$2", [confusingProject, a]);
  await asRole(db, "authenticated");
  await call({ action: "start", query: a }, "web:explicit-a");
  await expect(call({ action: "start", query: b }, "web:conflict-b")).rejects.toThrow(
    "active_focus_conflict",
  );
  expect(await call({ action: "finish", query: "Explicit task B" }, "web:finish-b")).toMatchObject({
    status: "completed",
    task_id: b,
    minutes: 0,
  });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query(
        "SELECT task_id FROM agent_v2_focus_intervals WHERE user_id=$1 AND state='running'",
        [uid],
      )
    ).rows,
  ).toEqual([{ task_id: a }]);
  expect((await db.query("SELECT status,actual_minutes FROM tasks WHERE id=$1", [b])).rows).toEqual(
    [{ status: "completed", actual_minutes: 0 }],
  );
  expect((await db.query("SELECT * FROM focus_sessions WHERE task_id=$1", [b])).rows).toHaveLength(
    0,
  );
});
