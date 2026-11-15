import { it, expect } from "vitest";
import { jobSearchStats } from "./jobStats";
import { demoData } from "./seed";
import type { JobApplication } from "./types";
it("measures the search from current stages, applied dates and recorded interviews", () => {
  const data = demoData();
  const base = data.job_applications[0];
  const app = (id: string, status: JobApplication["status"], extra: Partial<JobApplication> = {}) =>
    ({
      ...base,
      id,
      company: "Co " + id,
      role: "Role",
      status,
      date_applied: null,
      followup_date: null,
      ...extra,
    }) as JobApplication;
  data.job_applications = [
    app("saved", "Saved"),
    app("stale", "Applied", { date_applied: "2026-10-10" }),
    app("fresh", "Applied", { date_applied: "2026-11-02", followup_date: "2026-11-01" }),
    app("screen", "Screening", { date_applied: "2026-10-20" }),
    app("rejected", "Rejected", { date_applied: "2026-10-01" }),
    // Rejected later in the loop, but a recorded interview still counts as reaching interviews.
    app("rejected_after_interview", "Rejected", { date_applied: "2026-10-05" }),
    app("offer", "Offer", { date_applied: "2026-09-20" }),
    app("withdrawn", "Withdrawn"),
  ];
  data.job_interviews = [
    { id: "i1", user_id: "demo", created_at: "x", application_id: "rejected_after_interview" },
  ];
  const stats = jobSearchStats(data, "2026-11-04");
  expect(stats.byStage.Applied).toBe(2);
  expect(stats.active).toBe(4);
  expect(stats.applied).toBe(6);
  expect(stats.responded).toBe(4);
  expect(stats.interviewed).toBe(3);
  expect(stats.offers).toBe(1);
  expect(stats.responseRate).toBeCloseTo(4 / 6);
  expect(stats.interviewRate).toBeCloseTo(3 / 6);
  expect(stats.appliedThisWeek).toBe(1);
  expect(stats.waiting.map((w) => [w.id, w.days])).toEqual([["stale", 25]]);
  expect(stats.followupsDue.map((f) => f.id)).toEqual(["fresh"]);
  expect(jobSearchStats({ ...data, job_applications: [] }, "2026-11-04").responseRate).toBeNull();
});
