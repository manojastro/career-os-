import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { AppData, EntityMap, EntityName, ENTITY_NAMES, emptyData, Activity } from "./domain/types";
import { demoData } from "./domain/seed";
import { browserSupabase, demoMode, setDemoMode } from "./supabase";
import { applyDemoFocus, type FocusState } from "@/lib/domain/focus";
import { normalizeWrite, applyWrite } from "./domain/mutations";
import { localDay } from "./domain/insights";
import { workspaceWrite } from "./workspace-write";
import { recurrenceValue, type Cadence } from "./domain/recurrence";
import { aiHeaders } from "./ai-headers";

const DEMO_KEY = "career-os-demo-v4";

interface Store {
  timezone: string;
  day: (date?: Date) => string;
  data: AppData;
  loading: boolean;
  error: string | null;
  user: User | null;
  hosted: boolean;
  demo: boolean;
  add: <K extends EntityName>(
    table: K,
    values: Omit<EntityMap[K], "id" | "user_id" | "created_at">,
  ) => Promise<EntityMap[K]>;
  update: <K extends EntityName>(
    table: K,
    id: string,
    values: Partial<EntityMap[K]>,
    options?: { expectedUpdatedAt?: string },
  ) => Promise<void>;
  remove: <K extends EntityName>(table: K, id: string) => Promise<void>;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  resetDemo: () => void;
  enterDemo: () => void;
  exitDemo: () => void;
  signOut: () => Promise<void>;
  recordDemoFocus: (session: FocusState) => Promise<void>;
  recordFocus: (session: FocusState) => Promise<void>;
  setCompleted: (table: EntityName, id: string, complete: boolean) => Promise<void>;
  setRecurrence: (id: string, cadence: Cadence | null) => Promise<void>;
  restore: <K extends EntityName>(table: K, record: EntityMap[K]) => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

function initialDemo(): AppData {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    return saved ? ({ ...emptyData(), ...JSON.parse(saved) } as AppData) : demoData();
  } catch {
    return demoData();
  }
}

