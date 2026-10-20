import { describe, it, expect } from "vitest";
import { elapsedSeconds, restoreFocus, freezeFocus, applyDemoFocus } from "@/lib/domain/focus";
import { emptyData } from "@/lib/domain/types";
import { demoData } from "@/lib/domain/seed";
const now = Date.parse("2026-10-20T10:00:00Z");
const active = {
  version: 1 as const,
  id: "00000000-0000-4000-8000-000000000001",
  taskId: "00000000-0000-4000-8000-000000000002",
  startedAt: new Date(now - 120000).toISOString(),
  elapsedMs: 60000,
  runningSince: now - 60000,
};
describe("recoverable focus ledger", () => {
  it("keeps an over-limit timer unsaved instead of freezing an impossible request", () => {
    expect(() =>
      freezeFocus({ ...active, elapsedMs: 601 * 60000, runningSince: null }, false, now),
    ).toThrow("ten-hour");
  });
  it("recovers legacy demo IDs only in the separate demo workspace", () => {
    const raw = JSON.stringify({ ...active, taskId: "task-hybrid" });
    expect(restoreFocus(raw, now, true)?.taskId).toBe("task-hybrid");
    expect(restoreFocus(raw, now, false)).toBeNull();
  });
  it("recovers elapsed wall time after reload and preserves a paused clock", () => {
    const restored = restoreFocus(JSON.stringify(active), now)!;
    expect(elapsedSeconds(restored, now)).toBe(120);
    expect(elapsedSeconds({ ...restored, runningSince: null }, now + 50000)).toBe(60);
  });
  it("freezes the original completion intent and exact payload across repeated save attempts", () => {
    const frozen = freezeFocus(active, true, now);
    expect(frozen.save?.minutes).toBe(2);
    expect(freezeFocus(frozen, false, now + 60000)).toEqual(frozen);
    expect(restoreFocus(JSON.stringify(frozen), now + 60000)).toEqual(frozen);
  });
  it("rejects corrupt, future and expired state without fabricating time", () => {
    for (const raw of [
      "{}",
      "broken",
      JSON.stringify({ ...active, runningSince: now + 50000 }),
      JSON.stringify({ ...active, elapsedMs: -1 }),
      JSON.stringify({ ...active, startedAt: "2000-01-01" }),
    ])
      expect(restoreFocus(raw, now)).toBeNull();
    expect(() => freezeFocus({ ...active, elapsedMs: 0, runningSince: now }, false, now)).toThrow(
      "one minute",
    );
  });
  it("records the exact session once and rejects conflicting reuse", () => {
    const data = demoData();
    const task = data.tasks[0];
    const session = freezeFocus({ ...active, taskId: task.id }, true, now);
    const next = applyDemoFocus(data, session, "demo");
    expect(next.tasks.find((t) => t.id === task.id)?.actual_minutes).toBe(task.actual_minutes + 2);
    expect(next.tasks.find((t) => t.id === task.id)?.status).toBe("completed");
    expect(applyDemoFocus(next, session, "demo")).toEqual(next);
    expect(() =>
      applyDemoFocus(next, { ...session, save: { ...session.save!, minutes: 3 } }, "demo"),
    ).toThrow("conflict");
    expect(() => applyDemoFocus(emptyData(), session, "demo")).toThrow("no longer exists");
  });
});
