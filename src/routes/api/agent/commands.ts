import { createFileRoute } from "@tanstack/react-router";
import { agentJson, dbError, verifyAgentToken } from "@/lib/agent-auth.server";
import { completeSchema } from "@/lib/agent-schema";

export const Route = createFileRoute("/api/agent/commands")({
  server: {
    handlers: {
      // Poll: claims queued commands and returns feedback/preferences/changes since the cursor.
      GET: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const params = new URL(request.url).searchParams;
        const cursor = params.get("cursor");
        if (cursor && Number.isNaN(Date.parse(cursor))) return agentJson({ error: "invalid_cursor" }, 400);
        const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("agent_poll" as never, { p_cursor: cursor ? new Date(cursor).toISOString() : null, p_limit: limit } as never);
        if (error) return dbError(error);
        return agentJson(data);
      },
      // Report a claimed command's outcome.
      POST: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const parsed = completeSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return agentJson({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 20) }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("agent_complete_command" as never, { p_id: parsed.data.id, p_status: parsed.data.status, p_result: parsed.data.result ?? {} } as never);
        if (error) return dbError(error);
        return agentJson({ ok: true, ...(data as object) });
      },
    },
  },
});

