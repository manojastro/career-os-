import { rpc, type Db } from "@/lib/control/queries.server";
import type { V2Context, DocumentsInput } from "./contracts";
export function documents(db: Db, context: V2Context, input: DocumentsInput) {
  return rpc(db, "agent_v2_documents", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: input,
  });
}
