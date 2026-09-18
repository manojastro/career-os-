import { AppData, EntityName, Skill } from "./types";

const day = (value: string | null | undefined) => value?.slice(0, 10) ?? "";
const instantDay = (value: string | null | undefined) => value ? localDay(new Date(value)) : "";

export function localDay(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function mondayOf(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return localDay(result);
}

export function goalProgress(data: AppData, goalId: string): number {
  return goalProgressWithAncestors(data, goalId, new Set());
}

function goalProgressWithAncestors(data: AppData, goalId: string, seen: Set<string>): number {
  if (seen.has(goalId)) return 0;
  const nextSeen = new Set(seen).add(goalId);
  const milestones = data.milestones.filter((item) => item.goal_id === goalId);
  const tasks = data.tasks.filter((item) => item.goal_id === goalId && !item.deleted_at);
  const milestoneScore = milestones.map((item) => item.status === "completed" ? 1 : 0);
  const taskScore = tasks.map((item) => item.status === "completed" ? 1 : 0);
  const childScores = data.goals.filter((item) => item.parent_goal_id === goalId && !item.deleted_at).map((item) => goalProgressWithAncestors(data, item.id, nextSeen) / 100);
  const scores = [...milestoneScore, ...taskScore, ...childScores];
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce<number>((total, score) => total + score, 0) / scores.length) * 100);
}

export function projectProgress(data: AppData, projectId: string): number {
  const tasks = data.tasks.filter((item) => item.project_id === projectId && !item.deleted_at);
  if (!tasks.length) return 0;
  return Math.round(tasks.filter((item) => item.status === "completed").length / tasks.length * 100);
}

export function skillReadiness(skill: Skill) {
  return [skill.knowledge, skill.hands_on, skill.project_proof, skill.production, skill.interview].map((value) => Math.max(0, Math.min(4, value)));
}

export function weeklyTime(data: AppData, date = new Date()) {
  const start = mondayOf(date);
  const endDate = new Date(`${start}T12:00:00`);
  endDate.setDate(endDate.getDate() + 7);
  const end = localDay(endDate);
  const scheduledTasks = data.tasks.filter((task) => {
    const scheduled = day(task.scheduled_date);
    return !task.deleted_at && scheduled >= start && scheduled < end;
  });
  const sessions = data.focus_sessions.filter((session) => !session.deleted_at && instantDay(session.started_at) >= start && instantDay(session.started_at) < end);
  const taskIds = new Set([...scheduledTasks.map((task) => task.id), ...sessions.map((session) => session.task_id)]);
  const tasks = data.tasks.filter((task) => taskIds.has(task.id) && !task.deleted_at);
  const actualFor = (taskId: string) => {
    const focused = sessions.filter((session) => session.task_id === taskId).reduce((sum, session) => sum + session.duration_minutes, 0);
    const hasAnySession = data.focus_sessions.some((session) => session.task_id === taskId);
    return hasAnySession ? focused : scheduledTasks.find((task) => task.id === taskId)?.actual_minutes ?? 0;
  };
  return {
    start,
    end,
    planned_minutes: scheduledTasks.reduce((total, task) => total + task.estimated_minutes, 0),
    actual_minutes: tasks.reduce((total, task) => total + actualFor(task.id), 0),
    completed: data.tasks.filter((task) => task.status === "completed" && instantDay(task.completed_at) >= start && instantDay(task.completed_at) < end).length,
    by_type: Object.fromEntries([...new Set(tasks.map((task) => task.type))].map((type) => [type, {
      planned: scheduledTasks.filter((task) => task.type === type).reduce((sum, task) => sum + task.estimated_minutes, 0),
      actual: tasks.filter((task) => task.type === type).reduce((sum, task) => sum + actualFor(task.id), 0),
    }])) as Record<string, { planned: number; actual: number }>,
  };
}

export function todayTasks(data: AppData, date = localDay()) {
  return data.tasks.filter((task) => !task.deleted_at && task.status !== "completed" && (task.status === "today" || task.scheduled_date === date))
    .sort((a, b) => a.sort_order - b.sort_order || Number(b.priority === "high") - Number(a.priority === "high"));
}

export function overdueTasks(data: AppData, date = localDay()) {
  return data.tasks.filter((task) => !task.deleted_at && task.status !== "completed" && !!task.due_date && task.due_date < date);
}

export function classifyCapture(value: string): "resource" | "task" | "note" {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return "resource";
  if (/^(follow up|learn|build|practice|review|implement|apply|contact|prepare|write|create|finish|watch)\b/i.test(text)) return "task";
  return "note";
}

const SEARCH_FIELDS: Partial<Record<EntityName, string[]>> = {
  tasks: ["title", "description"], goals: ["title", "description"], milestones: ["title"],
  skills: ["name", "category"], skill_topics: ["title"], projects: ["name", "description"],
  contacts: ["name", "company", "role"], interview_questions: ["question", "answer"],
  job_applications: ["company", "role", "job_description"], notes: ["title", "content"],
  resources: ["title", "url"], evidence: ["title", "description"],
};

export interface SearchGroup {
  entity: EntityName;
  items: { id: string; label: string }[];
}

export function searchData(data: AppData, query: string): SearchGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return (Object.keys(SEARCH_FIELDS) as EntityName[]).map((entity) => {
    const fields = SEARCH_FIELDS[entity] ?? [];
    const items = (data[entity] as unknown as Record<string, unknown>[])
      .filter((item) => !item.deleted_at && fields.some((field) => String(item[field] ?? "").toLowerCase().includes(needle)))
      .slice(0, 6)
      .map((item) => ({ id: String(item.id), label: String(item[fields[0]] ?? "") }));
    return { entity, items };
  }).filter((group) => group.items.length > 0);
}
