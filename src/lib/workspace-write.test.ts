import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceWrite } from "./workspace-write";
afterEach(() => vi.unstubAllGlobals());
describe("durable browser write identity", () => {
  it("does not misreport a committed transaction when pending-ID cleanup is unavailable", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => "00000000-0000-4000-8000-000000000001",
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    });
    const client = {
      rpc: async () => ({
        data: { status: "completed", changes: [{ record: { id: "persisted" } }] },
        error: null,
      }),
    } as unknown as SupabaseClient;
    await expect(
      workspaceWrite(client, "owner", "tasks", "update", "persisted", { title: "Saved" }),
    ).resolves.toEqual({ id: "persisted" });
  });
  it("reuses the same request after a lost response and removes only its completed identity", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
    const rpc = vi
      .fn()
      .mockRejectedValueOnce(new Error("network interrupted"))
      .mockResolvedValueOnce({
        data: { status: "completed", changes: [{ record: { id: "real-id", title: "Persisted" } }] },
        error: null,
      });
    const client = { rpc } as unknown as SupabaseClient;
    await expect(
      workspaceWrite(client, "owner", "tasks", "create", null, {
        title: "Persisted",
        user_id: "forged",
        actual_minutes: 90,
      }),
    ).rejects.toThrow("network");
    expect(storage.size).toBe(1);
    await workspaceWrite(client, "owner", "tasks", "create", null, {
      actual_minutes: 90,
      user_id: "forged",
      title: "Persisted",
    });
    expect(rpc.mock.calls[0][1].p_request).toBe(rpc.mock.calls[1][1].p_request);
    expect(rpc.mock.calls[1][1].p_values).toEqual({ title: "Persisted" });
    expect(storage.size).toBe(0);
  });
});
