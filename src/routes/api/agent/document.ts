import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { agentJson, dbError, verifyAgentToken } from "@/lib/agent-auth.server";

const resultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["processed", "action_needed", "failed"]),
  summary: z.string().max(20000).default(""),
  uncertain_claims: z.array(z.object({
    claim: z.string().trim().min(1).max(2000),
    confidence: z.number().int().min(0).max(100),
    source_url: z.string().url().max(2000).optional(),
  }).strict()).max(50).default([]),
  proposed_actions: z.array(z.object({
    title: z.string().trim().min(1).max(300),
    body: z.string().max(4000).optional(),
    priority: z.number().int().min(0).max(100).optional(),
  }).strict()).max(20).default([]),
}).strict();

const BUCKET = "career-evidence";
const MAX_BYTES = 25 * 1024 * 1024;
const TTL_SECONDS = 300;
const MAX_TEXT = 200_000;
const ALLOWED: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/agent/document")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!UUID.test(id)) return agentJson({ error: "invalid_id" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: owner, error: ownerErr } = await supabaseAdmin.from("agent_owner").select("user_id").eq("singleton", true).maybeSingle();
        if (ownerErr) return agentJson({ error: "document_unavailable" }, 500);
        if (!owner?.user_id) return agentJson({ error: "agent_owner_not_bound" }, 409);
        const uid = owner.user_id;

        const { data: doc, error } = await supabaseAdmin.from("source_documents")
          .select("id,title,kind,url,storage_path,summary,status,updated_at")
          .eq("id", id).eq("user_id", uid).is("deleted_at", null).maybeSingle();
        if (error) return agentJson({ error: "document_unavailable" }, 500);
        // Same response for missing and other-user documents: no existence leak.
        if (!doc) return agentJson({ error: "not_found" }, 404);
        const meta = { id: doc.id, title: doc.title, kind: doc.kind, status: doc.status, source_url: doc.url || null, updated_at: doc.updated_at };

        const path = doc.storage_path ?? "";
        if (!path) {
          const text = (doc.summary ?? "").slice(0, MAX_TEXT);
          if (!text) return agentJson({ error: "no_content", ...meta }, 404);
          return agentJson({ type: "text", ...meta, content_type: "text/plain", text, truncated: (doc.summary ?? "").length > MAX_TEXT });
        }
        if (!path.startsWith(`${uid}/`) || path.includes("..")) return agentJson({ error: "not_found" }, 404);
        const ext = (path.split(".").pop() ?? "").toLowerCase();
        const expectedType = ALLOWED[ext];
        if (!expectedType) return agentJson({ error: "unsupported_type", extension: ext }, 415);

        const dir = path.slice(0, path.lastIndexOf("/"));
        const name = path.slice(path.lastIndexOf("/") + 1);
        const { data: listing, error: listErr } = await supabaseAdmin.storage.from(BUCKET).list(dir, { search: name, limit: 10 });
        if (listErr) return agentJson({ error: "document_unavailable" }, 500);
        const obj = listing?.find((o) => o.name === name);
        if (!obj) return agentJson({ error: "file_missing" }, 404);
        const size = Number((obj.metadata as Record<string, unknown> | null)?.["size"] ?? 0);
        const mimetype = String((obj.metadata as Record<string, unknown> | null)?.["mimetype"] ?? "");
        if (size > MAX_BYTES) return agentJson({ error: "file_too_large", size_bytes: size, max_bytes: MAX_BYTES }, 413);
        if (mimetype && mimetype !== expectedType && !(ext === "md" && mimetype.startsWith("text/"))) {
          return agentJson({ error: "unsupported_type", extension: ext, content_type: mimetype }, 415);
        }

        const { data: signed, error: signErr } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
        if (signErr || !signed?.signedUrl) return agentJson({ error: "document_unavailable" }, 500);
        return agentJson({
          type: "file", ...meta, file_name: name, content_type: mimetype || expectedType, size_bytes: size,
          download_url: signed.signedUrl, expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
        });
      },
      // Report the intake result for an existing owner document (idempotent).
      POST: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const text = await request.text();
        if (text.length > 200_000) return agentJson({ error: "payload_too_large" }, 413);
        let body: unknown;
        try { body = JSON.parse(text); } catch { return agentJson({ error: "invalid_json" }, 400); }
        const parsed = resultSchema.safeParse(body);
        if (!parsed.success) return agentJson({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 20) }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("agent_document_result" as never, { p: parsed.data } as never);
        if (error) return dbError(error);
        return agentJson(data);
      },
    },
  },
});

