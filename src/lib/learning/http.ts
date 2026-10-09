import { z } from "zod";

export const key = z.string().min(8).max(160).regex(/^[A-Za-z0-9:._-]+$/);
export const day = z.iso.date();
export const planStep = z.object({ step: z.string().trim().min(1).max(300), minutes: z.number().int().min(1).max(600) }).strict();
const feedback = z.object({
  idempotency_key: key, assignment_id: z.uuid().optional(), date: day.optional(),
  text: z.string().max(4000).optional(), kind: z.enum(["completed", "partial", "not_started", "reschedule", "help", "minutes"]).optional(),
  minutes: z.number().int().min(1).max(600).optional(), minutes_mode: z.enum(["total", "additional"]).default("total"),
  notes: z.string().max(4000).optional(), new_date: day.optional(),
});
export const agentSchemas = {
  recommendation: z.object({ idempotency_key: key, assignment_date: day, topic_id: z.uuid(), rationale: z.string().max(2000).default(""), practical_outcome: z.string().max(2000).default(""), completion_criteria: z.string().max(2000).default(""), plan: z.array(planStep).min(1).max(8) }).strict(),
  completion: feedback.extend({ telegram: z.object({ sender_id: z.string().regex(/^\d+$/).max(40), chat_ref: z.string().min(1).max(80), message_id: z.string().min(1).max(40), reply_to_message_id: z.string().min(1).max(40) }).strict().optional() }).strict().refine((v) => v.text || v.kind, "text_or_kind_required"),
  "check-in": z.object({ run_date: day.optional() }).strict(), sync: z.object({}).strict(),
  "run-claim": z.object({ job: z.enum(["curriculum_sync", "morning_plan", "evening_check"]), run_date: day, attempt_token: key, catch_up: z.boolean().default(false) }).strict(),
  "run-finish": z.object({ job: z.enum(["curriculum_sync", "morning_plan", "evening_check"]), run_date: day, attempt_token: key, status: z.enum(["succeeded", "failed", "skipped"]), detail: z.record(z.string(), z.unknown()).default({}) }).strict(),
  "begin-delivery": z.object({ delivery_key: key, assignment_id: z.uuid().nullable().default(null), kind: z.enum(["morning_plan", "evening_check", "test", "help"]), chat_ref: z.string().min(1).max(80) }).strict(),
  "delivery-status": z.object({ delivery_key: key, status: z.enum(["sent", "failed", "unknown"]), message_id: z.string().max(40).default(""), error: z.string().max(300).default("") }).strict(),
  "ack-command": z.object({ command_id: z.uuid(), status: z.enum(["succeeded", "failed"]), result: z.record(z.string(), z.unknown()).default({}) }).strict(),
};
export const userSchemas = {
  "save-preferences": z.object({ guide_url: z.url().max(500), sync_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), morning_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), evening_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }), daily_minutes: z.number().int().min(15).max(600), weekly_minutes: z.number().int().min(15).max(4200), paused: z.boolean() }).strict().refine(v => v.sync_time < v.morning_time && v.morning_time < v.evening_time, "schedule_order_required"),
  "test-document": z.object({ url: z.url().max(500) }).strict(), sync: z.object({}).strict(),
  preferences: z.object({}).strict(), plan: z.object({}).strict(), baseline: z.object({}).strict(),
  feedback: feedback.extend({ assignment_id: z.uuid(), kind: z.enum(["completed", "partial", "not_started", "reschedule"]) }).strict(),
  "request-test": z.object({ command: z.enum(["ping_learning_manager", "send_test_telegram"]) }).strict(),
};

export function learningJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export async function readLearningBody(request: Request, maxBytes = 64_000): Promise<unknown> {
  const reader = request.body?.getReader();
  let size = 0; const chunks: Uint8Array[] = [];
  if (!reader) return {};
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("payload_too_large"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
