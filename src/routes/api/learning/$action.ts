import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { userClient } from "@/lib/ai-gateway.server";
import { readJsonLimited } from "@/lib/learning/http";

// Signed-in owner actions from Settings / Dashboard / focus timer. Runs under the caller's RLS client.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const day = z.iso.date();
const schemas = {
  "test-document": z.object({ url: z.string().url().max(500) }).strict(),
  sync: z.object({}).strict(),
  plan: z.object({}).strict(),
  feedback: z
    .object({
      idempotency_key: z
        .string()
        .min(8)
        .max(200)
        .regex(/^[A-Za-z0-9:._-]+$/),
      assignment_id: z.uuid(),
      kind: z.enum(["completed", "partial", "not_started", "reschedule"]),
      minutes: z.number().int().min(1).max(600).optional(),
      minutes_mode: z.enum(["total", "additional"]).optional(),
      notes: z.string().max(4000).optional(),
      new_date: day.optional(),
    })
    .strict(),
  focus: z
    .object({
      session_id: z.uuid(),
      task_id: z.uuid(),
      started_at: z.iso.datetime({ offset: true }),
      ended_at: z.iso.datetime({ offset: true }),
      minutes: z.number().int().min(1).max(600),
      complete: z.boolean(),
    })
    .strict(),
} as const;

/**
 * DOCX fallback: signed-in owner uploads a copy of the configured guide. The extracted text goes
 * through the identical parse + import transaction as a fetch (same source row, same rules).
 * `?dry_run=1` only reports what would be imported.
 */
async function uploadDocx(request: Request) {
  const auth = await userClient(request);
  if (!auth) return json({ error: "unauthorized" }, 401);
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && type !== "application/octet-stream")
    return json({ error: "unsupported_type" }, 415);
  const { readLimited, StreamTooLarge } = await import("@/lib/learning/stream");
  const { docxToText, DocxError, MAX_DOCX_BYTES } = await import("@/lib/learning/docx");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_DOCX_BYTES)
    return json({ error: "file_too_large" }, 413);
  let text: string;
  try {
    text = docxToText(await readLimited(request.body, MAX_DOCX_BYTES));
  } catch (e) {
    if (e instanceof StreamTooLarge) return json({ error: "file_too_large" }, 413);
    if (e instanceof DocxError) return json({ error: e.code }, 422);
    return json({ error: "corrupt_docx" }, 422);
  }
  const svc = await import("@/lib/learning/service.server");
  try {
    if (new URL(request.url).searchParams.get("dry_run") === "1") {
      const { parseGuide } = await import("@/lib/learning/parse");
      const r = parseGuide(text);
      return json({ topic_count: r.topics.length, complete: r.complete, missing_volumes: r.missing_volumes, missing_topics: r.missing_topics, errors: r.errors });
    }
    return json(await svc.syncCurriculum(auth.client, auth.user.id, { text, origin: "docx_upload" }));
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any;
    if (typeof err?.code === "string" && typeof err?.status === "number")
      return json({ error: err.code }, err.status);
    console.error("[learning] docx import failed");
    return json({ error: "learning_request_failed" }, 500);
  }
}

export const Route = createFileRoute("/api/learning/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (params.action === "upload-docx") return uploadDocx(request);
        const schema = schemas[params.action as keyof typeof schemas];
        if (!schema) return json({ error: "not_found" }, 404);
        const auth = await userClient(request);
        if (!auth) return json({ error: "unauthorized" }, 401);
        const read = await readJsonLimited(request);
        if (!read.ok) return json({ error: read.error }, read.status);
        const parsed = schema.safeParse(read.body);
        if (!parsed.success) return json({ error: "invalid_request" }, 400);
        const svc = await import("@/lib/learning/service.server");
        const origin = new URL(request.url).origin;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = parsed.data as any;
        try {
          switch (params.action) {
            case "test-document":
              return json(await svc.testDocumentAccess(data.url));
            case "sync":
              return json(await svc.syncCurriculum(auth.client, auth.user.id));
            case "plan":
              return json(await svc.generateToday(auth.client, auth.user.id, origin));
            case "feedback":
              return json(
                await svc.applyFeedback(auth.client, auth.user.id, { ...data, channel: "app" }),
              );
            case "focus":
              return json(await svc.recordFocus(auth.client, auth.user.id, data));
          }
          return json({ error: "not_found" }, 404);
        } catch (e) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const err = e as any;
          if (typeof err?.code === "string" && typeof err?.status === "number")
            return json(
              { error: err.code, detail: Array.isArray(err.detail) ? err.detail : null },
              err.status,
            );
          console.error("[learning] request failed");
          return json({ error: "learning_request_failed" }, 500);
        }
      },
    },
  },
});

