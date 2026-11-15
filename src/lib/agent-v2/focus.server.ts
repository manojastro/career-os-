import { rpc, type Db } from "@/lib/control/queries.server";
import type { V2Context, FocusInput, FocusResult } from "./contracts";
export function focus(db: Db, context: V2Context, input: FocusInput) {
  return rpc<FocusResult>(db, "agent_v2_focus", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: input,
  });
}
