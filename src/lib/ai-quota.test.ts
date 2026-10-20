import { describe, it, expect, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
import { checkAiQuota } from "./ai-quota.server";
describe("persisted AI request budgets", () => {
  it("checks a server-selected hourly and daily budget for the authenticated user", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await checkAiQuota("owner", "command")).toBeNull();
    expect(rpc).toHaveBeenCalledWith(
      "agent_rate_hit",
      expect.objectContaining({ p_bucket: "ai:command:owner:hour", p_limit: 20 }),
    );
  });
  it("denies over-quota and unavailable quota checks before inference", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await checkAiQuota("owner", "analyze-jd"))?.status).toBe(429);
    rpc.mockResolvedValue({ data: null, error: { message: "private details" } });
    const response = await checkAiQuota("owner", "command");
    expect(response?.status).toBe(503);
    expect(await response?.text()).not.toContain("private details");
  });
});
