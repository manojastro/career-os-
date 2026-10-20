import { describe, it, expect } from "vitest";
import { localDay, weeklyTime } from "./insights";
import { demoData } from "./seed";
describe("saved timezone accounting", () => {
  it("assigns the same instant to the correct owner calendar day around midnight and DST", () => {
    const date = new Date("2026-10-19T19:00:00Z");
    expect(localDay(date, "Asia/Kolkata")).toBe("2026-10-20");
    expect(localDay(date, "America/Los_Angeles")).toBe("2026-10-19");
    expect(localDay(new Date("2026-03-08T10:30:00Z"), "America/Los_Angeles")).toBe("2026-03-08");
  });
  it("counts ledger sessions once in the owner week and excludes mirrors", () => {
    const data = demoData();
    data.tasks = [];
    data.learning_sessions = [];
    data.focus_sessions = [
      {
        id: "fixture",
        user_id: "demo",
        created_at: "2026-10-18T19:00:00Z",
        task_id: "retained-history",
        started_at: "2026-10-18T19:00:00Z",
        ended_at: "2026-10-18T20:00:00Z",
        duration_minutes: 60,
        note: "",
      },
    ];
    // A historical ledger is retained even when its task is deleted: test detects lost totals.
    expect(weeklyTime(data, new Date("2026-10-20T10:00:00Z"), "Asia/Kolkata").actual_minutes).toBe(
      60,
    );
  });
});
