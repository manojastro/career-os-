import { authorizeLearning, telegramSenderAllowed } from "@/lib/learning/auth.server";
import { agentSchemas, learningJson, readLearningBody } from "@/lib/learning/http";
import { dueJobs, istParts, selectCandidates, topicState } from "@/lib/learning/engine";
import { LearningError, applyFeedback, createAssignment, eveningCheck, getPrefs, loadSelection, syncCurriculum } from "@/lib/learning/service.server";

type RouteContext = { params: Promise<{ action: string }> };
function failure(cause: unknown) {
  if (cause instanceof LearningError) return learningJson({ error: cause.code, detail: cause.detail }, cause.status);
  if (cause instanceof Error && cause.message === "payload_too_large") return learningJson({ error: cause.message }, 413);
  if (cause instanceof SyntaxError) return learningJson({ error: "invalid_json" }, 400);
  return learningJson({ error: "learning_request_failed" }, 500);
}
export async function GET(request: Request, context: RouteContext) {
  const { action } = await context.params;
  if (!["pulse", "context", "curriculum", "progress"].includes(action)) return learningJson({ error: "not_found" }, 404);
  const auth = await authorizeLearning(request, true); if (auth instanceof Response) return auth;
  try {
    const now = new Date(); const preferences = await getPrefs(auth.db, auth.uid); const { date } = istParts(now, preferences.timezone);
    const sel = await loadSelection(auth.db, auth.uid, date);
    const selected = selectCandidates(sel);
    if (action === "curriculum") {
      const url = new URL(request.url);
      const after = Math.max(0, Number(url.searchParams.get("after_sequence")) || 0);
      const { data, error } = await auth.db.from("curriculum_topics").select("*").eq("user_id", auth.uid).is("deleted_at", null).gt("sequence", after).order("sequence").limit(101);
      if (error) throw new Error("read_failed");
      return learningJson({ items: data.slice(0, 100), prerequisites: sel.prereqs, next_after_sequence: data.length > 100 ? data[99].sequence : null });
    }
    const [runs, commands, sources] = await Promise.all([
      auth.db.from("scheduler_runs").select("job,status,lease_until,attempt").eq("user_id", auth.uid).eq("run_date", date),
      auth.db.from("learning_agent_commands").select("id,command,created_at").eq("user_id", auth.uid).eq("status", "pending").is("deleted_at", null).order("created_at").limit(10),
      auth.db.from("curriculum_sources").select("url,status,last_synced_at,last_checked_at,last_error,active_version_id").eq("user_id", auth.uid).is("deleted_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if ([runs, commands, sources].some((r) => r.error)) throw new Error("read_failed");
    const finished = (runs.data ?? []).filter((r) => ["succeeded", "skipped"].includes(r.status) || r.attempt >= 3 || r.status === "claimed" && r.lease_until && new Date(r.lease_until) > now).map((r) => r.job);
    const prefs = sel.prefs;
    return learningJson({ generated_at: now.toISOString(), timezone: prefs.timezone, ist_date: date, app_url: auth.origin,
      preferences: { sync_time: prefs.sync_time, morning_time: prefs.morning_time, evening_time: prefs.evening_time, daily_minutes: sel.daily_minutes, weekly_minutes: prefs.weekly_minutes, paused: prefs.paused, baseline_completed: !!prefs.baseline_completed_at },
      due_jobs: dueJobs(now, { timezone: String(prefs.timezone), sync_time: String(prefs.sync_time), morning_time: String(prefs.morning_time), evening_time: String(prefs.evening_time), paused: Boolean(prefs.paused) }, finished),
      pending_commands: commands.data, curriculum: sources.data, today: selected.today, carry_over: selected.carry_over, candidates: selected.candidates.slice(0, 10), excluded_count: selected.excluded.length,
      progress: action === "progress" ? sel.topics.map((t) => ({ topic_id: t.id, stable_topic_id: t.stable_topic_id, state: topicState(t.id, sel.baselines, sel.assignments) })) : undefined,
    });
  } catch (cause) { return failure(cause); }
}
export async function POST(request: Request, context: RouteContext) {
  const { action } = await context.params;
  const schema = agentSchemas[action as keyof typeof agentSchemas]; if (!schema) return learningJson({ error: "not_found" }, 404);
  const auth = await authorizeLearning(request, true); if (auth instanceof Response) return auth;
  try {
    const body = await readLearningBody(request);
    const headerKey = request.headers.get("Idempotency-Key");
    const payload = body && typeof body === "object" && !Array.isArray(body) ? { ...body } as Record<string, unknown> : body;
    if (headerKey && payload && typeof payload === "object" && !Array.isArray(payload) && ["recommendation", "completion"].includes(action)) {
      const fields = payload as Record<string, unknown>;
      if (fields.idempotency_key && fields.idempotency_key !== headerKey) return learningJson({ error: "idempotency_conflict" }, 409);
      fields.idempotency_key = headerKey;
    }
    const parsed = schema.safeParse(payload); if (!parsed.success) return learningJson({ error: "invalid_request", issues: parsed.error.issues.map((i) => i.path.join(".")).slice(0, 10) }, 400);
    // Discriminated route bodies were validated above; each handler narrows its specific fields.
    const data = parsed.data as Record<string, unknown>;
    let result: unknown;
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const { data: response, error } = await auth.db.rpc(name, { p_user_id: auth.uid, ...args });
      if (error) throw new LearningError("learning_write_rejected", 409);
      return response;
    };
    switch (action) {
      case "sync": result = await syncCurriculum(auth.db, auth.uid); break;
      case "recommendation": result = await createAssignment(auth.db, auth.uid, { ...data as unknown as Parameters<typeof createAssignment>[2], source: "agent" }, auth.origin); break;
      case "completion": {
        const telegram = data.telegram as Parameters<typeof applyFeedback>[2]["telegram"];
        if (telegram) { const bad = telegramSenderAllowed(telegram.sender_id); if (bad) return learningJson({ error: bad }, bad === "telegram_sender_not_configured" ? 412 : 403); }
        result = await applyFeedback(auth.db, auth.uid, { ...data as unknown as Parameters<typeof applyFeedback>[2], channel: telegram ? "telegram" : "agent" }); break;
      }
      case "check-in": result = await eveningCheck(auth.db, auth.uid); break;
      case "run-claim": result = await rpc("learning_claim_run", { p_job: data.job, p_date: data.run_date, p_attempt_token: data.attempt_token, p_catch_up: data.catch_up }); break;
      case "run-finish": result = await rpc("learning_finish_run", { p_job: data.job, p_date: data.run_date, p_attempt_token: data.attempt_token, p_status: data.status, p_detail: data.detail }); break;
      case "begin-delivery": result = await rpc("learning_begin_delivery", { p_assignment_id: data.assignment_id, p_kind: data.kind, p_key: data.delivery_key, p_chat_ref: data.chat_ref }); break;
      case "delivery-status": result = await rpc("learning_finish_delivery", { p_key: data.delivery_key, p_status: data.status, p_message_id: data.message_id, p_error: data.error }); break;
      case "ack-command": {
        const { data: ack, error } = await auth.db.from("learning_agent_commands").update({ status: data.status, result: data.result }).eq("id", data.command_id).eq("user_id", auth.uid).eq("status", "pending").select("id").maybeSingle();
        if (error) throw new Error("write_failed"); result = { acknowledged: !!ack }; break;
      }
    }
    await auth.db.from("activity_log").insert({ user_id: auth.uid, entity_type: "learning_agent", entity_id: auth.uid, action, summary: `Learning agent: ${action}`, metadata: {} });
    return learningJson(result ?? { error: "not_found" }, result === undefined ? 404 : 200);
  } catch (cause) { return failure(cause); }
}
