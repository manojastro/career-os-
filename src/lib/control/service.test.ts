import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";
const fixture = vi.hoisted(() => ({
  calls: [] as string[],
  text: "Show my tasks",
  reply: null as string | null,
  feedback: null as Record<string, unknown> | null,
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
  fixture.text = "Show my tasks";
  fixture.reply = null;
  fixture.feedback = null;
  vi.stubEnv("AGENT_TOKEN_SHA256", createHash("sha256").update(token).digest("hex"));
  vi.stubEnv("TELEGRAM_OWNER_ID_SHA256", createHash("sha256").update("123").digest("hex"));
});
afterEach(() => vi.unstubAllEnvs());
describe("owner HTTP boundary", () => {
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
