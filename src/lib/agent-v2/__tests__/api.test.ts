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
  db = await createV2Database();
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
                Object.values(params).map((v) => (typeof v === "object" ? JSON.stringify(v) : v)),
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
