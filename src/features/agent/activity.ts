import type { Row } from "./agentData";

const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Totals only what runs actually reported; missing usage is unknown, never zero. */
export function usageSummary(runs: Row[]) {
  let tokenRuns = 0,
    tokens = 0,
    costRuns = 0,
    cost = 0;
  for (const run of runs) {
    const usage = (run["usage"] ?? {}) as Record<string, unknown>;
    const counts = [number(usage["input_tokens"]), number(usage["output_tokens"])].filter(
      (v) => v !== null,
    );
    if (counts.length) {
      tokenRuns++;
      tokens += counts.reduce((sum, v) => sum + v, 0);
    }
    const spent = number(usage["cost_usd"]);
    if (spent !== null) {
      costRuns++;
      cost += spent;
    }
  }
  return { runs: runs.length, tokenRuns, tokens, costRuns, cost };
}

export function usageLabel(s: ReturnType<typeof usageSummary>) {
  if (!s.runs) return "No runs yet";
  const of = (n: number) => ` (${n} of ${s.runs} runs reported)`;
  const parts = [`Last ${s.runs} runs`];
  if (!s.tokenRuns && !s.costRuns) return [...parts, "usage not reported"].join(" · ");
  parts.push(
    s.tokenRuns
      ? `${s.tokens.toLocaleString("en-IN")} tokens${of(s.tokenRuns)}`
      : "tokens not reported",
  );
  parts.push(s.costRuns ? `$${s.cost.toFixed(2)}${of(s.costRuns)}` : "cost not reported");
  return parts.join(" · ");
}

const WAIT_MS = 10 * 60_000;
const ONLINE_MS = 5 * 60_000;
/**
 * Latest activity the worker actually recorded. `polledAt` is the poll check-in (migration
 * 0009); without it online status is unknown (null), never guessed.
 */
export function workerActivity(runs: Row[], commands: Row[], now = Date.now(), polledAt?: unknown) {
  const polled = typeof polledAt === "string" ? Date.parse(polledAt) : NaN;
  const stamps = [
    ...runs.flatMap((r) => [r["started_at"], r["finished_at"]]),
    ...commands.flatMap((c) => [c["claimed_at"], c["completed_at"]]),
  ]
    .map((v) => (typeof v === "string" ? Date.parse(v) : NaN))
    .concat(polled)
    .filter((v) => Number.isFinite(v));
  const waiting = commands.filter(
    (c) => c["status"] === "queued" && now - Date.parse(c["created_at"]) > WAIT_MS,
  ).length;
  return {
    last: stamps.length ? new Date(Math.max(...stamps)).toISOString() : null,
    waiting,
    online: Number.isFinite(polled) ? now - polled < ONLINE_MS : null,
  };
}

const words = (value: unknown) => String(value ?? "").replaceAll("_", " ");
const later = (a: { expires_at: string }, b: { expires_at: string }) =>
  a.expires_at.localeCompare(b.expires_at);

