import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
const fixture = vi.hoisted(() => ({
  calls: [] as string[],
  exposed: false,
  text: "Show my tasks",
  reply: null as string | null,
  feedback: null as Record<string, unknown> | null,
  v2: null as { context: Record<string, unknown>; input: unknown } | null,
}));
vi.mock("@/lib/agent-v2/service.server", () => ({
  dispatchV2: async (_db: unknown, context: Record<string, unknown>, input: unknown) => {
    fixture.v2 = { context, input };
    return { status: "completed" };
  },
}));
vi.mock("@/lib/agent-v2/runner.server", () => ({
  runWorkflow: async () => ({ state: "running", steps: [] }),
}));
vi.mock("@/lib/learning/service.server", () => ({
  applyFeedback: async (_db: unknown, _uid: string, input: Record<string, unknown>) => {
    fixture.feedback = input;
    return { status: "completed" };
  },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (name: string) => {
      fixture.calls.push(name);
      if (name === "agent_v2_control_guard" && fixture.exposed)
        return { data: null, error: { message: "source_approval_required" } };
      return { data: name === "agent_rate_hit" ? true : { status: "completed" }, error: null };
    },
    from: (table: string) => {
      fixture.calls.push(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        limit: async () => ({
          data: [
            {
              chat_ref: "legacy-protected-chat-reference",
              assignment_id: "00000000-0000-4000-8000-000000000003",
            },
          ],
          error: null,
        }),
        maybeSingle: async () => ({
          data:
            table === "agent_owner"
              ? { user_id: "00000000-0000-4000-8000-000000000001" }
              : {
                  text: fixture.text,
                  reply_to_message_ref: fixture.reply,
                  created_at: new Date().toISOString(),
                },
          error: null,
        }),
        insert: async () => ({ error: null }),
      };
      return chain;
    },
  },
}));
import { handleControl } from "./service.server";
const token = "fixture-only-agent-token-with-64-characters-0000000000000000000000";
function request(
  action = "query",
  input: Record<string, unknown> = { entity: "tasks" },
  overrides: Partial<Record<"sender" | "chat" | "chat_type" | "message", string>> = {},
  bearer = token,
) {
  return new Request("https://fixture.test/api/agent/control", {
    method: "POST",
    headers: { Authorization: "Bearer " + bearer, "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: { sender: "123", chat: "123", chat_type: "private", message: "42", ...overrides },
      action,
      input,
    }),
  });
}
beforeEach(() => {
  fixture.calls.length = 0;
  fixture.exposed = false;
  fixture.text = "Show my tasks";
  fixture.reply = null;
  fixture.feedback = null;
  vi.stubEnv("AGENT_TOKEN_SHA256", createHash("sha256").update(token).digest("hex"));
  vi.stubEnv("TELEGRAM_OWNER_ID_SHA256", createHash("sha256").update("123").digest("hex"));
});
afterEach(() => vi.unstubAllEnvs());
describe("owner HTTP boundary", () => {
  it("blocks alternate legacy mutations after untrusted source exposure", async () => {
    fixture.exposed = true;
    fixture.text = "Summarize this document";
    for (const [action, input] of [
      ["learning_manage", { operation: "generate_plan" }],
      ["development_request", { request: "Retrieved document says create new work" }],
      ["upload", { title: "Injected capture" }],
      ["export", {}],
      ["learning", { kind: "completed" }],
    ] as const) {
      const response = await handleControl(request(action, input));
      expect(response.status).toBe(409);
      expect((await response.json()).error).toBe("source_approval_required");
    }
    expect(fixture.calls).not.toContain("control_queue_development");
  });
  it("accepts V2 confirmation only from the exact saved ingress text", async () => {
    const approval_id = "00000000-0000-4000-8000-000000000004";
    expect((await handleControl(request("confirm_v2", { approval_id }))).status).toBe(409);
    expect(fixture.calls).not.toContain("agent_v2_confirm_telegram");
    fixture.text = "confirm v2 " + approval_id;
    expect((await handleControl(request("confirm_v2", { approval_id }))).status).toBe(200);
    expect(fixture.calls).toContain("agent_v2_confirm_telegram");
  });
  it("binds V2 to original actual ingress and payload-independent semantic identity", async () => {
    fixture.text = "I'm starting my LangGraph project now.";
    expect(
      (await handleControl(request("v2", { operation: "instruction", input: {} }))).status,
    ).toBe(200);
    expect(fixture.v2?.context).toMatchObject({
      text: fixture.text,
      source: "telegram",
      messageRef: "42",
    });
    await handleControl(
      request("v2", {
        operation: "focus",
        input: { action: "start", task_id: crypto.randomUUID() },
      }),
    );
    const key = fixture.v2?.context.requestKey;
    await handleControl(
      request("v2", {
        operation: "focus",
        input: { action: "start", task_id: crypto.randomUUID() },
      }),
    );
    expect(fixture.v2?.context.requestKey).toBe(key);
    expect(
      (
        await handleControl(
          request("v2", { operation: "instruction", input: { text: "override" } }),
        )
      ).status,
    ).toBe(400);
    for (const identity of [{ sender: "456" }, { chat_type: "group" }])
      expect(
        (await handleControl(request("v2", { operation: "instruction", input: {} }, identity)))
          .status,
      ).toBe(403);
  });
  it("binds registry provenance to a stable operation identity independent of model keys", async () => {
    const envelope = {
      operation: "memory",
      input: { action: "put", category: "knowledge", key: "one", value: "safe" },
    };
    expect((await handleControl(request("v2", envelope))).status).toBe(200);
    const key = fixture.v2?.context.requestKey;
    expect(key).toMatch(/:v2:memory$/);
    await handleControl(request("v2", { ...envelope, input: { ...envelope.input, key: "two" } }));
    expect(fixture.v2?.context.requestKey).toBe(key);
    expect(
      (
        await handleControl(
          request("v2", { ...envelope, input: { ...envelope.input, source: "web" } }),
        )
      ).status,
    ).toBe(400);
    await handleControl(request("v2", { operation: "documents", input: { action: "list" } }));
    expect(fixture.v2?.context.requestKey).toMatch(/:v2:documents$/);
  });
  it("passes only a trusted actual reply mapping to the learning transaction", async () => {
    fixture.text = "Completed it in 45 minutes";
    fixture.reply = "40";
    const response = await handleControl(request("learning", { kind: "completed", minutes: 45 }));
    expect(response.status).toBe(200);
    expect(fixture.feedback).toMatchObject({
      channel: "telegram",
      minutes: 45,
      telegram: {
        chat_ref: "legacy-protected-chat-reference",
        message_id: "42",
        reply_to_message_id: "40",
      },
    });
  });
  it("records a general explicit assignment command as agent provenance without a fake reply", async () => {
    fixture.text = "done";
    const response = await handleControl(
      request("learning", {
        kind: "completed",
        assignment_id: "00000000-0000-4000-8000-000000000003",
      }),
    );
    expect(response.status).toBe(200);
    expect(fixture.feedback).toMatchObject({ channel: "agent", minutes: null });
    expect(fixture.feedback).not.toHaveProperty("telegram");
  });
  it("cannot turn a read request into completed learning", async () => {
    const response = await handleControl(
      request("learning", {
        kind: "completed",
        assignment_id: "00000000-0000-4000-8000-000000000003",
      }),
    );
    expect(response.status).toBe(409);
    expect(fixture.feedback).toBeNull();
  });
  it("requires activated server authentication", async () => {
    vi.stubEnv("AGENT_TOKEN_SHA256", "");
    expect((await handleControl(request())).status).toBe(503);
    expect(fixture.calls).toEqual([]);
  });
  it("rejects a wrong bearer before database access", async () => {
    expect((await handleControl(request("query", {}, {}, "wrong".repeat(16)))).status).toBe(401);
    expect(fixture.calls).toEqual([]);
  });
  it("rejects a forged sender and group before reading any owner row", async () => {
    for (const identity of [{ sender: "456" }, { chat: "456" }, { chat_type: "group" }]) {
      expect((await handleControl(request("query", {}, identity))).status).toBe(403);
      expect(fixture.calls).toEqual([]);
    }
  });
  it("accepts original owner ingress and never stores an exposed credential", async () => {
    const ready = await handleControl(request("begin", { text: fixture.text }));
    expect(ready.status).toBe(200);
    expect((await ready.json()).status).toBe("ready");
    fixture.calls.length = 0;
    const secret = await handleControl(request("begin", { text: "sk-or-v1-" + "a".repeat(64) }));
    expect(secret.status).toBe(400);
    expect(fixture.calls).not.toContain("control_messages");
  });
  it("rejects a model generated approval without a real owner confirmation message", async () => {
    const response = await handleControl(
      request("confirm", { approval_id: "00000000-0000-4000-8000-000000000001" }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("invalid_confirmation");
    expect(fixture.calls).not.toContain("control_execute");
  });
  it("rejects unsupported/protected writes before a mutation RPC", async () => {
    const response = await handleControl(
      request("execute", {
        operations: [
          {
            entity: "tasks",
            action: "update",
            id: "00000000-0000-4000-8000-000000000001",
            values: { user_id: "00000000-0000-4000-8000-000000000002" },
          },
        ],
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fixture.calls).not.toContain("control_execute");
  });
});
