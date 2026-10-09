import { timingSafeEqual, createHash } from "crypto";

export function agentJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Verifies the worker bearer token by comparing its SHA-256 digest with the
 * server-only AGENT_TOKEN_SHA256 secret in constant time. The raw token is
 * never logged, stored, or returned. Returns an error Response or null when OK.
 */
export function verifyAgentToken(request: Request): Response | null {
  const expectedHex = (process.env["AGENT_TOKEN_SHA256"] ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedHex)) {
    return agentJson({ error: "agent_endpoint_not_activated" }, 503);
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 32 || token.length > 512) return agentJson({ error: "unauthorized" }, 401);
  const actual = createHash("sha256").update(token, "utf8").digest();
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return agentJson({ error: "unauthorized" }, 401);
  }
  return null;
}

export function dbError(error: { message?: string } | null): Response {
  const message = error?.message ?? "database_error";
  if (message.includes("document_not_found")) return agentJson({ error: "not_found" }, 404);
  for (const known of ["agent_owner_not_bound", "idempotency_key_conflict", "command_not_claimed", "invalid_status"]) {
    if (message.includes(known)) return agentJson({ error: known }, known === "agent_owner_not_bound" ? 409 : 409);
  }
  console.error("[agent] database write failed");
  return agentJson({ error: "write_rejected", detail: message.slice(0, 300) }, 422);
}

