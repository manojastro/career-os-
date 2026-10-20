/** Server-selected buckets only. Existing service-only persisted limiter; never trusts client quotas. */
export async function checkAiQuota(
  userId: string,
  kind: "command" | "analyze-jd",
): Promise<Response | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const window of [
    { name: "hour", limit: 20, seconds: 3600 },
    { name: "day", limit: 100, seconds: 86400 },
  ]) {
    const { data, error } = await supabaseAdmin.rpc("agent_rate_hit", {
      p_bucket: `ai:${kind}:${userId}:${window.name}`,
      p_limit: window.limit,
      p_window_seconds: window.seconds,
    });
    if (error)
      return Response.json(
        { error: "AI quota could not be checked. Try again later." },
        { status: 503 },
      );
    if (!data)
      return Response.json(
        { error: "AI request limit reached. Try again later." },
        { status: 429, headers: { "Retry-After": String(window.seconds) } },
      );
  }
  return null;
}
