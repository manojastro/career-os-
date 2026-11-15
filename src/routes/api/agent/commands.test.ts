import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  updates: [] as { table: string; values: Record<string, unknown>; filter: unknown[] }[],
  pollError: null as null | { message: string },
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async () =>
      fixture.pollError
        ? { data: null, error: fixture.pollError }
        : { data: { commands: [], feedback: [] }, error: null },
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: async (...filter: unknown[]) => {
          fixture.updates.push({ table, values, filter });
          return { error: null };
        },
      }),
    }),
  },
}));
import { handlePoll } from "./commands";
const token = "fixture-only-agent-token-with-64-characters-0000000000000000000000";
const poll = (bearer = token) =>
  handlePoll(
    new Request("https://fixture.test/api/agent/commands", {
      headers: { Authorization: "Bearer " + bearer },
    }),
  );
beforeEach(() => {
  fixture.updates.length = 0;
  fixture.pollError = null;
  vi.stubEnv("AGENT_TOKEN_SHA256", createHash("sha256").update(token).digest("hex"));
});
afterEach(() => vi.unstubAllEnvs());
it("records a worker check-in only after an authenticated, successful poll", async () => {
  expect(
    (await poll("wrong-token-wrong-token-wrong-token-wrong-token-wrong-token-00")).status,
  ).toBe(401);
  fixture.pollError = { message: "boom" };
  expect((await poll()).status).not.toBe(200);
  expect(fixture.updates).toEqual([]);
  fixture.pollError = null;
  expect((await poll()).status).toBe(200);
  expect(fixture.updates).toHaveLength(1);
  expect(fixture.updates[0]).toMatchObject({ table: "agent_owner", filter: ["singleton", true] });
  expect(Date.parse(String(fixture.updates[0].values.worker_seen_at))).not.toBeNaN();
});
