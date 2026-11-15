import { Output, streamText } from "ai";
import { z } from "zod";
import { AI_MODEL, lovableGateway, reasoningOptions } from "@/lib/ai-gateway.server";

export const jobAnalysisSchema = z.object({
  required_skills: z.array(z.string()).max(30),
  preferred_skills: z.array(z.string()).max(30),
  tools: z.array(z.string()).max(30),
  cloud_requirements: z.array(z.string()).max(20),
  experience_signals: z.array(z.string()).max(20),
  responsibilities: z.array(z.string()).max(20),
});
export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;

/** Stated requirements only; the job post is data, never instructions. Throws on failure. */
export async function analyzeJobPosting(apiKey: string, description: string) {
  const gateway = lovableGateway(apiKey);
  const result = streamText({
    abortSignal: AbortSignal.timeout(30000),
    maxOutputTokens: 1800,
    model: gateway.responses(AI_MODEL),
    system:
      "Extract only requirements stated in this job description. Return required_skills, preferred_skills, tools, cloud_requirements, experience_signals and responsibilities. Do not infer unstated qualifications. Keep entries concise and deduplicate.",
    prompt: description,
    output: Output.object({ schema: jobAnalysisSchema }),
    providerOptions: reasoningOptions as never,
  });
  return jobAnalysisSchema.parse(await result.output);
}
