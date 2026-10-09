// Server-only learning manager service. Every query is explicitly scoped to `uid`.
// Callers pass either the signed-in user's RLS client or the service client bound to agent_owner.
// All multi-row side effects run inside single PostgreSQL transactions (learning_* RPCs).
import { readLimited, StreamTooLarge } from "./stream";
import { htmlToText } from "./docx";
export { readLimited };
import { parseGuide, skillNameFor, type ParseReport } from "./parse";
import {
  classifyReply,
  defaultPlan,
  zonedParts,
  selectCandidates,
  validateRecommendation,
  type SelectionInput,
  type ReplyKind,
} from "./engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
/** Fail closed: a failed read must never look like valid empty data. */
export function queryFailed() {
  console.error("[learning] read query failed");
  return new LearningError("learning_data_unavailable", 503);
}

export class LearningError extends Error {
  constructor(
    public code: string,
    public status = 422,
    public detail?: unknown,
  ) {
    super(code);
  }
}

export const DEFAULT_GUIDE_URL =
  "https://docs.google.com/document/d/1mvhBvoHWR70ZlynZTQp2KVvzyAwU0O6w-o7tTlC85dU/edit?usp=sharing";
export const MAX_GUIDE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;

/** Known RPC exception codes → HTTP status. Anything else becomes a generic error (no DB details leak). */
const RPC_CODES: Record<string, number> = {
  learning_access_denied: 403,
  invalid_idempotency_key: 400,
  idempotency_conflict: 409,
  baseline_required: 409,
  learning_paused: 409,
  invalid_assignment_date: 422,
  assignment_exists_for_date: 409,
  topic_not_in_curriculum: 422,
  missing_completion_criteria: 422,
  invalid_plan: 422,
  exceeds_daily_minutes: 422,
  weekly_budget_exceeded: 422,
  topic_already_completed: 409,
  prerequisites_incomplete: 422,
  carry_over_required: 409,
  needs_clarification: 422,
  invalid_minutes: 422,
  unexpected_minutes: 422,
  telegram_reply_not_mapped: 422,
  telegram_assignment_mismatch: 422,
  assignment_not_found: 404,
  task_not_found: 404,
  task_already_completed: 409,
  invalid_reschedule_date: 422,
  reported_total_below_recorded: 422,
  invalid_minutes_mode: 400,
  focus_identity_conflict: 409,
  invalid_focus_session: 422,
  source_not_found: 404,
  curriculum_changed_concurrently: 409,
  incomplete_import_kept_previous: 409,
  no_topics: 422,
  invalid_status: 400,
  run_not_claimed: 409,
  message_ref_required: 422,
  message_already_recorded: 409,
  invalid_kind: 400,
  delivery_not_found: 404,
  reservation_token_mismatch: 409,
  delivery_state_conflict: 409,
  command_not_found: 404,
  command_state_conflict: 409,
  invalid_timezone: 422,
};

export function rpcError(error: { message?: string } | null | undefined): LearningError {
  const msg = error?.message ?? "";
  for (const code of Object.keys(RPC_CODES))
    if (msg === code || msg.startsWith(code)) return new LearningError(code, RPC_CODES[code]);
  console.error("[learning] database operation failed");
  return new LearningError("learning_request_failed", 500);
}

async function rpc<T = Record<string, unknown>>(db: Db, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw rpcError(error);
  return data as T;
}

/** SSRF guard for a URL hop: https, no credentials, default port, allowlisted host. */
export function safeGuideHop(url: string, allowGoogleusercontent = true): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return null;
  if (u.hostname === "docs.google.com") return u;
  if (allowGoogleusercontent && /^[a-z0-9-]+\.googleusercontent\.com$/.test(u.hostname)) return u;
  return null;
}

/** Only Google Docs document IDs are accepted; the export URL is built server-side. */
export function googleDocId(url: string): string | null {
  const u = safeGuideHop(url, false);
  if (!u) return null;
  if (/^\/document\/(?:u\/\d+\/)?d\/e\//.test(u.pathname)) return null;
  const m = /^\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,120})(?:\/|$)/.exec(u.pathname);
  return m ? m[1] : null;
}

/**
 * Accepted guide sources: an editable/shared Google Doc (txt export) or a published-to-web Doc
 * (/document/d/e/<id>/pub, HTML converted to text). The fetch URL is always built server-side.
 */
