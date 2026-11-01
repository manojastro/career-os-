import { it, expect } from "vitest";
import { usageLabel, usageSummary, workerActivity } from "./activity";
const run = (id: string, usage: Record<string, unknown>, started_at = "2026-11-01T05:00:00Z") => ({
  id,
  usage,
  started_at,
  finished_at: null,
});
it("never turns unreported usage into zero tokens or zero cost", () => {
  expect(usageLabel(usageSummary([]))).toBe("No runs yet");
  expect(usageLabel(usageSummary([run("a", {}), run("b", {})]))).toBe(
    "Last 2 runs · usage not reported",
  );
  expect(
    usageLabel(
      usageSummary([
        run("a", { input_tokens: 1000, output_tokens: 234 }),
        run("b", { cost_usd: 0.25, input_tokens: "n/a" }),
        run("c", {}),
      ]),
    ),
  ).toBe("Last 3 runs · 1,234 tokens (1 of 3 runs reported) · $0.25 (1 of 3 runs reported)");
});
it("reports the latest recorded worker activity and commands nobody has claimed", () => {
  const now = Date.parse("2026-11-02T06:00:00Z");
  const activity = workerActivity(
    [{ ...run("r", {}), finished_at: "2026-11-02T04:00:00Z" }],
    [
      { id: "1", status: "completed", created_at: "x", claimed_at: "2026-11-02T04:30:00Z" },
      { id: "2", status: "queued", created_at: "2026-11-02T05:40:00Z" },
      { id: "3", status: "queued", created_at: "2026-11-02T05:55:00Z" },
    ],
    now,
  );
  expect(activity).toEqual({ last: "2026-11-02T04:30:00.000Z", waiting: 1 });
  expect(workerActivity([], [], now)).toEqual({ last: null, waiting: 0 });
});
