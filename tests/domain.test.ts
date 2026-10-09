import { describe, expect, it } from "vitest";
import { demoData } from "../src/lib/domain/seed";
import { classifyCapture, goalProgress, searchData, weeklyTime, skillReadiness } from "../src/lib/domain/insights";

describe("career insights", () => {
  it("includes standalone learning time once and excludes timer mirrors", () => {
    const data = demoData();
    const baseline = weeklyTime(data).actual_minutes;
    const occurred_at = new Date().toISOString();
    data.learning_sessions.push({ id: "standalone", user_id: "demo", created_at: occurred_at, task_id: null, skill_id: null, minutes: 12, learned: "notes", occurred_at }, { id: "mirror", user_id: "demo", created_at: occurred_at, task_id: null, skill_id: null, minutes: 55, learned: "timer", occurred_at, focus_session_id: "focus" });
    expect(weeklyTime(data).actual_minutes).toBe(baseline + 12);
  });
  it("derives goal progress from milestones and linked tasks", () => {
    const data = demoData();
    const baseline = goalProgress(data, "goal-rag");
    expect(baseline).toBeGreaterThan(0);
    data.tasks[0].status = "completed";
    expect(goalProgress(data, "goal-rag")).toBeGreaterThan(baseline);
    expect(goalProgress(data, "goal-rag")).toBeLessThan(100);
    data.milestones.filter((m) => m.goal_id === "goal-rag").forEach((m) => { m.status = "completed"; });
    expect(goalProgress(data, "goal-rag")).toBeGreaterThanOrEqual(50);
  });

  it("rolls child goal progress into a parent career goal", () => {
    const data = demoData();
    const baseline = goalProgress(data, "goal-career");
    data.tasks.filter((task) => task.goal_id === "goal-rag").forEach((task) => { task.status = "completed"; });
    expect(goalProgress(data, "goal-career")).toBeGreaterThan(baseline);
  });

  it("does not count future or unscheduled work in this week's plan", () => {
    const data = demoData();
    const current = weeklyTime(data, new Date());
    expect(current.planned_minutes).toBeGreaterThan(0);
    expect(current.actual_minutes).toBe(55);
    data.tasks[0].actual_minutes = 30;
    expect(weeklyTime(data, new Date()).actual_minutes).toBe(85);
  });

  it("counts a focus session even when its task was never scheduled", () => {
    const data = demoData();
    data.tasks[0].scheduled_date = null;
    data.tasks[0].actual_minutes = 25;
    data.focus_sessions.push({ id: "extra-focus", user_id: "demo", created_at: new Date().toISOString(), task_id: data.tasks[0].id, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), duration_minutes: 25, note: "" });
    const week = weeklyTime(data, new Date());
    expect(week.actual_minutes).toBe(80);
    expect(week.by_type.Build.actual).toBe(80);
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
