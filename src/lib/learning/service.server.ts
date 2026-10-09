// Server-only learning manager service. Every query is explicitly scoped to `uid`.
// Callers pass either the signed-in user's RLS client or the service client bound to agent_owner.
import { parseGuide, skillNameFor, type ParseReport } from "./parse";
import { addDays, classifyReply, defaultPlan, istParts, selectCandidates, validateRecommendation, type SelectionInput, type ReplyKind } from "./engine";

import type { SupabaseClient } from "@supabase/supabase-js";
type Db = SupabaseClient;
export class LearningError extends Error { constructor(public code: string, public status = 422, public detail?: unknown) { super(code); } }

export const DEFAULT_GUIDE_URL = "https://docs.google.com/document/d/1mvhBvoHWR70ZlynZTQp2KVvzyAwU0O6w-o7tTlC85dU/edit?usp=sharing";
const MAX_BYTES = 5 * 1024 * 1024;

/** SSRF guard: only Google Docs document IDs are accepted; the export URL is built server-side. */
export function googleDocId(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com" || u.port || u.username || u.password) return null;
  const m = /^\/document\/(?:u\/\d+\/)?d\/(?:e\/)?([A-Za-z0-9_-]{20,120})(?:\/|$)/.exec(u.pathname);
  return m ? m[1] : null;
}
const ALLOWED_FINAL_HOSTS = /^(docs\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/;

export async function fetchGuideText(url: string, fetcher: typeof fetch = fetch) {
  const id = googleDocId(url);
  if (!id) throw new LearningError("url_not_allowed", 400);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let destination = new URL(`https://docs.google.com/document/d/${id}/export?format=txt`);
    let res: Response | undefined;
    for (let hop = 0; hop <= 3; hop++) {
      res = await fetcher(destination, { redirect: "manual", signal: ctrl.signal, headers: { Accept: "text/plain" } });
      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get("location");
      if (!location || hop === 3) throw new LearningError("redirect_not_allowed", 502);
      destination = new URL(location, destination);
      if (destination.protocol !== "https:" || destination.port || destination.username || destination.password || !ALLOWED_FINAL_HOSTS.test(destination.hostname)) {
        throw new LearningError("redirect_not_allowed", 502);
      }
      await res.body?.cancel();
    }
    if (!res) throw new LearningError("document_fetch_failed", 502);
    const finalHost = res.url ? new URL(res.url).hostname : "docs.google.com";
    if (!ALLOWED_FINAL_HOSTS.test(finalHost)) throw new LearningError("redirect_not_allowed", 502);
    if (res.status === 401 || res.status === 403 || res.status === 404) throw new LearningError("document_not_accessible", 502, { status: res.status });
    if (!res.ok) throw new LearningError("document_fetch_failed", 502, { status: res.status });
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("text/plain")) throw new LearningError("document_not_machine_readable", 502, { content_type: type.slice(0, 80) });
    if (Number(res.headers.get("content-length")) > MAX_BYTES) throw new LearningError("document_too_large", 413);
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > MAX_BYTES) { await reader.cancel(); throw new LearningError("document_too_large", 413); }
          chunks.push(part.value);
        }
      } finally { reader.releaseLock(); }
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return { id, text };
  } catch (e) {
    if (e instanceof LearningError) throw e;
    throw new LearningError(ctrl.signal.aborted ? "document_fetch_timeout" : "document_fetch_failed", 502);
  } finally { clearTimeout(timer); }
}

export async function getPrefs(db: Db, uid: string) {
  const { data, error: readError } = await db.from("learning_preferences").select("*").eq("user_id", uid).is("deleted_at", null).maybeSingle();
  if (readError) throw new LearningError("preferences_unavailable", 503);
  if (data) return data;
  const { error } = await db.from("learning_preferences").upsert({ user_id: uid, guide_url: DEFAULT_GUIDE_URL }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw new LearningError("preferences_unavailable", 500);
  const { data: created, error: fetchError } = await db.from("learning_preferences").select("*").eq("user_id", uid).is("deleted_at", null).single();
  if (fetchError) throw new LearningError("preferences_unavailable", 503);
  return created;
}

export async function testDocumentAccess(url: string) {
  const { text } = await fetchGuideText(url);
  const r = parseGuide(text);
  return summarize(r);
}

function summarize(r: ParseReport) {
  return { title: r.title, topic_count: r.topics.length, declared_volumes: r.declared_volumes, parsed_volumes: r.parsed_volumes, missing_volumes: r.missing_volumes, missing_topics: r.missing_topics, complete: r.complete, errors: r.errors, content_hash: r.content_hash };
}


const PUBLIC_ERRORS = new Set(["baseline_required","learning_paused","invalid_assignment_date","assignment_exists_for_date","topic_not_in_curriculum","missing_completion_criteria","invalid_plan","weekly_budget_exceeded","topic_already_completed","prerequisites_incomplete","carry_over_required","idempotency_conflict","needs_clarification","invalid_minutes","unexpected_minutes","telegram_reply_not_mapped","telegram_assignment_mismatch","assignment_not_found","task_not_found","task_already_completed","invalid_reschedule_date","reported_total_below_recorded","invalid_minutes_mode","learning_access_denied"]);

async function invoke(db: Db, uid: string, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, { p_user_id: uid, ...args });
  if (error) {
    const code = PUBLIC_ERRORS.has(error.message) ? error.message : "learning_write_failed";
    throw new LearningError(code, code === "learning_access_denied" ? 403 : code === "learning_write_failed" ? 500 : 409);
  }
  return data;
}