export function googleDocSource(url: string): { kind: "doc" | "pub"; id: string; document_id: string } | null {
  const u = safeGuideHop(url, false);
  if (!u) return null;
  const pub = /^\/document\/(?:u\/\d+\/)?d\/e\/(2PACX-[A-Za-z0-9_-]{20,200})(?:\/(?:pub|pubhtml)?)?$/.exec(u.pathname);
  if (pub) return { kind: "pub", id: pub[1], document_id: `pub:${pub[1]}` };
  const id = googleDocId(url);
  return id ? { kind: "doc", id, document_id: id } : null;
}

export async function fetchGuideText(url: string, fetcher: typeof fetch = fetch) {
  const src = googleDocSource(url);
  if (!src) throw new LearningError("url_not_allowed", 400);
  const id = src.id;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let next =
      src.kind === "pub"
        ? `https://docs.google.com/document/d/e/${id}/pub`
        : `https://docs.google.com/document/d/${id}/export?format=txt`;
    let res: Response | null = null;
    // Redirects are followed manually: every hop is validated BEFORE it is requested.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!safeGuideHop(next)) throw new LearningError("redirect_not_allowed", 502);
      res = await fetcher(next, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { Accept: src.kind === "pub" ? "text/html" : "text/plain" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel().catch(() => undefined);
        if (!loc) throw new LearningError("document_fetch_failed", 502);
        next = new URL(loc, next).toString();
        res = null;
        continue;
      }
      break;
    }
    if (!res) throw new LearningError("too_many_redirects", 502);
    if (res.status === 401 || res.status === 403 || res.status === 404)
      throw new LearningError("document_not_accessible", 502, { status: res.status });
    if (!res.ok) throw new LearningError("document_fetch_failed", 502, { status: res.status });
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith(src.kind === "pub" ? "text/html" : "text/plain")) {
      await res.body?.cancel().catch(() => undefined);
      throw new LearningError("document_not_machine_readable", 502);
    }
    let bytes: Uint8Array;
    try {
      bytes = await readLimited(res.body, MAX_GUIDE_BYTES);
    } catch (e) {
      if (e instanceof StreamTooLarge)
        throw new LearningError("document_too_large", 413);
      throw e;
    }
    const raw = new TextDecoder("utf-8").decode(bytes);
    return { id, text: src.kind === "pub" ? htmlToText(raw) : raw };
  } catch (e) {
    if (e instanceof LearningError) throw e;
    throw new LearningError(
      ctrl.signal.aborted ? "document_fetch_timeout" : "document_fetch_failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function getPrefs(db: Db, uid: string) {
  const { data, error: qe1 } = await db
    .from("learning_preferences")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (qe1) throw queryFailed();
  if (data) return data;
  const { data: created, error } = await db
    .from("learning_preferences")
    .insert({ user_id: uid, guide_url: DEFAULT_GUIDE_URL })
    .select("*")
    .single();
  if (error) throw new LearningError("preferences_unavailable", 500);
  return created;
}

export async function testDocumentAccess(url: string) {
  const { text } = await fetchGuideText(url);
  return summarize(parseGuide(text));
}

function summarize(r: ParseReport) {
  return {
    title: r.title,
    topic_count: r.topics.length,
    declared_volumes: r.declared_volumes,
    parsed_volumes: r.parsed_volumes,
    missing_volumes: r.missing_volumes,
    missing_topics: r.missing_topics,
    complete: r.complete,
    errors: r.errors,
    content_hash: r.content_hash,
  };
}

/** Pure decision: apply only a successful parse, and an incomplete one only when nothing is active yet. */
export function importDecision(report: ParseReport, hasActive: boolean) {
  const failed =
    report.topics.length === 0 || report.errors.some((e) => e.startsWith("duplicate_topic"));
  const status = failed ? "failed" : report.complete ? "validated" : "incomplete";
  return { failed, status, apply: !failed && (report.complete || !hasActive) };
}

/**
 * Imports the guide. Unchanged hash → no writes. A failed parse never touches topics. An incomplete
 * parse is applied only as the initial (limited) import; once any curriculum is active it is kept.
 * The apply step is one transaction (learning_apply_curriculum), so a midway failure changes nothing.
 */
export async function syncCurriculum(
  db: Db,
  uid: string,
  opts: { url?: string; text?: string; fetcher?: typeof fetch; origin?: "fetch" | "docx_upload" } = {},
) {
  const prefs = await getPrefs(db, uid);
  const url = opts.url || prefs.guide_url || DEFAULT_GUIDE_URL;
  const docId = googleDocSource(url)?.document_id;
  if (!docId) throw new LearningError("url_not_allowed", 400);
  let { data: source, error: qe2 } = await db
    .from("curriculum_sources")
    .select("*")
    .eq("user_id", uid)
    .eq("document_id", docId)
    .maybeSingle();
  if (qe2) throw queryFailed();
  if (!source) {
    const ins = await db
      .from("curriculum_sources")
      .insert({ user_id: uid, url, document_id: docId })
      .select("*")
      .single();
    if (ins.error) throw new LearningError("source_unavailable", 500);
    source = ins.data;
  }
  const now = new Date().toISOString();
  const recordFailure = async (code: string, hash = "", report: unknown = { error: code }) => {
    await db
      .from("curriculum_sources")
      .update({
        last_checked_at: now,
        status: source.active_version_id ? source.status : "failed",
        last_error: code,
      })
      .eq("id", source.id)
      .eq("user_id", uid);
    await db.from("curriculum_versions").insert({
      user_id: uid,
      source_id: source.id,
      content_hash: hash,
      status: "failed",
      applied: false,
      report,
    });
  };
  let text = opts.text;
  if (text === undefined) {
    try {
      text = (await fetchGuideText(url, opts.fetcher)).text;
    } catch (e) {
      await recordFailure(e instanceof LearningError ? e.code : "document_fetch_failed");
      throw e;
    }
  }
  const report = parseGuide(text);
  // A DOCX upload is a fallback copy of the configured guide: same source row, same parse + transaction.
  const summary = { ...summarize(report), origin: opts.origin ?? (opts.text === undefined ? "fetch" : "text") };
  let active: { content_hash: string; status: string } | null = null;
  if (source.active_version_id) {
    const { data, error: qe3 } = await db
      .from("curriculum_versions")
      .select("content_hash,status")
      .eq("id", source.active_version_id)
      .eq("user_id", uid)
      .maybeSingle();
    if (qe3) throw queryFailed();
    active = data;
  }
  if (active && active.content_hash === report.content_hash) {
    await db
      .from("curriculum_sources")
      .update({ last_checked_at: now })
      .eq("id", source.id)
      .eq("user_id", uid);
    return { outcome: "unchanged", report: summary, changes: null };
  }
  const d = importDecision(report, !!source.active_version_id);
  if (!d.apply) {
    await db.from("curriculum_versions").insert({
      user_id: uid,
      source_id: source.id,
      content_hash: report.content_hash,
      status: d.status,
      applied: false,
      topic_count: report.topics.length,
      report: summary,
    });
    await db
      .from("curriculum_sources")
      .update({
        last_checked_at: now,
        last_error: d.failed ? "parse_failed" : "incomplete_import_kept_previous",
      })
      .eq("id", source.id)
      .eq("user_id", uid);
    return {
      outcome: d.failed ? "failed_kept_previous" : "incomplete_kept_previous",
      report: summary,
      changes: null,
    };
  }
  try {
    const r = await rpc<{ version_id: string; changes: unknown }>(db, "learning_apply_curriculum", {
      p_user_id: uid,
      p_source_id: source.id,
      p_input: {
        expected_active_version_id: source.active_version_id ?? "",
        complete: report.complete,
        content_hash: report.content_hash,
        title: report.title,
        url,
        report: summary,
        topics: report.topics.map((t) => ({
          ...t,
          skill_name: skillNameFor(t),
        })),
      },
    });
    return {
      outcome: report.complete ? "applied" : "applied_incomplete",
      notice: report.complete
        ? null
        : "Initial limited import: the guide is incomplete. Missing content was not invented; later incomplete parses will not replace this version.",
      report: summary,
      changes: r.changes,
    };
  } catch (e) {
    await recordFailure(
      e instanceof LearningError ? e.code : "import_failed",
      report.content_hash,
      summary,
    );
    throw e;
  }
}

export async function loadSelection(
  db: Db,
  uid: string,
  date: string,
): Promise<SelectionInput & { prefs: Record<string, unknown> }> {
  const prefs = await getPrefs(db, uid);
  const [topics, prereqs, baselines, assignments] = await Promise.all([
    db
      .from("curriculum_topics")
      .select(
        "id,stable_topic_id,title,priority,sequence,recommended_minutes,completion_criteria,removed_at",
      )
      .eq("user_id", uid)
      .is("deleted_at", null)
      .order("sequence"),
    db
      .from("curriculum_prerequisites")
      .select("topic_id,prerequisite_topic_id")
      .eq("user_id", uid)
      .is("deleted_at", null),
    db
      .from("learning_baselines")
      .select("topic_id,level,basis")
      .eq("user_id", uid)
      .is("deleted_at", null),
    db
      .from("learning_assignments")
      .select("id,topic_id,assignment_date,status,planned_minutes,task_id,tasks(status)")
      .eq("user_id", uid)
      .is("deleted_at", null)
      .order("assignment_date", { ascending: false })
      .limit(500),
  ]);
  if (topics.error || prereqs.error || baselines.error || assignments.error) throw queryFailed();
  return {
    prefs,
    date,
    daily_minutes: prefs.daily_minutes,
    weekly_minutes: prefs.weekly_minutes,
    paused: !!prefs.paused,
    baseline_completed: !!prefs.baseline_completed_at,
    topics: topics.data ?? [],
    prereqs: prereqs.data ?? [],
    baselines: baselines.data ?? [],
    assignments: (assignments.data ?? []).map(
      (a: { tasks?: { status: string } | null } & Record<string, unknown>) => ({
        ...a,
        task_completed: a.tasks?.status === "completed",
      }),
    ),
  } as never;
}

export interface CreateAssignment {
  topic_id: string;
  assignment_date: string;
  idempotency_key: string;
  source: "app" | "agent";
  plan?: { step: string; minutes: number }[];
  rationale?: string;
  practical_outcome?: string;
  completion_criteria?: string;
}

/** Suggested criterion when neither the agent nor the guide supplies one — explicitly labeled inference. */
export function inferredCriterion(title: string) {
  return `Inference (the guide gives no completion criterion): explain the key ideas of ${title} in your own words and record one working practical example as evidence.`;
}

/**
 * Creates (or idempotently returns) the day's assignment and its single linked Learn task.
 * Server validation runs first for readable errors; the transaction re-checks every rule in SQL.
 */
export async function createAssignment(
  db: Db,
  uid: string,
  input: CreateAssignment,
  origin: string,
) {
  const { data: prior, error: qe4 } = await db
    .from("learning_assignments")
    .select("*")
    .eq("user_id", uid)
    .eq("idempotency_key", input.idempotency_key)
    .maybeSingle();
  if (qe4) throw queryFailed();
  const sel = await loadSelection(db, uid, input.assignment_date);
  const topic = sel.topics.find((t) => t.id === input.topic_id);
  const plan = input.plan?.length
    ? input.plan
    : defaultPlan(
        topic?.title ?? "topic",
        Math.min(topic?.recommended_minutes ?? 60, sel.daily_minutes),
      );
  const criteria =
    input.completion_criteria?.trim() ||
    topic?.completion_criteria?.trim() ||
    inferredCriterion(topic?.title ?? "this topic");
  if (!prior) {
    const check = validateRecommendation(
      {
        topic_id: input.topic_id,
        assignment_date: input.assignment_date,
        plan,
        completion_criteria: criteria,
      },
      sel,
    );
    if (!check.ok) throw new LearningError("recommendation_rejected", 422, check.errors);
  }
  const payload = {
    idempotency_key: input.idempotency_key,
    topic_id: input.topic_id,
    assignment_date: input.assignment_date,
    plan,
    rationale: (input.rationale ?? "").slice(0, 2000),
    practical_outcome: (input.practical_outcome ?? "").slice(0, 2000),
    completion_criteria: criteria.slice(0, 2000),
    source: input.source,
  };
  if (prior?.request_payload && JSON.stringify(sortKeys(prior.request_payload)) !== JSON.stringify(sortKeys(payload)))
    throw new LearningError("idempotency_conflict", 409);
  const r = await rpc<{ assignment: Record<string, unknown>; replayed: boolean }>(
    db,
    "learning_create_assignment",
    { p_user_id: uid, p_input: prior?.request_payload ?? payload },
  );
  return { ...r, task_url: `${origin}/today` };
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v as object)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  return v;
}

