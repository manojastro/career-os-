import { it, expect } from "vitest";
import type { Db } from "@/lib/control/queries.server";
import { runWorkflow } from "../runner.server";
const context = { uid: "u", source: "web" as const, requestKey: "web:runner", text: "t" };
const fake = (fail: "claim" | "finish") => {
  const calls: string[] = [];
  let claims = 0;
  const db = {
    rpc: async (name: string, params: Record<string, unknown>) => {
      calls.push(name);
      if (name === "agent_v2_workflow_claim") {
        claims++;
        if (fail === "claim" && claims === 1)
          return { data: null, error: { message: "fetch failed" } };
        return {
          data: claims <= 2 ? { step_id: "s" + claims, kind: "task.create", token: "t" } : null,
          error: null,
        };
      }
      if (name === "agent_v2_workflow_finish")
        return fail === "finish" && params.p_step === "s1"
          ? { data: null, error: { message: "fetch failed" } }
          : { data: {}, error: null };
      return { data: { state: "running", steps: [] }, error: null };
    },
  } as unknown as Db;
  return { db, calls };
};
it("returns the durable view instead of discarding partial truth when a parallel call fails", async () => {
  for (const fail of ["claim", "finish"] as const) {
    const { db, calls } = fake(fail);
    await expect(runWorkflow(db, context, "id")).resolves.toEqual({ state: "running", steps: [] });
    expect(calls.filter((n) => n === "agent_v2_workflow_claim")).toHaveLength(2);
    expect(calls.filter((n) => n === "agent_v2_workflow_finish")).toHaveLength(
      fail === "claim" ? 1 : 2,
    );
    expect(calls.at(-1)).toBe("agent_v2_workflow");
  }
});
