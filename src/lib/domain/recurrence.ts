import type { Task } from "./types";
export type Cadence = "daily" | "weekly" | "monthly";
export function readRecurrence(value: string | null | undefined): Cadence | null {
  try {
    const cfg = JSON.parse(value ?? "null");
    return cfg?.version === 1 &&
      cfg.enabled === true &&
      ["daily", "weekly", "monthly"].includes(cfg.cadence)
      ? cfg.cadence
      : null;
  } catch {
    return null;
  }
}
export const recurrenceValue = (cadence: Cadence | null) =>
  cadence ? JSON.stringify({ version: 1, enabled: true, cadence }) : null;
export function nextOccurrence(task: Task, today: string): string | null {
  const cadence = readRecurrence(task.recurrence);
  if (!cadence) return null;
  const base = [task.scheduled_date ?? task.due_date ?? today, today].sort().at(-1)!;
  const date = new Date(base + "T12:00:00Z");
  if (cadence === "monthly") {
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 12)),
      last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0, 12)).getUTCDate();
    next.setUTCDate(Math.min(date.getUTCDate(), last));
    return next.toISOString().slice(0, 10);
  }
  date.setUTCDate(date.getUTCDate() + (cadence === "weekly" ? 7 : 1));
  return date.toISOString().slice(0, 10);
}
