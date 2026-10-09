// Deterministic learning logic shared by the app, the agent API and tests.
import type { Priority } from "./parse";


export interface TopicLite {
  id: string;
  stable_topic_id: string;
  title: string;
  priority: Priority;
  sequence: number;
  recommended_minutes: number;
  completion_criteria: string;
  removed_at: string | null;
}
export interface PrereqLite {
  topic_id: string;
  prerequisite_topic_id: string;
}
export interface BaselineLite {
  topic_id: string;
  level: "Not Started" | "Familiar" | "Learning" | "Practiced" | "Applied";
  basis: "manual" | "evidence";
}
export interface AssignmentLite {
  id: string;
  topic_id: string;
  assignment_date: string;
  status: string;
  task_completed?: boolean;
  planned_minutes?: number;
}

const PRIORITY_RANK: Record<Priority, number> = { MUST: 0, SHOULD: 1, OPTIONAL: 2 };

/** A topic counts as done when an assignment was completed or the learner's baseline says Practiced/Applied. */
export function topicState(
  topicId: string,
  baselines: BaselineLite[],
  assignments: AssignmentLite[],
) {
  if (
    assignments.some(
      (a) => a.topic_id === topicId && (a.status === "completed" || a.task_completed),
    )
  )
    return "completed" as const;
  const b = baselines.find((x) => x.topic_id === topicId)?.level;
  if (b === "Practiced" || b === "Applied") return "completed" as const;
  if (b === "Familiar") return "familiar" as const;
  if (b === "Learning" || assignments.some((a) => a.topic_id === topicId && a.status === "partial"))
    return "in_progress" as const;
  return "not_started" as const;
}

export interface SelectionInput {
  topics: TopicLite[];
  prereqs: PrereqLite[];
  baselines: BaselineLite[];
  assignments: AssignmentLite[];
  date: string;
  daily_minutes: number;
  /** Optional rules (enforced again in SQL). Undefined means "not provided" for pure tests. */
  weekly_minutes?: number;
  paused?: boolean;
  baseline_completed?: boolean;
}

/** Monday (ISO week start) of a YYYY-MM-DD date. */
export function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Minutes already planned in the date's week (cancelled/rescheduled excluded). */
export function weekPlannedMinutes(assignments: AssignmentLite[], date: string) {
  const start = mondayOf(date);
  const end = addDays(start, 7);
  return assignments
    .filter(
      (a) =>
        a.assignment_date >= start &&
        a.assignment_date < end &&
        a.status !== "cancelled" &&
        a.status !== "rescheduled",
    )
    .reduce((s, a) => s + (a.planned_minutes ?? 0), 0);
}

export interface Candidate {
  topic_id: string;
  stable_topic_id: string;
  title: string;
  priority: Priority;
  state: string;
  minutes: number;
  reason: string;
}

export function selectCandidates(input: SelectionInput) {
  const { topics, prereqs, baselines, assignments, date, daily_minutes } = input;
  const live = topics.filter((t) => !t.removed_at);
  const state = new Map(live.map((t) => [t.id, topicState(t.id, baselines, assignments)]));
  const satisfied = (id: string) => {
    const s = state.get(id);
    return s === "completed" || s === "familiar";
  };
  const todays = assignments.find(
    (a) => a.assignment_date === date && a.status !== "cancelled" && a.status !== "rescheduled",
  );
  // Unfinished work from earlier days is carried over before anything new.
  const carry =
    assignments
      .filter(
        (a) =>
          a.assignment_date < date &&
          ["planned", "delivered", "partial", "not_started"].includes(a.status) &&
          !a.task_completed &&
          state.get(a.topic_id) !== "completed",
      )
      .sort((a, b) => b.assignment_date.localeCompare(a.assignment_date))[0] ?? null;
  const excluded: { stable_topic_id: string; reason: string }[] = [];
  const candidates: Candidate[] = [];
  for (const t of live) {
    const s = state.get(t.id)!;
    if (s === "completed") {
      excluded.push({ stable_topic_id: t.stable_topic_id, reason: "completed" });
      continue;
    }
    const missing = prereqs.filter(
      (p) => p.topic_id === t.id && !satisfied(p.prerequisite_topic_id),
    );
    if (missing.length) {
      excluded.push({ stable_topic_id: t.stable_topic_id, reason: "prerequisites_incomplete" });
      continue;
    }
    candidates.push({
      topic_id: t.id,
      stable_topic_id: t.stable_topic_id,
      title: t.title,
      priority: t.priority,
      state: s,
      minutes: Math.min(t.recommended_minutes, daily_minutes),
      reason:
        s === "in_progress"
          ? "in progress — continue"
          : s === "familiar"
            ? "familiar — consolidate with practice"
            : "next in guide order",
    });
  }
  const stateRank = (s: string) => (s === "in_progress" ? 0 : 1);
  const famRank = (s: string) => (s === "familiar" ? 1 : 0);
  const seq = new Map(live.map((t) => [t.id, t.sequence]));
  candidates.sort(
    (a, b) =>
      stateRank(a.state) - stateRank(b.state) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      famRank(a.state) - famRank(b.state) ||
      seq.get(a.topic_id)! - seq.get(b.topic_id)!,
  );
  const blocked =
    input.paused === true
      ? "learning_paused"
      : input.baseline_completed === false
        ? "baseline_required"
        : null;
  return { today: todays ?? null, carry_over: carry, candidates, excluded, blocked };
}

