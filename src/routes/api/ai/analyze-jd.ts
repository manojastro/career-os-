import { createFileRoute } from "@tanstack/react-router";
import { Output, streamText } from "ai";
import { z } from "zod";
import { AI_MODEL, lovableGateway, reasoningOptions, userClient } from "@/lib/ai-gateway.server";

const inputSchema = z.object({ description: z.string().trim().min(80).max(20000) });

const outputSchema = z.object({
  required_skills: z.array(z.string()).max(30),
  preferred_skills: z.array(z.string()).max(30),
  tools: z.array(z.string()).max(30),
  cloud_requirements: z.array(z.string()).max(20),
  experience_signals: z.array(z.string()).max(20),
  responsibilities: z.array(z.string()).max(20),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/ai/analyze-jd")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = inputSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Paste a job description of at least 80 characters." }, 400);

        const session = await userClient(request);
        if (!session) return json({ error: "Sign in to analyze a job description." }, 401);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "AI is not configured on the server. Local analysis is used instead." }, 503);

        try {
          const gateway = lovableGateway(apiKey);
          const result = streamText({
            model: gateway.responses(AI_MODEL),
            system:
              "Extract only requirements stated in this job description. Return required_skills, preferred_skills, tools, cloud_requirements, experience_signals and responsibilities. Do not infer unstated qualifications. Keep entries concise and deduplicate.",
            prompt: parsed.data.description,
            output: Output.object({ schema: outputSchema }),
            providerOptions: reasoningOptions as never,
          });
          return json(await result.output);
        } catch (cause) {
          return json({ error: cause instanceof Error ? cause.message : "AI analysis failed." }, 502);
        }
      },
    },
  },
});

