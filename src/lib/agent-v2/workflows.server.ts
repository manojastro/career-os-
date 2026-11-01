import { rpc, type Db } from "@/lib/control/queries.server";
import type { V2Context, WorkflowInput } from "./contracts";
import { runWorkflow } from "./runner.server";
export async function workflow(db: Db, context: V2Context, input: WorkflowInput) {
  const result = await rpc(db, "agent_v2_workflow", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: input,
    p_instruction: context.text,
    p_chat: context.source === "telegram" ? (context.chatRef ?? null) : null,
    p_message: context.source === "telegram" ? (context.messageRef ?? null) : null,
  });
  return input.action === "run" || input.action === "resume"
    ? runWorkflow(db, context, input.id)
    : result;
}
