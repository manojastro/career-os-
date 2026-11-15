import { rpc, type Db } from "@/lib/control/queries.server";
import type { V2Context, MemoryInput } from "./contracts";
export function memory(db: Db, context: V2Context, input: MemoryInput) {
  return rpc(db, "agent_v2_memory", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: input,
  });
}
