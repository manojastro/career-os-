import { AppData } from "../lib/domain/types";
import { localDay, weeklyTime } from "../lib/domain/insights";
import { CommandResult, Proposal } from "./types";

const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return localDay(date); };
const result = (answer: string, proposals: Proposal[] = []): CommandResult => ({ answer, proposals, source: "local" });

export function localCommand(prompt: string, data: AppData): CommandResult {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  if (/neglect|skipped|under.attend/.test(lower)) {
    const week = weeklyTime(data);
    const areas = Object.entries(week.by_type).filter(([, time]) => time.planned > 0 && time.actual < time.planned * 0.5);
    return result(areas.length ? `You planned more time than you recorded for ${areas.map(([name]) => name).join(", ")}. Review those tasks before adding more work.` : "Nothing is clearly neglected this week. Keep recording actual time to make this signal more useful.");
  }

  if (/move.*unfinished.*interview.*tomorrow/.test(lower)) {
    const tasks = data.tasks.filter((task) => task.type === "Interview" && task.status !== "completed").slice(0, 8);
    const proposals: Proposal[] = tasks.map((task) => ({ action: "reschedule_task", task_id: task.id, date: tomorrow(), status: "week" }));
    return result(tasks.length ? `I found ${tasks.length} unfinished interview task${tasks.length === 1 ? "" : "s"} to move to tomorrow. Review the changes below.` : "There are no unfinished interview tasks to move.", proposals);
  }

  if (/plan tomorrow/.test(lower)) {
    const hours = Number(lower.match(/(\d+)\s*hours?/)?.[1] ?? 4);
    let remaining = Math.min(12, Math.max(1, hours)) * 60;
    const tasks = data.tasks.filter((task) => ["week", "backlog", "month"].includes(task.status)).sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
    const chosen = tasks.filter((task) => { if (task.estimated_minutes > remaining) return false; remaining -= task.estimated_minutes; return true; }).slice(0, 8);
    return result(chosen.length ? `I found ${chosen.length} tasks that fit within about ${hours} hours tomorrow. Review the schedule before saving.` : "No open tasks fit that time window. Add or shorten a task first.", chosen.map((task) => ({ action: "reschedule_task", task_id: task.id, date: tomorrow(), status: "week" })));
  }

  if (/^(add|create)\s+/i.test(text)) {
    const title = text.replace(/^(add|create)\s+/i, "").replace(/\s+under\s+(my\s+)?learning backlog$/i, "").replace(/[.!]$/, "").trim();
    if (title.length >= 2) return result(`I can add “${title}” to your backlog. Review the task below.`, [{ action: "create_task", title, type: /follow.?up|contact/i.test(title) ? "Network" : "Learn", status: "backlog" }]);
  }

  if (/completed|finished/.test(lower)) {
    const task = data.tasks.find((item) => item.status !== "completed" && lower.includes(item.title.toLowerCase().slice(0, 10)));
    if (task) {
      const minutes = Number(lower.match(/(\d+)\s*minutes?/)?.[1] ?? 0);
      return result(`I found “${task.title}”. Confirm completion${minutes ? ` and ${minutes} minutes of work` : ""} below.`, [{ action: "complete_task", task_id: task.id, minutes }]);
    }
  }

  if (/what did i learn about/.test(lower)) {
    const subject = lower.split("what did i learn about")[1]?.replace(/[?.]/g, "").trim() ?? "";
    const notes = data.notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(subject)).slice(0, 3);
    const completed = data.tasks.filter((task) => task.status === "completed" && task.title.toLowerCase().includes(subject)).slice(0, 3);
    return result(notes.length || completed.length ? `I found ${notes.length} note${notes.length === 1 ? "" : "s"} and ${completed.length} completed task${completed.length === 1 ? "" : "s"} about ${subject}: ${[...notes.map((note) => note.title), ...completed.map((task) => task.title)].join("; ")}.` : `I could not find recorded learning about ${subject}. Add a note or complete a linked task to build that history.`);
  }

  if (/nearest milestone/.test(lower)) {
    const milestone = data.milestones.filter((item) => item.status !== "completed" && item.due_date).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];
    const goal = data.goals.find((item) => item.id === milestone?.goal_id);
    return result(milestone ? `The nearest milestone is “${milestone.title}” for ${goal?.title ?? "a goal"}, due ${milestone.due_date}.` : "No pending milestone has a due date yet.");
  }

  return result("I can help review neglected work, plan tomorrow, move unfinished interview tasks, add backlog tasks, and find recorded learning. Try one of those commands, or configure an AI provider for broader requests.");
}

