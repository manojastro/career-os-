import { z } from "zod";
export type V2Context = {
  uid: string;
  source: "web" | "telegram";
  requestKey: string;
  text: string;
  chatRef?: string;
  messageRef?: string;
};
export class V2Error extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const focusInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).strict(),
  z.object({ action: z.literal("start"), task_id: z.uuid() }).strict(),
  ...(["pause", "resume", "cancel"] as const).map((action) =>
    z.object({ action: z.literal(action), session_id: z.uuid() }).strict(),
  ),
  z.object({ action: z.literal("finish"), session_id: z.uuid(), complete: z.boolean() }).strict(),
]);
// Only the value of a memory fact is JSON; the operational envelope remains strict.
const category = z.enum(["preference", "project", "knowledge", "conversation", "execution"]);
const normalizedKey = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((v) => v.replace(/\s+/g, " ").toLowerCase());
const version = z.number().int().min(1).max(999999999);
const secretField =
  /(password|passwd|secret|credential|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|private[_ -]?key|authorization|cookie|(^|[_ -])token($|[_ -]))/i;
const secretValue =
  /(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN .*PRIVATE KEY|bearer\s+[A-Za-z0-9._-]{12,}|(password|secret|token|api[_ -]?key)\s*[:=]\s*\S+)/i;
