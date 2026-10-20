import { it, expect } from "vitest";
import { demoData } from "./seed";
import { nextOccurrence, recurrenceValue, readRecurrence } from "./recurrence";
import { applyWrite } from "./mutations";
it("requires versioned opt-in, clamps month ends and creates only one successor on completion", () => {
  const data = demoData(),
    task = {
      ...data.tasks[0],
      status: "today" as const,
      scheduled_date: "2026-01-31",
      scheduled_start: null,
      scheduled_end: null,
      recurrence: recurrenceValue("monthly"),
    };
  expect(readRecurrence("daily")).toBeNull();
  expect(nextOccurrence(task, "2026-01-31")).toBe("2026-02-28");
  data.tasks = data.tasks.map((t) => (t.id === task.id ? task : t));
  const completed = applyWrite(
    data,
    "tasks",
    { ...task, status: "completed" },
    false,
    "2026-01-31",
  );
  const parent = completed.tasks.find((t) => t.id === task.id)!;
  expect(parent.repeat_child_id).toBeTruthy();
  const child = completed.tasks.find((t) => t.id === parent.repeat_child_id)!;
  expect(child.actual_minutes).toBe(0);
  expect(child.completed_at).toBeNull();
  expect(child.due_date).toBe("2026-02-28");
  const repeated = applyWrite(
    completed,
    "tasks",
    { ...parent, status: "today" },
    false,
    "2026-01-31",
  );
  const again = applyWrite(
    repeated,
    "tasks",
    { ...parent, status: "completed" },
    false,
    "2026-01-31",
  );
  expect(again.tasks).toHaveLength(completed.tasks.length);
});
