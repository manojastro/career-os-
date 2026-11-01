import { rpc, type Db } from "@/lib/control/queries.server";
import type { WorkflowKind, V2Context } from "./contracts";
// Exhaustive real local handlers. New network kinds require their own trusted adapter;
// a model result or lease token alone is never provider verification.
const localKinds: Record<WorkflowKind, true> = {
  "task.create": true,
  "task.update": true,
  "focus.transition": true,
  "memory.put": true,
  "memory.confirm": true,
  "document.register": true,
};
export async function runWorkflow(db: Db, context: V2Context, id: string) {
  for (let round = 0; round < 12; round++) {
    const claims = await Promise.allSettled(
      [0, 1].map(() =>
        rpc<{ step_id: string; kind: WorkflowKind; token: string } | null>(
          db,
          "agent_v2_workflow_claim",
          { p_uid: context.uid, p_id: id },
        ),
      ),
    );
    const active = claims.flatMap((c) => (c.status === "fulfilled" && c.value ? [c.value] : []));
    const finishes = await Promise.allSettled(
      active.map(async (c) => {
        if (!Object.hasOwn(localKinds, c.kind)) throw new Error("unsupported_kind");
        return rpc(db, "agent_v2_workflow_finish", {
          p_uid: context.uid,
          p_id: id,
          p_step: c.step_id,
          p_token: c.token,
        });
      }),
    );
    // A failed call leaves truthful SQL state (claimed/failed); report it instead of guessing.
    if (!active.length || [...claims, ...finishes].some((r) => r.status === "rejected")) break;
  }
  return rpc(db, "agent_v2_workflow", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: { action: "get", id },
    p_instruction: context.text,
    p_chat: context.chatRef ?? null,
    p_message: context.messageRef ?? null,
  });
}
