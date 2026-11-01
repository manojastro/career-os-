import { it, expect } from "vitest";
import { dailyFocusBreakdown } from "./insights";
import { demoData } from "./seed";
import type { Task } from "./types";
const session = (id: string, task_id: string, started_at: string, duration_minutes: number) => ({
  id,
  user_id: "demo",
  created_at: started_at,
  task_id,
  started_at,
  ended_at: started_at,
  duration_minutes,
  note: "",
});
it("lists every focused minute of the owner day in exactly one group", () => {
  const data = demoData();
  const task = (id: string, type: Task["type"]) => ({ ...data.tasks[0], id, title: id, type });
  data.tasks = [task("study", "Learn"), task("build", "Build"), task("mock", "Practice")];
  data.focus_sessions = [
    // 19:00Z is 00:30 on 20 October in Asia/Kolkata, not 19 October.
    session("a", "study", "2026-10-19T19:00:00Z", 30),
    session("b", "build", "2026-10-20T05:00:00Z", 45),
    session("c", "mock", "2026-10-20T06:00:00Z", 20),
    session("d", "deleted-task", "2026-10-20T07:00:00Z", 10),
    session("e", "study", "2026-10-18T05:00:00Z", 99),
  ];
  data.learning_sessions = [
    {
      ...session("legacy", "study", "2026-10-20T08:00:00Z", 0),
      skill_id: null,
      minutes: 15,
      learned: "Graph notes",
      occurred_at: "2026-10-20T08:00:00Z",
    },
    {
      ...session("mirror", "study", "2026-10-20T08:00:00Z", 0),
      skill_id: null,
      minutes: 30,
      learned: "Mirror of a",
      occurred_at: "2026-10-20T08:00:00Z",
      focus_session_id: "a",
    },
  ];
  const day = dailyFocusBreakdown(data, "2026-10-20", "Asia/Kolkata");
  expect(day.learning.map((i) => [i.title, i.minutes])).toEqual([
    ["study", 30],
    ["Graph notes", 15],
  ]);
  expect(day.building.map((i) => i.minutes)).toEqual([45]);
  expect(day.other.map((i) => [i.title, i.type, i.minutes])).toEqual([
    ["mock", "Practice", 20],
    ["Focus session", null, 10],
  ]);
  const listed = [...day.learning, ...day.building, ...day.other].reduce(
    (n, i) => n + i.minutes,
    0,
  );
  expect(day.total).toBe(120);
  expect(listed).toBe(day.total);
});
