import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Check } from "lucide-react";
import { Button, Dialog, minutesLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/domain/types";
import { aiHeaders } from "@/lib/ai-headers";
import { elapsedSeconds, restoreFocus, freezeFocus, type FocusState } from "@/lib/domain/focus";

interface FocusContextValue {
  start: (task: Task) => void;
  activeTask: Task | null;
}
const FocusContext = createContext<FocusContextValue | null>(null);
export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { data, demo, user, loading, update, recordFocus } = useStore();
  const key = demo ? "career-os-focus:demo" : user ? "career-os-focus:" + user.id : null;
  const [session, setSession] = useState<FocusState | null>(null),
    [clock, setClock] = useState(Date.now),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef<FocusState | null>(null),
    savingRef = useRef(false),
    scope = useRef<string | null>(null);
  const activeTask = data.tasks.find((t) => t.id === session?.taskId) ?? null;
  useEffect(() => {
    const reset = () => {
      if (demo) {
        current.current = null;
        setSession(null);
        setError("");
      }
    };
    window.addEventListener("career-os-demo-reset", reset);
    return () => window.removeEventListener("career-os-demo-reset", reset);
  }, [demo]);
  const persist = (next: FocusState | null) => {
    const existing = key ? restoreFocus(localStorage.getItem(key), Date.now(), demo) : null;
    if (next && existing && existing.id !== next.id)
      throw new Error("Another tab has an active Focus session. Finish or discard it there first.");
    // Write synchronously so a reload during a save retains its exact request payload.
    if (key) {
      if (next) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
    }
    current.current = next;
    setSession(next);
    setClock(Date.now());
  };
  useEffect(() => {
    if (loading || key === scope.current) return;
    scope.current = key;
    let restored: FocusState | null = null;
    try {
      const raw = key ? localStorage.getItem(key) : null;
      restored = restoreFocus(raw, Date.now(), demo);
      if (raw && !restored) {
        if (key) localStorage.removeItem(key);
        setError("An expired or invalid timer was not recorded. Review your saved Focus history.");
      }
    } catch {
      setError("Timer recovery storage is unavailable.");
    }
    current.current = restored;
    setSession(restored);
    setClock(Date.now());
  }, [key, loading, demo]);
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== key) return;
      const next = restoreFocus(event.newValue, Date.now(), demo);
      current.current = next;
      setSession(next);
      setClock(Date.now());
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [key, demo]);
  useEffect(() => {
    if (!session?.runningSince) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session?.runningSince]);
  const start = (task: Task) => {
    if (current.current) {
      setError("Finish or discard the current Focus session before starting another.");
      return;
    }
    try {
      persist({
        version: 1,
        id: crypto.randomUUID(),
        taskId: task.id,
        startedAt: new Date().toISOString(),
        elapsedMs: 0,
        runningSince: Date.now(),
      });
      setError("");
      if (task.status !== "doing")
        void update("tasks", task.id, { status: "doing" }).catch(() =>
          setError("Timer started, but the task stage could not be saved."),
        );
    } catch {
      setError("Cannot safely persist this timer. Check browser storage before starting.");
    }
  };
  const stop = async (complete: boolean) => {
    if (!activeTask || !current.current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const frozen = freezeFocus(current.current, complete);
      persist(frozen);
      await recordFocus(frozen);
      persist(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this session.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const pause = () => {
    if (!current.current || current.current.save) return;
    try {
      const s = current.current;
      persist({
        ...s,
        elapsedMs: elapsedSeconds(s) * 1000,
        runningSince: s.runningSince === null ? Date.now() : null,
      });
    } catch {
      setError("Could not persist the timer state.");
    }
  };
  const discard = () => {
    if (savingRef.current) return;
    if (window.confirm("Discard this unsaved timer? No Focus minutes will be recorded.")) {
      try {
        persist(null);
        setError("");
      } catch {
        setError("Could not discard the timer.");
      }
    }
  };
  const seconds = session ? elapsedSeconds(session, clock) : 0;
  return (
    <FocusContext.Provider value={{ start, activeTask }}>
      {children}
      {error && !session && (
        <div role="alert" className="alert">
          {error}
        </div>
      )}
      {session && (
        <Dialog
          title="Focus session"
          onClose={() => {
            if (!saving) void stop(false);
          }}
        >
          <h3>{activeTask?.title ?? "This task is unavailable. No time has been recorded."}</h3>
          <div className="row-between">
            <span className="muted">Elapsed</span>
            <strong style={{ fontSize: 30, fontVariantNumeric: "tabular-nums" }}>
              {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
              {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </strong>
          </div>
          {activeTask && (
            <p className="small muted">
              Target: {minutesLabel(activeTask.estimated_minutes)}. Whole elapsed minutes are
              recorded.
            </p>
          )}
          {session.save && (
            <p className="small">
              Save pending. Its original time and completion choice are preserved for retries.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button disabled={saving || !!session.save} onClick={pause}>
              {session.runningSince !== null ? <Pause size={15} /> : <Play size={15} />}
              {session.runningSince !== null ? "Pause" : "Resume"}
            </Button>
            <Button disabled={saving || !activeTask} onClick={() => void stop(false)}>
              <Square size={14} />
              {session.save ? "Retry save" : "Stop & save"}
            </Button>
            <Button
              variant="primary"
              disabled={saving || !activeTask || !!session.save}
              onClick={() => void stop(true)}
            >
              <Check size={14} />
              Complete task
            </Button>
            <Button variant="danger" disabled={saving} onClick={discard}>
              Discard timer
            </Button>
          </div>
        </Dialog>
      )}
    </FocusContext.Provider>
  );
}
export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) throw new Error("useFocus must be inside FocusProvider");
  return context;
}