function describeChange(
  table: EntityName,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): string | null {
  if (table === "tasks" && !before) return `Created task: ${after["title"]}`;
  if (table === "tasks" && before?.["status"] !== "completed" && after["status"] === "completed")
    return `Completed ${after["title"]}`;
  if (table === "goals" && !before) return `Created goal: ${after["title"]}`;
  if (table === "goals" && before?.["status"] !== after["status"])
    return `Goal ${after["title"]}: ${after["status"]}`;
  if (
    table === "milestones" &&
    before?.["status"] !== "completed" &&
    after["status"] === "completed"
  )
    return `Reached milestone: ${after["title"]}`;
  if (table === "job_applications" && !before)
    return `Saved application: ${after["company"]} · ${after["role"]}`;
  if (table === "job_applications" && before?.["status"] !== after["status"])
    return `${after["company"]}: moved to ${after["status"]}`;
  if (table === "skills" && !before) return `Added skill: ${after["name"]}`;
  if (table === "skills" && before?.["status"] !== after["status"])
    return `${after["name"]}: ${after["status"]}`;
  if (table === "contacts" && !before) return `Added contact: ${after["name"]}`;
  if (table === "interview_practice") return "Practiced an interview question";
  if (table === "network_interactions") return "Recorded a networking interaction";
  if (table === "focus_sessions") return "Finished a focus session";
  if (table === "projects" && !before) return `Created project: ${after["name"]}`;
  if (table === "projects" && before?.["status"] !== after["status"])
    return `${after["name"]}: ${after["status"]}`;
  if (table === "evidence" && !before) return `Added evidence: ${after["title"]}`;
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [demo, setDemo] = useState(false);
  const supabase = useMemo(() => (demo ? null : browserSupabase()), [demo]);
  const refreshGeneration = useRef(0);
  const writeGeneration = useRef(0);

  useEffect(() => {
    setDemo(demoMode());
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const generation = ++refreshGeneration.current;
    const writes = writeGeneration.current;
    const client = demoMode() ? null : browserSupabase();
    if (!client) {
      setData(initialDemo());
      setUser(null);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    const { data: session } = await client.auth.getUser();
    setUser(session.user);
    if (!session.user) {
      setData(emptyData());
      setLoading(false);
      return;
    }
    try {
      const { data: profile } = await client
        .from("learning_preferences")
        .select("timezone")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .maybeSingle();
      const zone = typeof profile?.timezone === "string" ? profile.timezone : "Asia/Kolkata";
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone }).format();
        setTimezone(zone);
      } catch {
        setTimezone("Asia/Kolkata");
      }
      const results = await Promise.all(
        ENTITY_NAMES.map(async (table) => {
          const rows = [];
          let offset = 0;
          while (true) {
            const { data: page, error: queryError } = await client
              .from(table)
              .select("*")
              .is("deleted_at", null)
              .order("id")
              .range(offset, offset + 499);
            if (queryError) throw queryError;
            rows.push(...(page ?? []));
            if (!page || page.length < 500) break;
            offset += 500;
          }
          return [table, rows] as const;
        }),
      );
      if (generation !== refreshGeneration.current || writes !== writeGeneration.current) return;
      setData(Object.fromEntries(results) as unknown as AppData);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        void refresh();
      }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [refresh, supabase]);

  // Shared refresh for agent/Telegram learning changes: on foreground and on subscribed learning rows.
  // Debounced, silent, hosted only; revision polling backs up realtime.
  useEffect(() => {
    const uid = user?.id;
    if (!supabase || !uid) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = 0;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        void refresh({ silent: true });
      }, 800);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 30_000) soon();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("career-os-preferences-changed", soon);
    const channel = supabase
      .channel(`learning-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "learning_assignments",
          filter: `user_id=eq.${uid}`,
        },
        soon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "learning_feedback", filter: `user_id=eq.${uid}` },
        soon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "control_changes", filter: `user_id=eq.${uid}` },
        soon,
      )
      .subscribe();
    let revision: number = 0;
    // Realtime may be disabled by hosting settings. Check a tiny owner-scoped revision
    // while the page is visible so Telegram changes still appear without a reload.
    const revisionTimer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const { data: head, error } = await supabase
        .from("control_changes")
        .select("sequence")
        .eq("user_id", uid)
        .order("sequence", { ascending: false })
        .limit(1);
      if (error) return;
      const next = Number(head?.[0]?.sequence ?? 0);
      if (next !== revision) soon();
      revision = next;
    }, 15000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(revisionTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("career-os-preferences-changed", soon);
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, refresh]);

  useEffect(() => {
    if (demo && !loading) localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  }, [data, demo, loading]);

  const writeActivity = useCallback(
    async (table: EntityName, entityId: string, summary: string) => {
      const activity: Activity = {
        id: crypto.randomUUID(),
        user_id: user?.id ?? "demo",
        created_at: new Date().toISOString(),
        entity_type: table,
        entity_id: entityId,
        action: "updated",
        summary,
        occurred_at: new Date().toISOString(),
        metadata: {},
      };
      if (supabase) {
        const { error: activityError } = await supabase.from("activity_log").insert(activity);
        if (activityError) {
          setError(
            "Your record was saved, but its activity entry could not be written. Do not repeat the saved action.",
          );
          return;
        }
      }
      setData((current) => ({ ...current, activity_log: [activity, ...current.activity_log] }));
    },
    [supabase, user?.id],
  );

  const add = useCallback(
    async <K extends EntityName>(
      table: K,
      values: Omit<EntityMap[K], "id" | "user_id" | "created_at">,
    ): Promise<EntityMap[K]> => {
      if (supabase && !user) throw new Error("Sign in to save changes.");
      let record = normalizeWrite(data, table, {
        ...values,
        id: crypto.randomUUID(),
        user_id: user?.id ?? "demo",
        created_at: new Date().toISOString(),
      } as EntityMap[K]);
      if (supabase) {
        record = (await workspaceWrite(
          supabase,
          user!.id,
          table,
          "create",
          null,
          record as unknown as Record<string, unknown>,
        )) as unknown as EntityMap[K];
      }
      writeGeneration.current++;
      setData((current) =>
        supabase
          ? ({ ...current, [table]: [record, ...current[table]] } as AppData)
          : applyWrite(current, table, record, false, localDay(new Date(), timezone)),
      );
      const summary = describeChange(
        table,
        undefined,
        record as unknown as Record<string, unknown>,
      );
      if (summary && !supabase) await writeActivity(table, record.id, summary);
      if (
        supabase &&
        ["tasks", "planner_blocks", "interview_practice", "network_interactions"].includes(table)
      )
        void refresh({ silent: true });
      return record;
    },
    [data, supabase, user, writeActivity, refresh, timezone],
  );

  const update = useCallback(
    async <K extends EntityName>(
      table: K,
      id: string,
      values: Partial<EntityMap[K]>,
      options?: { expectedUpdatedAt?: string },
    ) => {
      if (supabase && !user) throw new Error("Sign in to save changes.");
      const existing = (data[table] as EntityMap[K][]).find((item) => item.id === id);
      if (!existing) throw new Error("Record no longer exists.");
      let next = normalizeWrite(data, table, {
        ...existing,
        ...values,
        updated_at: new Date().toISOString(),
      } as EntityMap[K]);
      if (supabase) {
        next = (await workspaceWrite(
          supabase,
          user!.id,
          table,
          "update",
          id,
          values as Record<string, unknown>,
          options?.expectedUpdatedAt,
        )) as unknown as EntityMap[K];
      }
      writeGeneration.current++;
      setData((current) =>
        !supabase
          ? applyWrite(current, table, next, false, localDay(new Date(), timezone))
          : ({
              ...current,
              [table]: (current[table] as EntityMap[K][]).map((item) =>
                item.id === id ? next : item,
              ),
            } as AppData),
      );
      const summary = describeChange(
        table,
        existing as unknown as Record<string, unknown>,
        next as unknown as Record<string, unknown>,
      );
      if (summary && !supabase) await writeActivity(table, id, summary);
      if (
        supabase &&
        ["tasks", "planner_blocks", "interview_practice", "network_interactions"].includes(table)
      )
        void refresh({ silent: true });
    },
    [data, supabase, user, writeActivity, refresh, timezone],
  );

  const remove = useCallback(
    async <K extends EntityName>(table: K, id: string) => {
      const deleted_at = new Date().toISOString();
      const existing = (data[table] as EntityMap[K][]).find((r) => r.id === id);
      if (!existing) throw new Error("Record no longer exists.");
      if (supabase) {
        await workspaceWrite(supabase, user!.id, table, "delete", id, {});
      }
      if (!supabase) applyWrite(data, table, existing, true);
      writeGeneration.current++;
      setData((current) =>
        supabase
          ? ({
              ...current,
              [table]: (current[table] as EntityMap[K][]).filter((item) => item.id !== id),
            } as AppData)
          : applyWrite(current, table, existing, true, localDay(new Date(), timezone)),
      );
      if (supabase) void refresh({ silent: true });
    },
    [data, supabase, refresh, timezone, user],
  );

  const resetDemo = () => {
    if (!demo) return;
    const seed = demoData();
    localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
    localStorage.removeItem("career-os-demo-trash-v1");
    localStorage.removeItem("career-os-focus:demo");
    window.dispatchEvent(new Event("career-os-demo-reset"));
    setData(seed);
  };

  const enterDemo = () => {
    setDemoMode(true);
    setDemo(true);
    setUser(null);
    setData(initialDemo());
    setLoading(false);
  };

  const exitDemo = () => {
    setDemoMode(false);
    setDemo(false);
    void refresh();
  };

  const signOut = async () => {
    await browserSupabase()?.auth.signOut();
    setUser(null);
    setData(emptyData());
  };

  const recordDemoFocus = async (session: FocusState) => {
    if (!demo) throw new Error("Use the authenticated focus transaction.");
    const next = applyDemoFocus(data, session, "demo", localDay(new Date(), timezone));
    // Persist the whole transaction before reporting success. A reload cannot observe half a save.
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
    writeGeneration.current++;
    setData(next);
  };
  const restore = async <K extends EntityName>(table: K, record: EntityMap[K]) => {
    if (supabase) {
      if (!user) throw new Error("Sign in first.");
      await workspaceWrite(supabase, user.id, table, "restore", record.id, {}, record.updated_at);
      await refresh({ silent: true });
      return;
    }
    const next = normalizeWrite(data, table, { ...record, deleted_at: null });
    setData((current) => applyWrite(current, table, next, false, localDay(new Date(), timezone)));
  };
  const recordFocus = async (session: FocusState) => {
    if (demo) return recordDemoFocus(session);
    if (!session.save || !user)
      throw new Error("Sign in and preserve the original focus save before retrying.");
    const response = await fetch("/api/learning/focus", {
      method: "POST",
      headers: await aiHeaders(),
      body: JSON.stringify({
        session_id: session.id,
        task_id: session.taskId,
        started_at: session.startedAt,
        ended_at: session.save.endedAt,
        minutes: session.save.minutes,
        complete: session.save.complete,
      }),
    });
    if (!response.ok)
      throw new Error(
        "Focus could not be saved. Retry the same session; it will not be counted twice.",
      );
    await refresh({ silent: true });
  };
  const setCompleted = async (table: EntityName, id: string, complete: boolean) => {
    if (!["task_subtasks", "project_milestones", "followups"].includes(table))
      throw new Error("Use the dedicated completion workflow.");
    if (supabase) {
      if (!user) throw new Error("Sign in first.");
      await workspaceWrite(supabase, user.id, table, "set_completed", id, { completed: complete });
      await refresh({ silent: true });
      return;
    }
    const row = data[table].find((r) => r.id === id);
    if (!row) throw new Error("Record no longer exists.");
    setData((current) =>
      applyWrite(current, table, {
        ...row,
        completed_at: complete ? new Date().toISOString() : null,
      } as EntityMap[typeof table]),
    );
  };
  const setRecurrence = async (id: string, cadence: Cadence | null) => {
    if (supabase) {
      if (!user) throw new Error("Sign in first.");
      await workspaceWrite(supabase, user.id, "tasks", "set_recurrence", id, { cadence });
      await refresh({ silent: true });
      return;
    }
    const task = data.tasks.find((t) => t.id === id);
    if (!task) throw new Error("Task no longer exists.");
    setData((current) =>
      applyWrite(
        current,
        "tasks",
        { ...task, recurrence: recurrenceValue(cadence) },
        false,
        localDay(new Date(), timezone),
      ),
    );
  };

  return (
    <StoreContext.Provider
      value={{
        timezone,
        day: (date) => localDay(date, timezone),
        data,
        loading,
        error,
        user,
        hosted: !demo,
        demo,
        add,
        update,
        remove,
        restore,
        refresh,
        resetDemo,
        enterDemo,
        exitDemo,
        signOut,
        recordDemoFocus,
        recordFocus,
        setCompleted,
        setRecurrence,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
