import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/ai/provider";
import { serverSupabase } from "@/lib/serverSupabase";

const inputSchema = z.object({ description: z.string().trim().min(80).max(20000) });
const outputSchema = z.object({
  required_skills: z.array(z.string().min(2)).max(30),
  preferred_skills: z.array(z.string().min(2)).max(30),
  tools: z.array(z.string().min(2)).max(30),
  cloud_requirements: z.array(z.string().min(2)).max(20),
  experience_signals: z.array(z.string().min(2)).max(20),
  responsibilities: z.array(z.string().min(2)).max(20),
});

export async function POST(request: NextRequest) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paste a job description of at least 80 characters." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "AI analysis requires a signed-in hosted workspace." }, { status: 503 });
  const supabase = await serverSupabase(url, key);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to analyze a job description." }, { status: 401 });
  const provider = getAIProvider();
  if (!provider) return NextResponse.json({ error: "Configure AI_PROVIDER, its API key, and model on the server." }, { status: 503 });
  try {
    const extracted = await provider.structuredOutput("Extract only requirements stated in this job description. Return a JSON object with required_skills, preferred_skills, tools, cloud_requirements, experience_signals, responsibilities. Do not infer unstated qualifications. Keep entries concise and deduplicate.", parsed.data.description, outputSchema);
    return NextResponse.json(extracted);
  } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "AI analysis failed." }, { status: 502 }); }
}