export interface RecommendationInput {
  topic_id: string;
  assignment_date: string;
  plan: { step: string; minutes: number }[];
  completion_criteria?: string;
}

/** Validation layer: the agent may only pick an eligible, real topic that fits today's time. */
export function validateRecommendation(rec: RecommendationInput, input: SelectionInput) {
  const errors: string[] = [];
  const topic = input.topics.find((t) => t.id === rec.topic_id && !t.removed_at);
  if (!topic) errors.push("topic_not_in_curriculum");
  const sel = selectCandidates({ ...input, date: rec.assignment_date });
  if (sel.blocked) errors.push(sel.blocked);
  if (sel.today) errors.push("assignment_exists_for_date");
  const allowed = new Set(sel.candidates.map((c) => c.topic_id));
  if (topic && sel.carry_over && sel.carry_over.topic_id !== topic.id) errors.push("carry_over_required");
  else if (topic && !allowed.has(topic.id) && sel.carry_over?.topic_id !== topic.id)
    errors.push("topic_not_eligible");
  const total = rec.plan.reduce((s, p) => s + p.minutes, 0);
  if (
    !rec.plan.length ||
    rec.plan.length > 8 ||
    rec.plan.some((p) => !p.step.trim() || !Number.isInteger(p.minutes) || p.minutes <= 0)
  )
    errors.push("invalid_plan");
  if (total > input.daily_minutes) errors.push("exceeds_daily_minutes");
  if (
    input.weekly_minutes !== undefined &&
    total + weekPlannedMinutes(input.assignments, rec.assignment_date) > input.weekly_minutes
  )
    errors.push("weekly_budget_exceeded");
  // An actual criterion is required (supplied, from the guide, or an explicitly labeled inference).
  if (!(rec.completion_criteria?.trim() || topic?.completion_criteria?.trim()))
    errors.push("missing_completion_criteria");
  return { ok: errors.length === 0, errors, total_minutes: total };
}

/** Default deterministic plan; never exceeds `minutes`. */
export function defaultPlan(title: string, minutes: number) {
  const m = Math.max(3, Math.floor(minutes));
  const learn = Math.max(1, Math.floor(m * 0.35));
  const practice = Math.max(1, Math.floor(m * 0.45));
  const review = m - learn - practice;
  return [
    { step: `Study the concepts of ${title} in the guide`, minutes: learn },
    { step: "Build or run a small practical example", minutes: practice },
    { step: "Review, note gaps and record evidence", minutes: review },
  ];
}

// ---------- Timezone-aware scheduling (IANA zone, default Asia/Kolkata) ----------

export const DEFAULT_TZ = "Asia/Kolkata";

/** True when `tz` is a valid IANA zone name accepted by Intl (also validated in SQL). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !/^[A-Za-z0-9_+/-]{1,64}$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local calendar date and minute-of-day in `tz`, from Intl parts (DST-correct). */
export function zonedParts(now: Date, tz: string = DEFAULT_TZ) {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p: Record<string, string> = {};
  for (const x of parts) p[x.type] = x.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
  };
}