function safeFact(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (typeof value === "string") return !secretValue.test(value);
  if (Array.isArray(value)) return value.every((v) => safeFact(v, depth + 1));
  if (value !== null && typeof value === "object")
    return Object.entries(value).every(([k, v]) => !secretField.test(k) && safeFact(v, depth + 1));
  return true;
}
const factValue = z.preprocess((value, ctx) => {
  try {
    if (!safeFact(value) || new TextEncoder().encode(JSON.stringify(value)).length > 8000) {
      ctx.addIssue({ code: "custom", message: "invalid_memory_value" });
      return z.NEVER;
    }
  } catch {
    ctx.addIssue({ code: "custom", message: "invalid_memory_value" });
    return z.NEVER;
  }
  return value;
}, z.json());
const factKey = normalizedKey.refine(
  (v) => !secretField.test(v) && !secretValue.test(v),
  "invalid_memory_key",
);
export const memoryInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("list"),
      limit: z.number().int().min(1).max(100).optional(),
      after: normalizedKey.optional(),
      query: z.string().max(100).optional(),
      category: category.optional(),
    })
    .strict(),
  z.object({ action: z.literal("get"), key: normalizedKey }).strict(),
  z
    .object({
      action: z.literal("put"),
      key: factKey,
      category,
      value: factValue,
      expected_version: version.optional(),
      ttl_hours: z.number().int().min(1).max(8760).optional(),
    })
    .strict(),
  z.object({ action: z.literal("forget"), key: normalizedKey, expected_version: version }).strict(),
]);
const googleId = z.string().regex(/^[A-Za-z0-9_-]{10,200}$/);
const documentFields = {
  title: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1).max(100)).max(12).optional(),
  category: z.string().trim().min(1).max(100),
  project_id: z.uuid().nullable().optional(),
  topic_id: z.uuid().nullable().optional(),
  parent_folder_id: googleId.nullable().optional(),
  permitted_operations: z
    .array(z.enum(["read", "append", "update", "create_child"]))
    .min(1)
    .max(4)
    .optional(),
};
export const documentsInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("list"),
      limit: z.number().int().min(1).max(100).optional(),
      after: z.uuid().optional(),
      query: z.string().trim().min(1).max(100).optional(),
    })
    .strict(),
  z.object({ action: z.literal("resolve"), query: z.string().trim().min(1).max(100) }).strict(),
  z
    .object({
      action: z.literal("register"),
      file_id: googleId,
      kind: z.enum(["doc", "sheet", "folder"]),
      ...documentFields,
    })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      id: z.uuid(),
      expected_version: version,
      ...documentFields,
      title: documentFields.title.optional(),
      category: documentFields.category.optional(),
    })
    .strict(),
  z.object({ action: z.literal("forget"), id: z.uuid(), expected_version: version }).strict(),
]);
export type MemoryInput = z.infer<typeof memoryInput>;
export type DocumentsInput = z.infer<typeof documentsInput>;
const stepId = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const boundId = z.union([z.uuid(), z.object({ step: stepId, alias: z.literal("id") }).strict()]);
const taskFields = {
  title: z.string().trim().min(1).max(500),
  description: z.string().max(4000).optional(),
  project_id: boundId.nullable().optional(),
  type: z
    .enum([
      "Learn",
      "Build",
      "Practice",
      "Interview",
      "Network",
      "Apply",
      "Research",
      "Document",
      "Admin",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
};
const commonStep = { id: stepId, depends_on: z.array(stepId).max(12) };
export const workflowStep = z.discriminatedUnion("kind", [
  z
    .object({ ...commonStep, kind: z.literal("task.create"), input: z.object(taskFields).strict() })
    .strict(),
  z
    .object({
      ...commonStep,
      kind: z.literal("task.update"),
      input: z
        .object({
          ...taskFields,
          title: taskFields.title.optional(),
          id: boundId,
          expected_updated_at: z.string().datetime({ offset: true }),
          status: z.enum(["backlog", "month", "week", "today", "doing", "completed"]).optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commonStep,
      kind: z.literal("memory.put"),
      input: memoryInput.options[2].omit({ action: true }),
    })
    .strict(),
  z
    .object({
      ...commonStep,
      kind: z.literal("memory.confirm"),
      input: z
        .object({
          key: z.enum([
            "reminder_default_time",
            "default_project_id",
            "default_document_id",
            "preferred_doc_format",
          ]),
          expected_version: version,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...commonStep,
      kind: z.literal("document.register"),
      input: documentsInput.options[2].omit({ action: true }),
    })
    .strict(),
  z
    .object({
      ...commonStep,
      kind: z.literal("focus.transition"),
      input: z.discriminatedUnion("action", [
        z.object({ action: z.literal("start"), task_id: boundId }).strict(),
        ...(["pause", "resume", "cancel"] as const).map((action) =>
          z.object({ action: z.literal(action), session_id: boundId }).strict(),
        ),
        z
          .object({ action: z.literal("finish"), session_id: boundId, complete: z.boolean() })
          .strict(),
      ]),
    })
    .strict(),
]);
const workflowPlan = z
  .array(workflowStep)
  .min(1)
  .max(12)
  .superRefine((steps, ctx) => {
    const seen = new Set<string>();
    for (const step of steps) {
      if (
        seen.has(step.id) ||
        new Set(step.depends_on).size !== step.depends_on.length ||
        step.depends_on.some((id) => !seen.has(id))
      )
        ctx.addIssue({ code: "custom", message: "invalid_dependency" });
      for (const [key, value] of Object.entries(step.input))
        if (value && typeof value === "object" && "step" in value && key !== "value") {
          if (!step.depends_on.includes(String(value.step)))
            ctx.addIssue({ code: "custom", message: "invalid_binding" });
        }
      seen.add(step.id);
    }
  });
export const workflowInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), steps: workflowPlan }).strict(),
  z
    .object({ action: z.literal("list"), limit: z.number().int().min(1).max(100).optional() })
    .strict(),
  ...(["get", "run", "resume", "cancel"] as const).map((action) =>
    z.object({ action: z.literal(action), id: z.uuid() }).strict(),
  ),
  z
    .object({
      action: z.literal("confirm"),
      id: z.uuid(),
      approval_id: z.uuid(),
      expected_plan_hash: z.string().regex(/^[a-f0-9]{64}$/),
      confirm: z.literal(true),
    })
    .strict(),
]);
export type WorkflowInput = z.infer<typeof workflowInput>;
export type WorkflowKind = z.infer<typeof workflowStep>["kind"];
export const v2Envelope = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("workflow"), input: workflowInput }).strict(),
  z.object({ operation: z.literal("memory"), input: memoryInput }).strict(),
  z.object({ operation: z.literal("documents"), input: documentsInput }).strict(),
  z.object({ operation: z.literal("focus"), input: focusInput }).strict(),
  z.object({ operation: z.literal("instruction"), input: z.object({}).strict() }).strict(),
]);
export type FocusInput = z.infer<typeof focusInput>;
export type ServerFocusSession = {
  id: string;
  task_id: string;
  state: "running" | "paused" | "finished" | "cancelled";
  started_at: string;
  running_since: string | null;
  paused_at: string | null;
  finished_at: string | null;
  elapsed_ms: number;
  complete: boolean | null;
  source: "web" | "telegram";
};
export type FocusResult = { session: ServerFocusSession | null; server_now: string };
