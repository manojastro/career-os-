import type { Db } from "@/lib/control/queries.server";
import { V2Error, v2Envelope, type V2Context } from "./contracts";
import { focus } from "./focus.server";
import { instruction } from "./instruction.server";
import { memory } from "./memory.server";
import { documents } from "./documents.server";
const safe = new Set([
  "version_conflict",
  "record_forgotten",
  "alias_conflict",
  "linked_record_not_found",
  "learning_access_denied",
  "invalid_request",
  "idempotency_conflict",
  "stale_session",
  "task_not_found",
  "active_focus_conflict",
  "legacy_focus_overlap",
  "evidence_required",
  "dependencies_incomplete",
  "focus_identity_conflict",
]);
export async function dispatchV2(db: Db, context: V2Context, input: unknown): Promise<unknown> {
  const parsed = v2Envelope.safeParse(input);
  if (!parsed.success) throw new V2Error("invalid_request");
  try {
    if (parsed.data.operation === "memory") return await memory(db, context, parsed.data.input);
    if (parsed.data.operation === "documents")
      return await documents(db, context, parsed.data.input);
    return parsed.data.operation === "focus"
      ? await focus(db, context, parsed.data.input)
      : await instruction(db, context);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    throw new V2Error(safe.has(code) ? code : "v2_request_failed", safe.has(code) ? 409 : 500);
  }
}