/** Deterministic "generate today's plan": carry-over first, else top eligible candidate. */
export async function generateToday(db: Db, uid: string, origin: string, now = new Date()) {
  const { date } = zonedParts(now, (await getPrefs(db, uid)).timezone);
  const sel = await loadSelection(db, uid, date);
  if (!sel.topics.length) throw new LearningError("curriculum_not_imported", 409);
  const s = selectCandidates(sel);
  if (s.today) return { assignment: s.today, task_url: `${origin}/today`, replayed: true };
  if (s.blocked) throw new LearningError(s.blocked, 409);
  const pick = s.carry_over?.topic_id ?? s.candidates[0]?.topic_id;
  if (!pick) throw new LearningError("no_eligible_topic", 409);
  return createAssignment(
    db,
    uid,
    {
      topic_id: pick,
      assignment_date: date,
      idempotency_key: `app:plan:${date}`,
      source: "app",
      rationale: s.carry_over
        ? "Continuing unfinished work from a previous day."
        : `Next eligible ${s.candidates[0].priority} topic in guide order.`,
    },
    origin,
  );
}

export interface FeedbackInput {
  idempotency_key: string;
  assignment_id?: string;
  date?: string;
  text?: string;
  kind?: ReplyKind;
  minutes?: number | null;
  minutes_mode?: "total" | "additional";
  notes?: string;
  new_date?: string;
  channel: "app" | "telegram" | "agent";
  telegram?: { chat_ref: string; message_id: string; reply_to_message_id: string };
}

