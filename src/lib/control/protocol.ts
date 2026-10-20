import { createHash, timingSafeEqual } from "node:crypto";
import rawRegistry from "./registry.json";
export type Field = {
  type: string;
  nullable: boolean;
  required: boolean;
  editable: boolean;
  enum?: string[];
  references?: string;
  confirm?: boolean;
};
export type Entity = {
  operations?: string[];
  owner: string;
  softDelete: boolean;
  writable: boolean;
  special: boolean;
  fields: Record<string, Field>;
};
export const registry = rawRegistry as Record<string, Entity>;
export type Identity = { sender: string; chat: string; chat_type: string; message: string };
export type Operation = {
  entity: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "record_time"
    | "edit_text"
    | "set_completed"
    | "set_recurrence";
  id?: string;
  values?: Record<string, unknown>;
  ref?: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function verifyTelegramIdentity(p: Identity, expected: string): boolean {
  if (
    !/^[0-9a-f]{64}$/i.test(expected) ||
    !/^[1-9][0-9]{0,19}$/.test(p.sender) ||
    p.chat !== p.sender ||
    p.chat_type !== "private" ||
    !/^[1-9][0-9]{0,19}$/.test(p.message)
  )
    return false;
  return timingSafeEqual(
    createHash("sha256").update(p.sender).digest(),
    Buffer.from(expected, "hex"),
  );
}
export function validateOperations(input: unknown): Operation[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50)
    throw new Error("invalid_operations");
  const refs = new Map<string, string>();
  return input.map((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      Object.keys(v).some((k) => !["entity", "action", "id", "values", "ref"].includes(k))
    )
      throw new Error("invalid_operation");
    const op = v as Operation,
      e = Object.hasOwn(registry, op.entity) ? registry[op.entity] : undefined;
    if (
      !e?.writable ||
      ![
        "create",
        "update",
        "delete",
        "record_time",
        "edit_text",
        "set_completed",
        "set_recurrence",
      ].includes(op.action)
    )
      throw new Error("unsupported_operation");
    if (e.operations && !e.operations.includes(op.action)) throw new Error("unsupported_operation");
    if (
      op.action !== "create" &&
      (!op.id ||
        (!uuid.test(op.id) && !(op.id.startsWith("$") && refs.get(op.id.slice(1)) === op.entity)))
    )
      throw new Error("record_id_required");
    if (op.action === "create" && op.id) throw new Error("server_generated_id");
    if (op.ref) {
      if (op.action !== "create") throw new Error("invalid_reference");
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(op.ref) || refs.has(op.ref))
        throw new Error("invalid_reference");
    }
    const values = op.values ?? {};
    if (op.action === "set_recurrence") {
      if (
        op.entity !== "tasks" ||
        !Object.hasOwn(values, "cadence") ||
        (values.cadence !== null &&
          !["daily", "weekly", "monthly"].includes(String(values.cadence))) ||
        Object.keys(values).some((k) => k !== "cadence")
      )
        throw new Error("invalid_recurrence");
      return op;
    }
    if (op.action === "set_completed") {
      if (
        !["task_subtasks", "project_milestones", "followups"].includes(op.entity) ||
        typeof values.completed !== "boolean" ||
        Object.keys(values).some((k) => k !== "completed")
      )
        throw new Error("invalid_completion");
      return op;
    }
    if (op.action === "edit_text") {
      const field = String(values.field ?? ""),
        f = e.fields[field];
      if (
        !f?.editable ||
        f.type !== "text" ||
        f.enum ||
        /url|time|timezone|website|email/.test(field) ||
        !["append", "replace_fragment"].includes(String(values.mode)) ||
        typeof values.text !== "string" ||
        values.text.length > 20000 ||
        Object.keys(values).some((k) => !["field", "mode", "text", "find"].includes(k)) ||
        (values.mode === "replace_fragment" &&
          (typeof values.find !== "string" || !values.find || values.find.length > 20000))
      )
        throw new Error("invalid_text_edit");
      return op;
    }
    if (op.action === "record_time") {
      if (
        op.entity !== "tasks" ||
        Object.keys(values).some((k) => !["minutes", "complete", "ended_at"].includes(k)) ||
        !Number.isInteger(values.minutes) ||
        Number(values.minutes) < 1 ||
        Number(values.minutes) > 600 ||
        (values.complete !== undefined && typeof values.complete !== "boolean") ||
        (values.ended_at !== undefined &&
          (!/(Z|[+-]\d{2}:\d{2})$/.test(String(values.ended_at)) ||
            !Number.isFinite(Date.parse(String(values.ended_at))) ||
            Date.parse(String(values.ended_at)) > Date.now() + 60000))
      )
        throw new Error("invalid_time_record");
      return op;
    }
    if (typeof values !== "object" || Array.isArray(values) || Object.keys(values).length > 60)
      throw new Error("invalid_fields");
    if (op.action === "delete" && Object.keys(values).length) throw new Error("delete_has_fields");
    for (const [k, x] of Object.entries(values)) {
      const f = e.fields[k];
      if (!f?.editable) throw new Error("protected_or_unknown_field:" + k);
      if (x === null) {
        if (!f.nullable) throw new Error("null_not_allowed:" + k);
        continue;
      }
      if (f.references && typeof x === "string" && x.startsWith("$")) {
        if (refs.get(x.slice(1)) !== f.references) throw new Error("unknown_reference");
        continue;
      }
      if (f.enum && !f.enum.includes(String(x))) throw new Error("invalid_enum:" + k);
      if (f.type === "uuid" && (typeof x !== "string" || !uuid.test(x)))
        throw new Error("invalid_uuid:" + k);
      if (f.type === "bool" && typeof x !== "boolean") throw new Error("invalid_boolean:" + k);
      if (
        ["int2", "int4", "int8", "float4", "float8", "numeric"].includes(f.type) &&
        (typeof x !== "number" ||
          !Number.isFinite(x) ||
          Math.abs(x) > 1000000 ||
          (/int/.test(f.type) && !Number.isInteger(x)) ||
          (/minutes|hours|confidence|knowledge|hands_on|proof|production|interview|sort_order/.test(
            k,
          ) &&
            x < 0))
      )
        throw new Error("invalid_number:" + k);
      if (
        f.type === "date" &&
        (typeof x !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(x) ||
          new Date(x + "T00:00:00Z").toISOString().slice(0, 10) !== x)
      )
        throw new Error("invalid_date:" + k);
      if (
        f.type === "time" &&
        (typeof x !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(x))
      )
        throw new Error("invalid_time:" + k);
      if (
        f.type === "timestamptz" &&
        (typeof x !== "string" ||
          !/(Z|[+-]\d{2}:\d{2})$/.test(x) ||
          !Number.isFinite(Date.parse(x)))
      )
        throw new Error("invalid_timestamp:" + k);
      if (
        f.type === "_text" &&
        (!Array.isArray(x) ||
          x.length > 100 ||
          x.some((i) => typeof i !== "string" || i.length > 500))
      )
        throw new Error("invalid_array:" + k);
      if (f.type === "text" && (typeof x !== "string" || x.length > 20000))
        throw new Error("invalid_text:" + k);
      if (k === "timezone" && typeof x === "string") {
        try {
          new Intl.DateTimeFormat("en", { timeZone: x });
        } catch {
          throw new Error("invalid_timezone");
        }
      }
      if (
        ["sync_time", "morning_time", "evening_time", "briefing_time"].includes(k) &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x))
      )
        throw new Error("invalid_time:" + k);
      if (/(^url$|_url$|website|guide_url)/.test(k) && x) {
        if (
          k === "url" &&
          ["resources", "evidence"].includes(op.entity) &&
          typeof x === "string" &&
          x.startsWith("storage:")
        ) {
          if (!/^storage:[0-9a-f-]{36}\/[A-Za-z0-9_./ -]+$/.test(x) || x.includes(".."))
            throw new Error("invalid_storage_reference");
          continue;
        }
        const u = new URL(String(x));
        if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
          throw new Error("invalid_url:" + k);
      }
    }
    if (op.action === "create")
      for (const [k, f] of Object.entries(e.fields))
        if (f.required && f.editable && values[k] === undefined) throw new Error("required:" + k);
    if (op.entity === "agent_commands" && op.action === "create" && values.status !== undefined)
      throw new Error("server_generated_status");
    if (op.ref) refs.set(op.ref, op.entity);
    return op;
  });
}
