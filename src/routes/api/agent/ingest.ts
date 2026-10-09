import { createFileRoute } from "@tanstack/react-router";
import { agentJson, dbError, verifyAgentToken } from "@/lib/agent-auth.server";
import { ingestSchema } from "@/lib/agent-schema";

export const Route = createFileRoute("/api/agent/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const raw = await request.text();
        if (raw.length > 1_000_000) return agentJson({ error: "payload_too_large" }, 413);
        let body: unknown;
        try { body = JSON.parse(raw); } catch { return agentJson({ error: "invalid_json" }, 400); }
        const parsed = ingestSchema.safeParse(body);
        if (!parsed.success) return agentJson({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 20) }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("agent_ingest" as never, { p: parsed.data } as never);
        if (error) return dbError(error);
        return agentJson({ ok: true, ...(data as object) });
      },
    },
  },
});

