import type { AppData } from "@/lib/domain/types";
import { applyWrite, normalizeWrite } from "@/lib/domain/mutations";
export type FocusState = {
  version: 1;
  id: string;
  taskId: string;
  startedAt: string;
  elapsedMs: number;
  runningSince: number | null;
  save?: { endedAt: string; minutes: number; complete: boolean };
};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function elapsedSeconds(state: FocusState, now = Date.now()) {
  return Math.floor(
    (state.elapsedMs + (state.runningSince === null ? 0 : Math.max(0, now - state.runningSince))) /
      1000,
  );
}
export function restoreFocus(
  raw: string | null,
  now = Date.now(),
  demo = false,
): FocusState | null {
  try {
    const s = JSON.parse(raw ?? "null") as FocusState;
    if (
      !s ||
      s.version !== 1 ||
      !uuid.test(s.id) ||
      !(uuid.test(s.taskId) || (demo && /^[A-Za-z0-9_-]{1,100}$/.test(s.taskId))) ||
      !Number.isFinite(Date.parse(s.startedAt)) ||
      Date.parse(s.startedAt) > now ||
      now - Date.parse(s.startedAt) > 86400000 ||
      !Number.isFinite(s.elapsedMs) ||
      s.elapsedMs < 0 ||
      s.elapsedMs > 86400000 ||
      !(
        s.runningSince === null ||
        (Number.isFinite(s.runningSince) &&
          s.runningSince <= now &&
          s.runningSince >= Date.parse(s.startedAt))
      )
    )
      return null;
    if (
      s.save &&
      (!Number.isInteger(s.save.minutes) ||
        s.save.minutes < 1 ||
        s.save.minutes > 600 ||
        typeof s.save.complete !== "boolean" ||
        !Number.isFinite(Date.parse(s.save.endedAt)) ||
        Date.parse(s.save.endedAt) < Date.parse(s.startedAt) ||
        Date.parse(s.save.endedAt) > now ||
        s.runningSince !== null)
    )
      return null;
    if (elapsedSeconds(s, now) > 86400) return null;
    return s;
  } catch {
    return null;
  }
}
export function freezeFocus(state: FocusState, complete: boolean, now = Date.now()): FocusState {
  if (state.save) return state;
  const seconds = elapsedSeconds(state, now),
    minutes = Math.floor(seconds / 60);
  if (minutes > 600)
    throw new Error(
      "This timer exceeds the ten-hour save limit. Pause and review the actual time before recording separate entries.",
    );
  if (minutes < 1)
    throw new Error("Record at least one minute before saving, or discard the timer.");
  return {
    ...state,
    elapsedMs: seconds * 1000,
    runningSince: null,
    save: { endedAt: new Date(now).toISOString(), minutes, complete },
  };
}
/** One immutable browser-storage transaction, using the same stable session identity as hosted RPCs. */
export function applyDemoFocus(
  data: AppData,
  state: FocusState,
  uid: string,
  today?: string,
): AppData {
  if (!state.save) throw new Error("Freeze the save before recording it.");
  const saved = data.focus_sessions.find((s) => s.id === state.id),
    intent = state.save;
  if (saved) {
    if (
      saved.task_id !== state.taskId ||
      saved.duration_minutes !== intent.minutes ||
      saved.started_at !== state.startedAt ||
      saved.ended_at !== intent.endedAt
    )
      throw new Error("Focus session conflict; inspect the existing record before retrying.");
    return data;
  }
  const task = data.tasks.find((t) => t.id === state.taskId && !t.deleted_at);
  if (!task) throw new Error("The focus task no longer exists.");
  const next = {
    ...data,
    focus_sessions: [
      {
        id: state.id,
        user_id: uid,
        created_at: intent.endedAt,
        task_id: task.id,
        started_at: state.startedAt,
        ended_at: intent.endedAt,
        duration_minutes: intent.minutes,
        note: "",
      },
      ...data.focus_sessions,
    ],
  };
  return applyWrite(
    next,
    "tasks",
    normalizeWrite(
      data,
      "tasks",
      {
        ...task,
        actual_minutes: task.actual_minutes + intent.minutes,
        status: intent.complete ? "completed" : "today",
        completed_at: intent.complete ? intent.endedAt : null,
        updated_at: intent.endedAt,
      },
      intent.endedAt,
    ),
    false,
    today,
  );
}