/** Parsing occurs before the atomic import; incomplete updates retain every active topic. */
export async function syncCurriculum(db: Db, uid: string, opts: { url?: string; text?: string; fetcher?: typeof fetch } = {}) {
  const prefs = await getPrefs(db, uid);
  const url = opts.url || prefs.guide_url || DEFAULT_GUIDE_URL;
  const document_id = googleDocId(url);
  if (!document_id) throw new LearningError("url_not_allowed", 400);
  let report: ParseReport;
  try {
    const text = opts.text ?? (await fetchGuideText(url, opts.fetcher)).text;
    report = parseGuide(text);
    if (!report.topics.length || report.errors.length) throw new LearningError("parse_failed", 422);
  } catch (cause) {
    const error = cause instanceof LearningError ? cause.code : "document_fetch_failed";
    await db.rpc("learning_sync_failure", { p_user_id: uid, p_document_id: document_id, p_url: url, p_error: error });
    throw cause;
  }
  const topics = report.topics.map((topic) => ({ ...topic, skill_name: skillNameFor(topic), skill_aliases: skillAliases(skillNameFor(topic)) }));
  return invoke(db, uid, "learning_import_curriculum", {
    p_source: { url, document_id }, p_topics: topics, p_report: summarize(report),
  });
}

function skillAliases(name: string) {
  const aliases: Record<string, string[]> = {
    Python: ["Python 3", "Python Programming"], FastAPI: ["Fast API"],
    RAG: ["Retrieval Augmented Generation"], LangGraph: ["Lang Graph"],
    "AI Agents": ["Agentic AI", "AI Agent Engineering"], "Azure AI": ["Azure", "Azure OpenAI"],
    Docker: ["Docker Containers"], Kubernetes: ["K8s"], Evaluation: ["AI Evaluation", "LLM Evaluation"],
    Observability: ["AI Observability", "LLM Observability"],
  };
  return aliases[name] ?? [];
}

