import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverSupabase } from "../serverSupabase";
import { learningJson } from "./http";

export type LearningAuth = { db: SupabaseClient; uid: string; origin: string };
export async function authorizeLearning(request: Request, agent: boolean): Promise<LearningAuth | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return learningJson({ error: "hosted_workspace_required" }, 503);
  const origin = process.env.CAREER_OS_BASE_URL ? new URL(process.env.CAREER_OS_BASE_URL).origin : new URL(request.url).origin;
  let db: SupabaseClient; let uid: string;
  if (agent) {
    const hash = process.env.AGENT_TOKEN_SHA256 ?? "";
    const owner = process.env.AGENT_OWNER_USER_ID ?? "";
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!/^[a-f0-9]{64}$/i.test(hash) || !/^[a-f0-9-]{36}$/i.test(owner) || !service) return learningJson({ error: "agent_endpoint_not_activated" }, 503);
    const token = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token || !timingSafeEqual(createHash("sha256").update(token).digest(), Buffer.from(hash, "hex"))) return learningJson({ error: "unauthorized" }, 401);
    db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.admin.getUserById(owner);
    if (error || !data.user?.email_confirmed_at) return learningJson({ error: "agent_owner_not_bound" }, 409);
    uid = owner;
  } else {
    const token = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    db = token ? createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }) : await serverSupabase(url, anon);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return learningJson({ error: "unauthorized" }, 401);
    uid = data.user.id;
  }
  const { data: allowed, error } = await db.rpc("learning_rate_limit", { p_user_id: uid, p_bucket: `${agent ? "agent" : "user"}:${request.method}`, p_max: request.method === "GET" ? 90 : 30 });
  if (error) return learningJson({ error: "learning_schema_unavailable" }, 503);
  if (!allowed) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60", "Cache-Control": "no-store" } });
  if (agent) await db.from("learning_preferences").update({ hermes_last_seen_at: new Date().toISOString() }).eq("user_id", uid);
  return { db, uid, origin };
}

export function telegramSenderAllowed(sender: string) {
  const expected = process.env.TELEGRAM_OWNER_ID_SHA256 ?? "";
  if (!/^[a-f0-9]{64}$/i.test(expected)) return "telegram_sender_not_configured";
  return timingSafeEqual(createHash("sha256").update(sender).digest(), Buffer.from(expected, "hex")) ? null : "telegram_sender_rejected";
}
