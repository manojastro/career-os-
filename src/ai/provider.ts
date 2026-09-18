import "server-only";
import { z } from "zod";

export interface AIProvider {
  readonly name: "openai" | "anthropic" | "gemini";
  generate(system: string, prompt: string): Promise<string>;
  structuredOutput<T>(system: string, prompt: string, schema: z.ZodType<T>): Promise<T>;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}. Check the key, model, and provider limits.`);
  return await response.json() as Record<string, unknown>;
}

function adapter(name: AIProvider["name"], generate: AIProvider["generate"]): AIProvider {
  return {
    name, generate,
    async structuredOutput<T>(system: string, prompt: string, schema: z.ZodType<T>) {
      const raw = await generate(`${system}\nReturn only a valid JSON object. Do not include Markdown fences.`, prompt);
      const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      let parsed: unknown;
      try { parsed = JSON.parse(clean); } catch { throw new Error("AI returned invalid JSON. Please try again."); }
      const result = schema.safeParse(parsed);
      if (!result.success) throw new Error("AI returned an unsupported command. No changes were made.");
      return result.data;
    },
  };
}

export function getAIProvider(): AIProvider | null {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_MODEL;
    if (!key || !model) return null;
    return adapter("openai", async (system, prompt) => {
      const response = await postJson("https://api.openai.com/v1/responses", { Authorization: `Bearer ${key}` }, { model, instructions: system, input: prompt });
      const output = response.output as { content?: { type?: string; text?: string }[] }[] | undefined;
      return String(response.output_text ?? output?.flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("\n") ?? "");
    });
  }
  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY; const model = process.env.ANTHROPIC_MODEL;
    if (!key || !model) return null;
    return adapter("anthropic", async (system, prompt) => {
      const response = await postJson("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, { model, max_tokens: 1200, system, messages: [{ role: "user", content: prompt }] });
      const content = response.content as { type?: string; text?: string }[] | undefined;
      return content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n") ?? "";
    });
  }
  if (provider === "gemini") {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY; const model = process.env.GEMINI_MODEL;
    if (!key || !model) return null;
    return adapter("gemini", async (system, prompt) => {
      const response = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": key }, { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] });
      const candidates = response.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
      return candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    });
  }
  return null;
}
