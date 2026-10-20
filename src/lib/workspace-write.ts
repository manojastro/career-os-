import type { SupabaseClient } from "@supabase/supabase-js";
import registry from "./control/registry.json";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
/** Only pending request identities live in sessionStorage, never tokens or career-record contents. */
export async function workspaceWrite(
  client: SupabaseClient,
  uid: string,
  entity: string,
  action: "create" | "update" | "delete" | "restore" | "set_completed" | "set_recurrence",
  id: string | null,
  values: Record<string, unknown>,
  expected?: string,
) {
  const definition = Object.hasOwn(registry, entity)
    ? (registry as Record<string, { fields: Record<string, { editable: boolean }> }>)[entity]
    : undefined;
  if (!definition) throw new Error("Unsupported record type.");
  const permitted = Object.fromEntries(
    Object.entries(values).filter(([k]) => definition.fields[k]?.editable),
  );
  if (action === "set_completed") permitted.completed = values.completed;
  if (action === "set_recurrence") permitted.cadence = values.cadence;
  if (entity === "tasks" && permitted.scheduled_date === null) {
    permitted.scheduled_start = null;
    permitted.scheduled_end = null;
  }
  const signature = JSON.stringify(
    canonical({ uid, entity, action, id, values: permitted, expected: expected ?? null }),
  );
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature))),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const storageKey = "career-os-pending-write:" + hash;
  let request = sessionStorage.getItem(storageKey);
  if (!request) {
    request = crypto.randomUUID();
    sessionStorage.setItem(storageKey, request);
  }
  const { data, error } = await client.rpc("workspace_write", {
    p_entity: entity,
    p_action: action,
    p_id: id,
    p_values: permitted,
    p_request: request,
    p_expected: expected ?? null,
  });
  if (error) {
    const codes: Record<string, string> = {
      dependencies_incomplete: "Complete prerequisite tasks first.",
      evidence_required: "Attach linked evidence before completion.",
      use_learning_completion: "Use the learning assignment feedback control for this task.",
      use_canonical_task: "Edit the linked canonical task instead.",
      linked_record_not_found: "A linked record is missing or no longer active.",
      record_not_found: "This record no longer exists. Refresh the workspace.",
    };
    for (const [code, message] of Object.entries(codes))
      if (error.message?.includes(code)) throw new Error(message);
    if (error.message?.includes("revision_conflict"))
      throw new Error("This note changed elsewhere. Your local draft has been kept.");
    if (error.message?.includes("skill_name_exists")) throw new Error("That skill already exists.");
    throw new Error(
      "Could not save this record. Retry the same action; its identity is preserved.",
    );
  }
  if (data?.status !== "completed" || !data?.changes?.[0]?.record)
    throw new Error("Save could not be verified. Re-read before retrying.");
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // The transaction is confirmed. A retained request ID safely replays its receipt.
  }
  return data.changes[0].record as Record<string, unknown>;
}