/** Approvals still waiting for the owner's exact Telegram reply. */
export function pendingConfirmations(v1: Row[], v2: Row[], now = Date.now()) {
  const open = (expires: unknown) => typeof expires === "string" && Date.parse(expires) > now;
  const legacy = v1
    .filter((a) => !a["consumed_at"] && open(a["expires_at"]))
    .map((a) => {
      const ops = (Array.isArray(a["operations"]) ? a["operations"] : []) as Row[];
      let summary: string;
      if (ops[0]?.["action"] === "undo") summary = "Undo an earlier change";
      else if (ops[0]?.["action"] === "learning_workflow")
        summary = "Learning: " + words(ops[0]["operation"]);
      else {
        const counts = new Map<string, number>();
        for (const op of ops) {
          const key = `${words(op["entity"])} ${op["action"]}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        summary = `${ops.length} change${ops.length === 1 ? "" : "s"}: ${[...counts]
          .map(([key, n]) => (n > 1 ? `${key} ×${n}` : key))
          .join(", ")}`;
      }
      return { id: a.id, reply: `confirm ${a.id}`, summary, expires_at: String(a["expires_at"]) };
    });
  const workflows = v2
    .filter((w) => w["state"] === "awaiting_confirmation" && open(w["approval_expires_at"]))
    .map((w) => {
      const kinds = ((Array.isArray(w["plan"]) ? w["plan"] : []) as Row[]).map((s) => s["kind"]);
      return {
        id: w.id,
        reply: `confirm v2 ${w["approval_id"]}`,
        summary: `Workflow with ${kinds.length} step${kinds.length === 1 ? "" : "s"}: ${kinds.join(", ")}`,
        expires_at: String(w["approval_expires_at"]),
      };
    });
  return [...legacy, ...workflows].sort(later);
}

/** One entry per Telegram message: the tools Hermes called, rejections and total server time. */
export function hermesMessages(audit: Row[]) {
  const groups = new Map<
    string,
    { message_ref: string; at: string; calls: string[]; rejected: string[]; duration_ms: number }
  >();
  for (const row of [...audit].sort((a, b) =>
    String(a["created_at"]).localeCompare(String(b["created_at"])),
  )) {
    if (row["action"] !== "control_call" && row["action"] !== "control_rejected") continue;
    const d = (row["detail"] ?? {}) as Row;
    const ref = String(d["message_ref"] ?? "");
    const group = groups.get(ref) ?? {
      message_ref: ref,
      at: String(row["created_at"]),
      calls: [],
      rejected: [],
      duration_ms: 0,
    };
    group.duration_ms += Number(d["duration_ms"]) || 0;
    const call = [words(d["operation"]), d["step"] ? words(d["step"]) : ""]
      .filter(Boolean)
      .join(" ");
    if (row["action"] === "control_rejected")
      group.rejected.push(`${words(d["operation"])}: ${words(d["error"])}`);
    else if (d["operation"] !== "begin") group.calls.push(call);
    groups.set(ref, group);
  }
  return [...groups.values()].sort((a, b) => b.at.localeCompare(a.at));
}

const titleOf = (row: Row | null | undefined) =>
  !row
    ? "record"
    : String(
        row["title"] ??
          row["name"] ??
          row["question"] ??
          (row["company"] && row["role"] ? `${row["company"]} · ${row["role"]}` : null) ??
          row["skill_name"] ??
          row["company"] ??
          "record",
      );
export function changeLabel(change: Row) {
  const before = change["before_row"] as Row | null,
    after = change["after_row"] as Row | null;
  const verb =
    !before && after
      ? "created"
      : !after || (after["deleted_at"] && !before?.["deleted_at"])
        ? "deleted"
        : "updated";
  return { verb, title: titleOf(after ?? before) };
}

const PAGES: Record<string, string> = {
  tasks: "/tasks",
  goals: "/goals",
  skills: "/skills",
  projects: "/projects",
  project_tasks: "/projects",
  job_applications: "/jobs",
  job_leads: "/jobs",
  job_skill_requirements: "/jobs",
  job_interviews: "/jobs",
  contacts: "/networking",
  network_interactions: "/networking",
  outreach: "/networking",
  events: "/networking",
  interview_questions: "/interviews",
  interview_practice: "/interviews",
  interview_stories: "/interviews",
  study_tasks: "/learning",
  source_documents: "/vault",
  uncertain_claims: "/vault",
  planner_blocks: "/planner",
  focus_sessions: "/daily-log",
  recommendations: "/today",
  career_preferences: "/settings",
  agent_commands: "/agent",
  feedback: "/agent",
};
export const pageFor = (entity: unknown) => PAGES[String(entity)];
const VERBS: Record<string, string> = { insert: "created", update: "updated", delete: "deleted" };
const ACTORS: Record<string, string> = { agent: "Agent", user: "You", system: "System" };
export function auditLabel(event: Row) {
  const d = (event["detail"] ?? {}) as Row;
  const text = [
    ACTORS[String(event["actor"])] ?? words(event["actor"]),
    VERBS[String(event["action"])] ?? words(event["action"]),
    words(event["entity_type"]),
  ].join(" ");
  return {
    text: d["status"] ? `${text} → ${words(d["status"])}` : text,
    path: pageFor(event["entity_type"]),
  };
}