/**
 * Single time strategy: focus_sessions is the ledger (weeklyTime), tasks.actual_minutes its running
 * total; a learning_sessions row mirrors a ledger row via focus_session_id and is never summed again.
 * Minutes are recorded only when the learner states them. One DB transaction per reply.
 */
export async function applyFeedback(db: Db, uid: string, input: FeedbackInput) {
  const parsed = input.kind
    ? { kind: input.kind, minutes: input.minutes ?? null, notes: input.notes ?? "" }
    : classifyReply(input.text ?? "");
  if (parsed.kind === "ambiguous")
    throw new LearningError("needs_clarification", 422, [
      "Completed",
      "Partially completed",
      "Not started",
      "Reschedule",
      "Need help",
    ]);
  const minutes = input.minutes ?? parsed.minutes ?? null;
  const payload: Record<string, unknown> = {
    idempotency_key: input.idempotency_key,
    kind: parsed.kind,
    channel: input.channel,
    text: (input.text ?? "").slice(0, 4000),
    notes: (input.notes ?? parsed.notes ?? "").slice(0, 4000),
    minutes_mode: input.minutes_mode ?? "total",
  };
  if (minutes != null) payload.minutes = minutes;
  if (input.assignment_id) payload.assignment_id = input.assignment_id;
  if (input.date) payload.date = input.date;
  if (input.new_date) payload.new_date = input.new_date;
  if (input.telegram) payload.telegram = input.telegram;
  return rpc<Record<string, unknown>>(db, "learning_apply_feedback", {
    p_user_id: uid,
    p_input: payload,
  });
}