/** Back-compat helper: parts in Asia/Kolkata. */
export function istParts(now: Date) {
  return zonedParts(now, DEFAULT_TZ);
}
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type Job = "curriculum_sync" | "morning_plan" | "evening_check";
export interface SchedulePrefs {
  sync_time: string;
  morning_time: string;
  evening_time: string;
  paused: boolean;
  /** IANA zone; defaults to Asia/Kolkata. */
  timezone?: string;
}

/**
 * Catch-up policy (after reboot/restart): a job is due once per local day (prefs.timezone). On a DST
 * spring-forward day a skipped wall-clock time is still due once the clock passes it; on fall-back the
 * repeated hour cannot run a job twice because the slot is already taken.
 * Original policy: a job is due once per local day when its time has passed and it
 * has no run row yet. Late jobs still run the same day only inside a window — sync until 23:59, morning
 * plan until the evening check time, evening check until 23:30. Previous days are never replayed, so a
 * restart can never flood Telegram.
 */
export function dueJobs(now: Date, prefs: SchedulePrefs, ranToday: Job[]) {
  const { date, minutes } = zonedParts(now, prefs.timezone ?? DEFAULT_TZ);
  const windows: Record<Job, [number, number]> = {
    curriculum_sync: [toMin(prefs.sync_time), 24 * 60 - 1],
    morning_plan: [toMin(prefs.morning_time), toMin(prefs.evening_time)],
    evening_check: [toMin(prefs.evening_time), 23 * 60 + 30],
  };
  const out: { job: Job; run_date: string; catch_up: boolean }[] = [];
  for (const job of Object.keys(windows) as Job[]) {
    if (prefs.paused && job !== "curriculum_sync") continue;
    if (ranToday.includes(job)) continue;
    const [start, end] = windows[job];
    if (minutes >= start && minutes <= end)
      out.push({ job, run_date: date, catch_up: minutes - start > 15 });
  }
  return out;
}

// ---------- Reply interpretation ----------

export type ReplyKind = "completed" | "partial" | "not_started" | "reschedule" | "help" | "minutes";
export interface ReplyResult {
  kind: ReplyKind | "ambiguous";
  minutes: number | null;
  notes: string;
}

export function parseMinutes(text: string): number | null {
  const t = text.toLowerCase();
  const h = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(t);
  const m = /(\d+)\s*(?:m|min|mins|minute|minutes)\b/.exec(t);
  const total = (h ? Math.round(Number(h[1]) * 60) : 0) + (m ? Number(m[1]) : 0);
  return total > 0 && total <= 600 ? total : null;
}

export function classifyReply(text: string): ReplyResult {
  const raw = text.trim().slice(0, 4000);
  const t = raw.toLowerCase();
  const minutes = parseMinutes(t);
  const menu: Record<string, ReplyKind> = {
    "1": "completed",
    "2": "partial",
    "3": "not_started",
    "4": "reschedule",
    "5": "help",
  };
  if (menu[t]) return { kind: menu[t], minutes: null, notes: "" };
  if (/\b(simpler|explain|confus|stuck|need help|help me|don'?t understand)\b/.test(t))
    return { kind: "help", minutes, notes: raw };
  if (/\b(reschedule|tomorrow|continue (this|it) tomorrow|postpone|later)\b/.test(t))
    return { kind: "reschedule", minutes, notes: raw };
  if (/\b(couldn'?t|could not|didn'?t|did not|no time|not started|skipped)\b/.test(t))
    return { kind: "not_started", minutes: null, notes: raw };
  if (/\b(but not|partial|partly|half|some of|only)\b/.test(t))
    return { kind: "partial", minutes, notes: raw };
  if (/^(done|completed?|finished|yes)\b|\b(all done|completed it|finished it)\b/.test(t))
    return { kind: "completed", minutes, notes: raw === t && t.length < 12 ? "" : raw };
  if (minutes !== null) return { kind: "minutes", minutes, notes: raw };
  return { kind: "ambiguous", minutes: null, notes: raw };
}

