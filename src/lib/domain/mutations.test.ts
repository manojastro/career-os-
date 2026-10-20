import { describe, it, expect } from "vitest";
import { demoData } from "./seed";
import { normalizeWrite, applyWrite } from "./mutations";
describe("shared browser workspace invariants", () => {
  it("does not reinsert a removed parent while detaching self-referential optional links", () => {
    const data = demoData(),
      parent = { ...data.goals[0], id: crypto.randomUUID(), parent_goal_id: null },
      child = { ...data.goals[0], id: crypto.randomUUID(), parent_goal_id: parent.id };
    data.goals.push(parent, child);
    const next = applyWrite(data, "goals", parent, true);
    expect(next.goals.some((g) => g.id === parent.id)).toBe(false);
    expect(next.goals.find((g) => g.id === child.id)?.parent_goal_id).toBeNull();
  });
  it("timestamps completion and clears it on reopening through any editor", () => {
    const data = demoData(),
      task = data.tasks[0];
    const completed = normalizeWrite(
      data,
      "tasks",
      { ...task, status: "completed" },
      "2026-10-20T10:00:00Z",
    );
    expect(completed.completed_at).toBe("2026-10-20T10:00:00Z");
    const reopened = normalizeWrite(
      data,
      "tasks",
      { ...completed, status: "today" },
      "2026-10-20T11:00:00Z",
    );
    expect(reopened.completed_at).toBeNull();
  });
  it("rejects normalized duplicate skills without deleting or merging them", () => {
    const data = demoData(),
      skill = data.skills[0];
    expect(() =>
      normalizeWrite(data, "skills", {
        ...skill,
        id: crypto.randomUUID(),
        name: " " + skill.name.toUpperCase() + " ",
      }),
    ).toThrow("already exists");
    expect(normalizeWrite(data, "skills", { ...skill, category: "Distinct update" }).id).toBe(
      skill.id,
    );
  });
  it("moves and unschedules linked planner blocks while retaining standalone blocks", () => {
    const data = demoData(),
      task = data.tasks[0];
    const block = {
      id: crypto.randomUUID(),
      user_id: "demo",
      created_at: new Date().toISOString(),
      task_id: task.id,
      title: task.title,
      block_date: "2026-10-20",
      start_time: "08:30",
      end_time: "09:30",
    };
    data.planner_blocks = [block, { ...block, id: crypto.randomUUID(), task_id: null }];
    const moved = applyWrite(data, "tasks", {
      ...task,
      scheduled_date: "2026-10-21",
      scheduled_start: "08:30",
      scheduled_end: "09:30",
    });
    expect(moved.planner_blocks.find((b) => b.id === block.id)?.block_date).toBe("2026-10-21");
    const cleared = applyWrite(moved, "tasks", {
      ...task,
      scheduled_date: null,
      scheduled_start: null,
      scheduled_end: null,
    });
    expect(cleared.planner_blocks).toHaveLength(1);
    expect(cleared.planner_blocks[0].task_id).toBeNull();
  });
  it("updates planner-linked tasks and derives practice counts from actual rows", () => {
    const data = demoData(),
      task = data.tasks[0],
      q = data.interview_questions[0];
    const next = applyWrite(data, "planner_blocks", {
      id: crypto.randomUUID(),
      user_id: "demo",
      created_at: new Date().toISOString(),
      task_id: task.id,
      title: task.title,
      block_date: "2026-10-20",
      start_time: "08:30",
      end_time: "09:30",
    });
    expect(next.tasks.find((t) => t.id === task.id)?.scheduled_start).toBe("08:30");
    const practiced = applyWrite(next, "interview_practice", {
      id: crypto.randomUUID(),
      user_id: "demo",
      created_at: new Date().toISOString(),
      question_id: q.id,
      practiced_at: "2026-10-20T10:00:00Z",
      confidence: 3,
      notes: "",
    });
    expect(practiced.interview_questions.find((i) => i.id === q.id)?.practice_count).toBe(
      practiced.interview_practice.filter((p) => p.question_id === q.id).length,
    );
  });
});