export async function recordFocus(
  db: Db,
  uid: string,
  s: {
    task_id: string;
    session_id: string;
    started_at: string;
    ended_at: string;
    minutes: number;
    complete: boolean;
  },
) {
  return rpc(db, "learning_record_focus", {
    p_user_id: uid,
    p_task_id: s.task_id,
    p_session_id: s.session_id,
    p_started_at: s.started_at,
    p_ended_at: s.ended_at,
    p_minutes: s.minutes,
    p_complete: s.complete,
  });
}

export async function claimRun(
  db: Db,
  uid: string,
  r: { job: string; run_date: string; catch_up: boolean; lease_seconds?: number },
) {
  return rpc<Record<string, unknown>>(db, "learning_claim_run", {
    p_user_id: uid,
    p_job: r.job,
    p_run_date: r.run_date,
    p_catch_up: r.catch_up,
    p_lease_seconds: r.lease_seconds ?? 900,
  });
}

export async function finishRun(
  db: Db,
  uid: string,
  r: { job: string; run_date: string; attempt_token: string; status: string; detail: unknown },
) {
  return rpc(db, "learning_finish_run", {
    p_user_id: uid,
    p_job: r.job,
    p_run_date: r.run_date,
    p_token: r.attempt_token,
    p_status: r.status,
    p_detail: r.detail,
  });
}

