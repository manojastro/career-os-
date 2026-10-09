// Request helpers shared by learning routes (runtime-agnostic; unit tested).
import { readLimited } from "./stream";

export const MAX_BODY_BYTES = 64_000;

/** Reads JSON with an actual streamed byte limit (Content-Length is not trusted or required). */
export async function readJsonLimited(
  request: Request,
  max = MAX_BODY_BYTES,
): Promise<{ ok: true; body: unknown } | { ok: false; error: string; status: number }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > max) return { ok: false, error: "payload_too_large", status: 413 };
  let bytes: Uint8Array;
  try {
    bytes = await readLimited(request.body, max);
  } catch {
    return { ok: false, error: "payload_too_large", status: 413 };
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, error: "invalid_json", status: 400 };
  }
}

const KEY_RE = /^[A-Za-z0-9:._-]{8,200}$/;

/** Merges the Idempotency-Key header into the body. Both present and different → conflict. */
export function mergeIdempotencyKey(
  request: Request,
  body: unknown,
  accepts = true,
): { ok: true; body: unknown } | { ok: false; error: string } {
  const header = request.headers.get("idempotency-key")?.trim();
  if (!header) return { ok: true, body };
  if (!KEY_RE.test(header)) return { ok: false, error: "invalid_idempotency_key" };
  // Routes whose strict schema has no idempotency_key are naturally idempotent (sync, run-claim, …):
  // a durable adapter header is accepted but never injected into the body.
  if (!accepts) return { ok: true, body };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: true, body };
  const b = body as Record<string, unknown>;
  if (b.idempotency_key !== undefined && b.idempotency_key !== header)
    return { ok: false, error: "idempotency_key_mismatch" };
  return { ok: true, body: { ...b, idempotency_key: header } };
}

/** True when a (strict) zod object schema declares an idempotency_key field. */
export function schemaAcceptsIdempotencyKey(schema: unknown) {
  const shape = (schema as { shape?: Record<string, unknown> } | null)?.shape;
  return !!shape && Object.prototype.hasOwnProperty.call(shape, "idempotency_key");
}

