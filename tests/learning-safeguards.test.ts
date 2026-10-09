import { describe, expect, it } from "vitest";
import { defaultPlan, validateRecommendation } from "../src/lib/learning/engine";
import { fetchGuideText, googleDocId } from "../src/lib/learning/service.server";

describe("learning safeguards", () => {
  it("rejects credentials and published IDs routed to the wrong exporter", () => {
    expect(googleDocId("https://user:secret@docs.google.com/document/d/12345678901234567890/edit")).toBeNull();
  });
  it("rejects a redirect before fetching the disallowed destination", async () => {
    let calls = 0;
    const fetcher = (async (_url: string | URL | Request, options?: RequestInit) => {
      calls++;
      expect(options?.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } });
    }) as typeof fetch;
    await expect(fetchGuideText("https://docs.google.com/document/d/12345678901234567890/edit", fetcher)).rejects.toMatchObject({ code: "redirect_not_allowed" });
    expect(calls).toBe(1);
  });
  it("fits every allowed duration without rounding over the time budget", () => {
    for (let minutes = 15; minutes <= 480; minutes++) {
      const plan = defaultPlan("Python", minutes);
      expect(plan.reduce((sum, step) => sum + step.minutes, 0)).toBe(minutes);
      expect(plan.every((step) => step.minutes > 0)).toBe(true);
    }
  });
  it("requires a real completion criterion rather than treating any plan as completion", () => {
    const result = validateRecommendation({ topic_id: "t", assignment_date: "2026-10-09", plan: [{ step: "Read", minutes: 20 }] }, {
      topics: [{ id: "t", stable_topic_id: "II-1", title: "Python", priority: "MUST", sequence: 1, recommended_minutes: 20, completion_criteria: "", removed_at: null }],
      prereqs: [], baselines: [], assignments: [], date: "2026-10-09", daily_minutes: 30,
    });
    expect(result.errors).toContain("missing_completion_criteria");
  });
});
