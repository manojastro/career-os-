"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Check } from "lucide-react";
import { Button, Dialog, minutesLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import { Task } from "@/lib/domain/types";
import { browserSupabase } from "@/lib/supabase";

interface FocusContextValue { start: (task: Task) => void; activeTask: Task | null; }
const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { add, update, data, hosted, user, refresh, learningReady } = useStore();
  const pendingSave = useRef<{ session_id: string; started_at: string; ended_at: string; minutes: number; complete: boolean } | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [error, setError] = useState("");
  const activeTask = data.tasks.find((task) => task.id === taskId) ?? null;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const start = (task: Task) => {
    pendingSave.current = null;
    setSavePending(false);
    setTaskId(task.id);
    setStartedAt(new Date().toISOString());
    setSeconds(0);
    setRunning(true);
    setError("");
    if (task.status !== "doing") void update("tasks", task.id, { status: "doing" });
  };

  const stop = async (complete: boolean) => {
    if (!activeTask || !startedAt || saving) return;
    setSaving(true);
    setRunning(false);
    const duration = Math.max(1, Math.round(seconds / 60));
    try {
      if (hosted && learningReady) {
        if (!user) throw new Error("Sign in to save this session.");
        pendingSave.current ??= { session_id: crypto.randomUUID(), started_at: startedAt, ended_at: new Date().toISOString(), minutes: duration, complete };
        const session = pendingSave.current;
        setSavePending(true);
        const { error: saveError } = await browserSupabase()!.rpc("learning_record_focus", {
          p_user_id: user.id, p_task_id: activeTask.id, p_session_id: session.session_id,
          p_started_at: session.started_at, p_ended_at: session.ended_at,
          p_minutes: session.minutes, p_complete: session.complete,
        });
        if (saveError) throw new Error("Could not save the focus session. Retry uses the same session identity and duration.");
        await refresh();
      } else {
        await add("focus_sessions", { task_id: activeTask.id, started_at: startedAt, ended_at: new Date().toISOString(), duration_minutes: duration, note: "" });
        await update("tasks", activeTask.id, {
          actual_minutes: activeTask.actual_minutes + duration,
          status: complete ? "completed" : "today",
          completed_at: complete ? new Date().toISOString() : null,
        });
      }
      pendingSave.current = null;
      setSavePending(false);
      setTaskId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the focus session.");
    } finally {
      setSaving(false);
    }
  };

  return <FocusContext.Provider value={{ start, activeTask }}>
    {children}
    {activeTask && <Dialog title="Focus session" onClose={() => { if (!saving) void stop(false); }}>
      <div className="small muted">{activeTask.type}{activeTask.project_id ? ` · ${data.projects.find((p) => p.id === activeTask.project_id)?.name ?? "Project"}` : ""}</div>
      <h3 style={{ fontSize: 19, margin: "8px 0 18px" }}>{activeTask.title}</h3>
      <div className="row-between" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "18px 0" }}><div><div className="small muted">Elapsed</div><strong style={{ fontSize: 30, fontVariantNumeric: "tabular-nums" }}>{String(Math.floor(seconds / 3600)).padStart(2, "0")}:{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong></div><div className="small muted">Target<br /><strong style={{ color: "var(--text)", fontSize: 17 }}>{minutesLabel(activeTask.estimated_minutes)}</strong></div></div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions" style={{ justifyContent: "space-between" }}><Button disabled={saving || savePending} onClick={() => setRunning(!running)}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause" : "Resume"}</Button><div className="row"><Button disabled={saving} onClick={() => void stop(false)}><Square size={14} />Stop & save</Button><Button variant="primary" disabled={saving} onClick={() => void stop(true)}><Check size={15} />Complete task</Button></div></div>
    </Dialog>}
  </FocusContext.Provider>;
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) throw new Error("useFocus must be inside FocusProvider");
  return context;
}