export async function loadSelection(db: Db, uid: string, date: string): Promise<SelectionInput & { prefs: Record<string, unknown> }> {
  const prefs = await getPrefs(db, uid);
  const [topics, prereqs, baselines, assignments] = await Promise.all([
    db.from("curriculum_topics").select("id,stable_topic_id,title,priority,sequence,recommended_minutes,completion_criteria,removed_at").eq("user_id", uid).is("deleted_at", null).order("sequence").limit(2000),
    db.from("curriculum_prerequisites").select("topic_id,prerequisite_topic_id").eq("user_id", uid).is("deleted_at", null).limit(5000),
    db.from("learning_baselines").select("topic_id,level,basis").eq("user_id", uid).is("deleted_at", null).limit(2000),
    db.from("learning_assignments").select("id,topic_id,assignment_date,status,task_id,tasks(status)").eq("user_id", uid).is("deleted_at", null).order("assignment_date", { ascending: false }).limit(500),
  ]);
  if ([topics, prereqs, baselines, assignments].some((result) => result.error)) throw new LearningError("learning_context_unavailable", 503);
  const mapped = (assignments.data ?? []).map((a) => ({ ...a, task_completed: (a.tasks as unknown as { status: string } | null)?.status === "completed" }));
  const monday = new Date(date + "T00:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const start = monday.toISOString().slice(0, 10);
  const end = addDays(start, 7);
  const { data: week, error } = await db.from("learning_assignments").select("planned_minutes").eq("user_id", uid).gte("assignment_date", start).lt("assignment_date", end).neq("assignment_date", date).not("status", "in", "(cancelled,rescheduled)").is("deleted_at", null).limit(100);
  if (error) throw new LearningError("learning_context_unavailable", 503);
  const remaining = Math.max(0, prefs.weekly_minutes - (week ?? []).reduce((sum, a) => sum + a.planned_minutes, 0));
  return { prefs, date, daily_minutes: Math.min(prefs.daily_minutes, remaining), topics: topics.data ?? [], prereqs: prereqs.data ?? [], baselines: baselines.data ?? [], assignments: mapped } as SelectionInput & { prefs: Record<string, unknown> };
}

export interface CreateAssignment {
  topic_id: string; assignment_date: string; idempotency_key: string; source: "app" | "agent";
  plan?: { step: string; minutes: number }[]; rationale?: string; practical_outcome?: string; completion_criteria?: string;
}

export async function createAssignment(db: Db, uid: string, input: CreateAssignment, origin: string) {
  const sel = await loadSelection(db, uid, input.assignment_date);
  if (!sel.prefs.baseline_completed_at) throw new LearningError("baseline_required", 409);
  if (sel.prefs.paused) throw new LearningError("learning_paused", 409);
  const topic = sel.topics.find((t) => t.id === input.topic_id);
  const plan = input.plan?.length ? input.plan : defaultPlan(topic?.title ?? "topic", Math.min(topic?.recommended_minutes ?? 60, sel.daily_minutes));
  const completion_criteria = input.completion_criteria || topic?.completion_criteria || "";
  const prior = await db.from("learning_assignments").select("id").eq("user_id", uid).eq("idempotency_key", input.idempotency_key).maybeSingle();
  if (prior.error) throw new LearningError("learning_context_unavailable", 503);
  if (!prior.data) {
    const check = validateRecommendation({ ...input, plan, completion_criteria }, sel);
    if (!check.ok) throw new LearningError("recommendation_rejected", 422, check.errors);
  }
  const result = await invoke(db, uid, "learning_create_assignment", { p_input: { ...input, plan, completion_criteria } });
  return { ...result, task_url: origin + "/today#task-" + result.assignment.task_id };
}

export async function generateToday(db: Db, uid: string, origin: string, now = new Date()) {
  const prefs = await getPrefs(db, uid);
  const { date } = istParts(now, prefs.timezone);
  const sel = await loadSelection(db, uid, date);
  if (!sel.prefs.baseline_completed_at) throw new LearningError("baseline_required", 409);
  if (sel.prefs.paused) throw new LearningError("learning_paused", 409);
  if (!sel.topics.length) throw new LearningError("curriculum_not_imported", 409);
  const selected = selectCandidates(sel);
  if (selected.today) return { assignment: selected.today, task_url: origin + "/today#task-" + (selected.today as unknown as { task_id: string }).task_id, replayed: true };
  const pick = selected.carry_over?.topic_id ?? selected.candidates[0]?.topic_id;
  if (!pick) throw new LearningError("no_eligible_topic", 409);
  const topic = sel.topics.find((t) => t.id === pick)!;
  return createAssignment(db, uid, {
    topic_id: pick, assignment_date: date, idempotency_key: "app:plan:" + date, source: "app",
    completion_criteria: topic.completion_criteria || "Explain " + topic.title + ", record notes and demonstrate one tested example. (Suggested criterion.)",
    rationale: selected.carry_over ? "Continuing unfinished work." : "Next eligible topic in guide order.",
  }, origin);
}

export interface FeedbackInput {
  idempotency_key: string; assignment_id?: string; date?: string; text?: string; kind?: ReplyKind;
  minutes?: number | null; minutes_mode?: "total" | "additional"; notes?: string; new_date?: string;
  channel: "app" | "telegram" | "agent";
  telegram?: { sender_id: string; chat_ref: string; message_id: string; reply_to_message_id: string };
}

export async function applyFeedback(db: Db, uid: string, input: FeedbackInput) {
  const parsed = input.kind ? { kind: input.kind, minutes: input.minutes ?? null, notes: input.notes ?? "" } : classifyReply(input.text ?? "");
  if (parsed.kind === "ambiguous") throw new LearningError("needs_clarification", 422);
  return invoke(db, uid, "learning_apply_feedback", {
    p_input: { ...input, kind: parsed.kind, minutes: input.minutes ?? parsed.minutes, minutes_mode: input.minutes_mode ?? "total", notes: input.notes ?? parsed.notes },
  });
}

export async function eveningCheck(db: Db, uid: string, now = new Date()) {
  const prefs = await getPrefs(db, uid);
  const date = istParts(now, prefs.timezone).date;
  const { data: assignment, error } = await db.from("learning_assignments").select("id,status,task_id,curriculum_topics(title),tasks(status)").eq("user_id", uid).eq("assignment_date", date).is("deleted_at", null).not("status", "in", "(cancelled,rescheduled)").maybeSingle();
  if (error) throw new LearningError("learning_context_unavailable", 503);
  if (!assignment) return { date, needs_check_in: false, reason: "no_assignment_today" };
  const done = assignment.status === "completed" || (assignment.tasks as unknown as { status: string } | null)?.status === "completed";
  return { date, assignment_id: assignment.id, topic: (assignment.curriculum_topics as unknown as { title: string } | null)?.title, needs_check_in: !done, reason: done ? "already_completed_in_app" : "incomplete", options: done ? [] : ["Completed", "Partially Completed", "Not Started", "Reschedule", "Need Help"] };
}
