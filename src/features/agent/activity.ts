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
/** The worker sends no heartbeat, so report only the latest activity it actually recorded. */
export function workerActivity(runs: Row[], commands: Row[], now = Date.now()) {
  const stamps = [
    ...runs.flatMap((r) => [r["started_at"], r["finished_at"]]),
    ...commands.flatMap((c) => [c["claimed_at"], c["completed_at"]]),
  ]
    .map((v) => (typeof v === "string" ? Date.parse(v) : NaN))
    .filter((v) => Number.isFinite(v));
  const waiting = commands.filter(
    (c) => c["status"] === "queued" && now - Date.parse(c["created_at"]) > WAIT_MS,
  ).length;
  return { last: stamps.length ? new Date(Math.max(...stamps)).toISOString() : null, waiting };
}
