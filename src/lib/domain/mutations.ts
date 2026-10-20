import type { AppData, EntityMap, EntityName, Task, PlannerBlock } from "./types";
import registry from "@/lib/control/registry.json";
import { nextOccurrence } from "./recurrence";
import { localDay } from "./insights";
type Definition = {
  writable: boolean;
  fields: Record<string, { references?: string; nullable: boolean }>;
};
const definitions = registry as unknown as Record<string, Definition>;

/** Same lifecycle rules as the reviewed DB triggers; no timestamps inferred from unrelated actions. */
export function normalizeWrite<K extends EntityName>(
  data: AppData,
  table: K,
  record: EntityMap[K],
  now = new Date().toISOString(),
): EntityMap[K] {
  const next = { ...record };
  if (table === "task_dependencies") {
    const edge = next as EntityMap["task_dependencies"],
      seen = new Set<string>(),
      pending = [edge.depends_on_id];
    while (pending.length) {
      const id = pending.pop()!;
      if (id === edge.task_id) throw new Error("Task dependencies cannot contain a cycle.");
      if (seen.has(id)) continue;
      seen.add(id);
      for (const d of data.task_dependencies)
        if (d.id !== edge.id && !d.deleted_at && d.task_id === id) pending.push(d.depends_on_id);
    }
  }
  for (const [field, definition] of Object.entries(definitions[table]?.fields ?? {})) {
    const value = (next as unknown as Record<string, unknown>)[field];
    if (value && definition.references && definition.references in data) {
      const rows = data[definition.references as EntityName];
      if (!rows.some((r) => r.id === value && !r.deleted_at))
        throw new Error("Linked " + field.replaceAll("_", " ") + " no longer exists.");
    }
  }
  if (table === "tasks") {
    const task = next as Task;
    task.actual_minutes ??= 0;
    task.sort_order ??= data.tasks.length + 1;
    task.tags ??= [];
    if (task.status === "completed") {
      if (
        data.task_dependencies.some(
          (d) =>
            d.task_id === task.id &&
            data.tasks.some((t) => t.id === d.depends_on_id && t.status !== "completed"),
        )
      )
        throw new Error("Complete the prerequisite tasks first.");
      if (
        task.evidence_required &&
        !data.evidence.some(
          (e) =>
            (!!task.project_id && e.project_id === task.project_id) ||
            (!!task.skill_id && e.skill_id === task.skill_id) ||
            (!!task.goal_id && e.goal_id === task.goal_id),
        )
      )
        throw new Error("Add linked evidence before completing this task.");
    }
    task.completed_at = task.status === "completed" ? (task.completed_at ?? now) : null;
    if (!task.scheduled_date) {
      task.scheduled_start = null;
      task.scheduled_end = null;
    }
    if (task.scheduled_start && (!task.scheduled_end || task.scheduled_end <= task.scheduled_start))
      throw new Error("End time must be after start time on the scheduled day.");
  }
  if (table === "skills") {
    const skill = next as EntityMap["skills"];
    skill.name = skill.name.trim();
    if (!skill.name) throw new Error("Enter a skill name.");
    if (
      data.skills.some(
        (s) =>
          s.id !== skill.id &&
          !s.deleted_at &&
          s.name.trim().toLocaleLowerCase() === skill.name.toLocaleLowerCase(),
      )
    )
      throw new Error("That skill already exists. Edit the existing skill instead.");
  }
  if (table === "planner_blocks") {
    const block = next as PlannerBlock;
    block.start_time = block.start_time.slice(0, 5);
    block.end_time = block.end_time.slice(0, 5);
    if (
      !block.block_date ||
      !/^\d{2}:\d{2}$/.test(block.start_time) ||
      block.end_time <= block.start_time
    )
      throw new Error("Enter a valid day and an end time after start time.");
  }
  if (table === "job_applications") {
    const application = next as EntityMap["job_applications"];
    if (application.status === "Applied" && !application.date_applied)
      application.date_applied = now.slice(0, 10);
  }
  return next;
}
/** Immutable local transaction. Hosted callers re-read authoritative database-trigger results. */
export function applyWrite<K extends EntityName>(
  data: AppData,
  table: K,
  record: EntityMap[K],
  remove = false,
  today = localDay(),
): AppData {
  const previous = (data[table] as EntityMap[K][]).find((r) => r.id === record.id);
  const rows = remove
    ? (data[table] as EntityMap[K][]).filter((r) => r.id !== record.id)
    : previous
      ? (data[table] as EntityMap[K][]).map((r) => (r.id === record.id ? record : r))
      : [record, ...data[table]];
  let next = { ...data, [table]: rows } as AppData;
  if (remove) {
    // Match hosted ownership/cascade safety: required children must be removed first in demo.
    for (const [child, definition] of Object.entries(definitions)) {
      if (!definition.writable) continue;
      if (!(child in data)) continue;
      for (const [field, link] of Object.entries(definition.fields)) {
        if (link.references !== table) continue;
        const children = next[child as EntityName] as unknown as Record<string, unknown>[];
        if (!link.nullable && children.some((r) => r[field] === record.id))
          throw new Error("Delete linked " + child.replaceAll("_", " ") + " first.");
        next = {
          ...next,
          [child]: children.map((r) => (r[field] === record.id ? { ...r, [field]: null } : r)),
        };
      }
    }
    next = {
      ...next,
      notes: next.notes.map((n) =>
        n.entity_type === table && n.entity_id === record.id
          ? { ...n, entity_id: null, entity_type: null }
          : n,
      ),
    };
  }
  if (table === "tasks") {
    const task = record as Task,
      blocks = next.planner_blocks.filter((b) => b.task_id === task.id);
    if (
      !remove &&
      task.status === "completed" &&
      (previous as Task | undefined)?.status !== "completed" &&
      !task.repeat_child_id
    ) {
      const date = nextOccurrence(task, today);
      if (date) {
        const child: Task = {
          ...task,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "backlog",
          actual_minutes: 0,
          completed_at: null,
          repeat_child_id: null,
          due_date: date,
          scheduled_date: task.scheduled_date ? date : null,
        };
        next = applyWrite(next, "tasks", child, false, today);
        next = {
          ...next,
          tasks: next.tasks.map((t) =>
            t.id === task.id ? { ...t, repeat_child_id: child.id } : t,
          ),
        };
      }
    }
    if (remove || !task.scheduled_date || !task.scheduled_start || !task.scheduled_end)
      next = { ...next, planner_blocks: next.planner_blocks.filter((b) => b.task_id !== task.id) };
    else {
      const values = {
        task_id: task.id,
        user_id: task.user_id,
        title: task.title,
        block_date: task.scheduled_date,
        start_time: task.scheduled_start,
        end_time: task.scheduled_end,
      };
      next = {
        ...next,
        planner_blocks: blocks.length
          ? next.planner_blocks.map((b) => (b.task_id === task.id ? { ...b, ...values } : b))
          : [
              ...next.planner_blocks,
              { ...values, id: crypto.randomUUID(), created_at: new Date().toISOString() },
            ],
      };
    }
  }
  if (table === "planner_blocks") {
    const block = record as PlannerBlock,
      old = previous as PlannerBlock | undefined;
    next = {
      ...next,
      tasks: next.tasks.map((t) => {
        if (t.id === old?.task_id && (remove || old.task_id !== block.task_id))
          return { ...t, scheduled_date: null, scheduled_start: null, scheduled_end: null };
        return !remove && t.id === block.task_id
          ? {
              ...t,
              scheduled_date: block.block_date,
              scheduled_start: block.start_time,
              scheduled_end: block.end_time,
            }
          : t;
      }),
    };
  }
  if (table === "interview_practice")
    next = {
      ...next,
      interview_questions: next.interview_questions.map((q) => {
        const entries = next.interview_practice
          .filter((p) => p.question_id === q.id && !p.deleted_at)
          .sort((a, b) => b.practiced_at.localeCompare(a.practiced_at));
        return {
          ...q,
          practice_count: entries.length,
          last_practiced: entries[0]?.practiced_at ?? null,
        };
      }),
    };
  if (table === "network_interactions")
    next = {
      ...next,
      contacts: next.contacts.map((c) => {
        const entries = next.network_interactions
          .filter((i) => i.contact_id === c.id && !i.deleted_at)
          .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
        return { ...c, last_interaction: entries[0]?.occurred_at.slice(0, 10) ?? null };
      }),
    };
  return next;
}
