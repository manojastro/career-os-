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
export const v2Envelope = z.discriminatedUnion("operation", [
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
