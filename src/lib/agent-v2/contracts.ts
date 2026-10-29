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
  /(password|passwd|secret|credential|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|private[_ -]?key|authorization|cookie)/i;
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
const factValue = z.json().superRefine((value, ctx) => {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 8000 || !safeFact(value))
    ctx.addIssue({ code: "custom", message: "invalid_memory_value" });
});
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
      key: normalizedKey,
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
export const v2Envelope = z.discriminatedUnion("operation", [
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
