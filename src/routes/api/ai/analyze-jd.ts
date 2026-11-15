import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { userClient } from "@/lib/ai-gateway.server";
import { checkAiQuota } from "@/lib/ai-quota.server";
import { analyzeJobPosting } from "@/lib/jobs/analyze.server";
import { readJsonLimited } from "@/lib/learning/http";

const inputSchema = z.object({ description: z.string().trim().min(80).max(20000) });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/ai/analyze-jd")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJsonLimited(request, 90000);
        if (!body.ok) return json({ error: body.error }, body.status);
        const parsed = inputSchema.safeParse(body.body);
        if (!parsed.success)
          return json({ error: "Paste a job description of at least 80 characters." }, 400);

        const session = await userClient(request);
        if (!session) return json({ error: "Sign in to analyze a job description." }, 401);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey)
          return json(
            { error: "AI is not configured on the server. Local analysis is used instead." },
            503,
          );
        const quota = await checkAiQuota(session.user.id, "analyze-jd");
        if (quota) return quota;

        try {
          return json(await analyzeJobPosting(apiKey, parsed.data.description));
        } catch {
          return json({ error: "AI analysis failed or timed out. Try again later." }, 502);
        }
      },
    },
  },
});
