import { beforeAll, afterAll, it, expect, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid } from "./database";
const fixture = vi.hoisted(() => ({ auth: null as unknown }));
vi.mock("@/lib/ai-gateway.server", () => ({ userClient: async () => fixture.auth }));
import { handleV2 } from "@/routes/api/v2";
let db: PGlite;
let task: string;
const request = (body: unknown) =>
  new Request("https://fixture.test/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeAll(async () => {
  db = await createV2Database([
    "0006_agent_v2_focus.sql",
    "0007_agent_v2_memory_documents.sql",
    "0008_agent_v2_workflows.sql",
  ]);
  task = (
    await db.query<{ id: string }>(
      "INSERT INTO tasks(user_id,title) VALUES($1,'Fixture API task') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("authenticates before service access and bounds/rejects unknown web input", async () => {
  expect((await handleV2(request({}))).status).toBe(401);
  fixture.auth = {
    user: { id: uid },
    client: {
      rpc: async (name: string, params: Record<string, unknown>) => {
        try {
          return {
            data: (
              await db.query<{ r: unknown }>(
                `SELECT ${name}(${Object.keys(params)
                  .map((_, i) => "$" + (i + 1))
                  .join(",")}) r`,
                Object.values(params).map((v) =>
                  v !== null && typeof v === "object" ? JSON.stringify(v) : v,
                ),
              )
            ).rows[0].r,
            error: null,
          };
        } catch (e) {
          return { data: null, error: { message: (e as Error).message } };
        }
      },
    },
  };
  const id = crypto.randomUUID();
  const input = {
    request_id: id,
    text: "",
    operation: "focus",
    input: { action: "start", task_id: task },
  };
  expect((await handleV2(request({ ...input, uid }))).status).toBe(400);
  expect((await handleV2(request({ ...input, text: "x".repeat(1_000_001) }))).status).toBe(413);
  const started = await handleV2(request(input));
  expect(started.status).toBe(200);
  expect(started.headers.get("cache-control")).toBe("no-store");
  const first = await started.json();
  expect((await (await handleV2(request(input))).json()).session.id).toBe(first.session.id);
  expect(
    (
      await handleV2(
        request({ ...input, input: { action: "start", task_id: crypto.randomUUID() } }),
      )
    ).status,
  ).toBe(409);
  expect(
    (await handleV2(request({ ...input, input: { action: "start", task_id: task, minutes: 30 } })))
      .status,
  ).toBe(400);
});
it("uses original web instruction text and conflicts on changed text with the same request ID", async () => {
  const body = {
    request_id: crypto.randomUUID(),
    text: "Start Fixture API task",
    operation: "instruction",
    input: {},
  };
  const first = await handleV2(request(body));
  expect(first.status).toBe(200);
  expect((await first.json()).session.task_id).toBe(task);
  expect((await handleV2(request(body))).status).toBe(200);
  expect((await handleV2(request({ ...body, text: body.text + "." }))).status).toBe(409);
  for (const text of [
    '"Start Fixture API task"',
    "Should I start Fixture API task?",
    "Don't start Fixture API task",
    "Add Redis",
  ]) {
    expect(
      (await (await handleV2(request({ ...body, request_id: crypto.randomUUID(), text }))).json())
        .status,
    ).toBe("needs_clarification");
  }
  await db.exec("RESET ROLE");
  expect(
    (await db.query<{ n: number }>("SELECT count(*)::int n FROM tasks WHERE user_id=$1", [uid]))
      .rows[0].n,
  ).toBe(1);
});

it("exposes persisted memory and unverified documents through strict owner web API", async () => {
  await asRole(db, "authenticated");
  const memory = {
    request_id: crypto.randomUUID(),
    text: "Remember a fact",
    operation: "memory",
    input: { action: "put", category: "knowledge", key: "api fact", value: "saved" },
  };
  const stored = await handleV2(request(memory));
  expect(stored.status).toBe(200);
  expect((await stored.json()).item.value).toBe("saved");
  const get = await handleV2(
    request({
      ...memory,
      request_id: crypto.randomUUID(),
      input: { action: "get", key: "api fact" },
    }),
  );
  expect((await get.json()).item.value).toBe("saved");
  expect(
    (await handleV2(request({ ...memory, input: { ...memory.input, confirmed: true } }))).status,
  ).toBe(400);
  const doc = await handleV2(
    request({
      request_id: crypto.randomUUID(),
      text: "Register notes",
      operation: "documents",
      input: {
        action: "register",
        file_id: "Web_File_1234567890",
        kind: "doc",
        title: "Web notes",
        category: "knowledge",
      },
    }),
  );
  expect(doc.status).toBe(200);
  expect((await doc.json()).item.status).toBe("unverified");
});
it("prepares, confirms and runs a durable compound plan through strict web API", async () => {
  await asRole(db, "authenticated");
  const send = async (input: unknown) =>
    handleV2(
      request({
        request_id: crypto.randomUUID(),
        text: "Create a task and remember a fact",
        operation: "workflow",
        input,
      }),
    );
  const prepared = await send({
    action: "prepare",
    steps: [
      { id: "task", kind: "task.create", depends_on: [], input: { title: "API workflow task" } },
      {
        id: "fact",
        kind: "memory.put",
        depends_on: ["task"],
        input: { key: "api workflow", category: "knowledge", value: "saved" },
      },
    ],
  });
  expect(prepared.status).toBe(200);
  const p = await prepared.json();
  expect(p.state).toBe("awaiting_confirmation");
  expect((await send({ action: "run", id: p.id, confirmed: true })).status).toBe(400);
  expect(
    (await (await send({ action: "run", id: p.id })).json()).steps.every(
      (s: { status: string }) => s.status === "pending",
    ),
  ).toBe(true);
  expect(
    (
      await send({
        action: "confirm",
        id: p.id,
        approval_id: p.approval_id,
        expected_plan_hash: p.plan_hash,
        confirm: true,
      })
    ).status,
  ).toBe(200);
  const finished = await send({ action: "run", id: p.id });
  expect(finished.status).toBe(200);
  const result = await finished.json();
  expect(result.state).toBe("completed");
  expect(result.steps.every((s: { status: string }) => s.status === "succeeded")).toBe(true);
  expect(
    (await (await send({ action: "resume", id: p.id })).json()).steps.map(
      (s: { result: { id: string } }) => s.result.id,
    ),
  ).toEqual(result.steps.map((s: { result: { id: string } }) => s.result.id));
});