/** Step 1 — reserve BEFORE calling Telegram. Only `send_allowed: true` may send. */
export async function beginDelivery(db: Db, uid: string, input: Record<string, unknown>) {
  return rpc<Record<string, unknown>>(db, "learning_begin_delivery", { p_user_id: uid, p_input: input });
}

/** Step 2 — compare-and-set the reservation to sent | failed | unknown (unknown → reconcile later). */
export async function finishDelivery(db: Db, uid: string, input: Record<string, unknown>) {
  return rpc<Record<string, unknown>>(db, "learning_finish_delivery", { p_user_id: uid, p_input: input });
}

export const LEARNING_COMMANDS = ["ping_learning_manager", "send_test_telegram"] as const;

/** Queued Settings test commands (never claimed by the general /api/agent/commands poll). */
export async function pendingLearningCommands(db: Db, uid: string) {
  const { data, error: qe5 } = await db
    .from("agent_commands")
    .select("id,command,workflow,payload,status,created_at")
    .eq("user_id", uid)
    .in("command", LEARNING_COMMANDS as unknown as string[])
    .in("status", ["queued", "claimed"])
    .is("deleted_at", null)
    .order("created_at")
    .limit(20);
  if (qe5) throw queryFailed();
  return data ?? [];
}

export async function ackCommand(
  db: Db,
  uid: string,
  r: { id: string; status: "completed" | "failed"; result: Record<string, unknown> },
) {
  return rpc<Record<string, unknown>>(db, "learning_ack_command", {
    p_user_id: uid,
    p_id: r.id,
    p_status: r.status,
    p_result: r.result,
  });
}

/** Deliveries whose outcome is unknown or still pending: an operator must reconcile, never blind-resend. */
export async function deliveriesNeedingReconciliation(db: Db, uid: string) {
  const { data, error: qe6 } = await db
    .from("telegram_message_map")
    .select("id,kind,assignment_id,delivery_status,idempotency_key,reserved_at,error")
    .eq("user_id", uid)
    .eq("direction", "outbound")
    .in("delivery_status", ["pending", "unknown"])
    .is("deleted_at", null)
    .order("reserved_at", { ascending: false })
    .limit(20);
  if (qe6) throw queryFailed();
  return data ?? [];
}

/** DEPRECATED: post-send receipt only (cannot prevent duplicate sends). Kept for old workers. */
export async function recordDelivery(db: Db, uid: string, input: Record<string, unknown>) {
  return rpc<{ id: string; replayed: boolean }>(db, "learning_record_delivery", {
    p_user_id: uid,
    p_input: input,
  });
}

/** Runs whose slot is taken for today: finished, live lease, or out of attempts. Failed/stale stay due. */
export function occupiedJobs(
  runs: { job: string; status: string; lease_until: string | null; attempt: number }[],
  now = new Date(),
) {
  return runs
    .filter(
      (r) =>
        r.status === "succeeded" ||
        r.status === "skipped" ||
        r.attempt >= 3 ||
        (r.status === "claimed" && !!r.lease_until && new Date(r.lease_until) > now),
    )
    .map((r) => r.job);
}

export async function eveningCheck(db: Db, uid: string, now = new Date()) {
  const date = zonedParts(now, (await getPrefs(db, uid)).timezone).date;
  const { data: a, error: qe7 } = await db
    .from("learning_assignments")
    .select("id,status,task_id,curriculum_topics(title),tasks(status)")
    .eq("user_id", uid)
    .eq("assignment_date", date)
    .neq("status", "cancelled")
    .is("deleted_at", null)
    .maybeSingle();
  if (qe7) throw queryFailed();
  if (!a) return { date, needs_check_in: false, reason: "no_assignment_today" };
  // Always read the actual task status before asking.
  const done = a.status === "completed" || a.tasks?.status === "completed";
  if (done && a.status !== "completed")
    await db
      .from("learning_assignments")
      .update({ status: "completed", completed_at: now.toISOString() })
      .eq("id", a.id)
      .eq("user_id", uid);
  return {
    date,
    assignment_id: a.id,
    topic: a.curriculum_topics?.title,
    needs_check_in: !done,
    reason: done ? "already_completed_in_app" : "incomplete",
    options: done
      ? []
      : ["Completed", "Partially Completed", "Not Started", "Reschedule", "Need Help"],
  };
}

