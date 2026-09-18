import { describe, expect, it } from "vitest";
import { demoData } from "../src/lib/domain/seed";
import { classifyCapture, goalProgress, searchData, weeklyTime, skillReadiness } from "../src/lib/domain/insights";

describe("career insights", () => {
  it("derives goal progress from milestones and linked tasks", () => {
    const data = demoData();
    expect(goalProgress(data, "goal-rag")).toBe(0);
    data.tasks[0].status = "completed";
    expect(goalProgress(data, "goal-rag")).toBeGreaterThan(0);
    expect(goalProgress(data, "goal-rag")).toBeLessThan(100);
    data.milestones.filter((m) => m.goal_id === "goal-rag").forEach((m) => { m.status = "completed"; });
    expect(goalProgress(data, "goal-rag")).toBeGreaterThanOrEqual(50);
  });

  it("does not count future or unscheduled work in this week's plan", () => {
    const data = demoData();
    const current = weeklyTime(data, new Date());
    expect(current.planned_minutes).toBeGreaterThan(0);
    expect(current.actual_minutes).toBe(0);
    data.tasks[0].actual_minutes = 30;
    expect(weeklyTime(data, new Date()).actual_minutes).toBe(30);
  });

  it("shows readiness dimensions without a false exact percentage", () => {
    const data = demoData();
    const rag = data.skills.find((s) => s.name === "RAG")!;
    expect(skillReadiness(rag)).toEqual([4, 3, 3, 2, 2]);
  });

  it("classifies a URL as a resource and follow-up language as a task proposal", () => {
    expect(classifyCapture("https://example.com/article")).toBe("resource");
    expect(classifyCapture("Follow up with Rahul next Friday")).toBe("task");
  });

  it("searches entity text with grouped results", () => {
    const results = searchData(demoData(), "rag");
    expect(results.some((group) => group.entity === "skills" && group.items.length > 0)).toBe(true);
    expect(results.some((group) => group.entity === "projects" && group.items.length > 0)).toBe(true);
  });
});
