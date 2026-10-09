import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppData, EntityMap, EntityName, ENTITY_NAMES, emptyData, Activity } from "./domain/types";
import { demoData } from "./domain/seed";
import { browserSupabase, demoMode, setDemoMode } from "./supabase";

const DEMO_KEY = "career-os-demo-v4";

interface Store {
  data: AppData;
  loading: boolean;
  error: string | null;
  user: User | null;
  hosted: boolean;
  demo: boolean;
  add: <K extends EntityName>(table: K, values: Omit<EntityMap[K], "id" | "user_id" | "created_at">) => Promise<EntityMap[K]>;
  update: <K extends EntityName>(table: K, id: string, values: Partial<EntityMap[K]>) => Promise<void>;
  remove: <K extends EntityName>(table: K, id: string) => Promise<void>;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  resetDemo: () => void;
  enterDemo: () => void;
  exitDemo: () => void;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

function initialDemo(): AppData {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    return saved ? (JSON.parse(saved) as AppData) : demoData();
  } catch {
    return demoData();
  }
}

function describeChange(table: EntityName, before: Record<string, unknown> | undefined, after: Record<string, unknown>): string | null {
  if (table === "tasks" && !before) return `Created task: ${after["title"]}`;
  if (table === "tasks" && before?.["status"] !== "completed" && after["status"] === "completed") return `Completed ${after["title"]}`;
  if (table === "goals" && !before) return `Created goal: ${after["title"]}`;
  if (table === "goals" && before?.["status"] !== after["status"]) return `Goal ${after["title"]}: ${after["status"]}`;
  if (table === "milestones" && before?.["status"] !== "completed" && after["status"] === "completed") return `Reached milestone: ${after["title"]}`;
  if (table === "job_applications" && !before) return `Saved application: ${after["company"]} · ${after["role"]}`;
  if (table === "job_applications" && before?.["status"] !== after["status"]) return `${after["company"]}: moved to ${after["status"]}`;
  if (table === "skills" && !before) return `Added skill: ${after["name"]}`;
  if (table === "skills" && before?.["status"] !== after["status"]) return `${after["name"]}: ${after["status"]}`;
  if (table === "contacts" && !before) return `Added contact: ${after["name"]}`;
  if (table === "interview_practice") return "Practiced an interview question";
  if (table === "network_interactions") return "Recorded a networking interaction";
  if (table === "focus_sessions") return "Finished a focus session";
  if (table === "projects" && !before) return `Created project: ${after["name"]}`;
  if (table === "projects" && before?.["status"] !== after["status"]) return `${after["name"]}: ${after["status"]}`;
  if (table === "evidence" && !before) return `Added evidence: ${after["title"]}`;
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const supabase = useMemo(() => (demo ? null : browserSupabase()), [demo]);

  useEffect(() => {
    setDemo(demoMode());
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
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
      const results = await Promise.all(
        ENTITY_NAMES.map(async (table) => {
          const { data: rows, error: queryError } = await client.from(table).select("*").is("deleted_at", null).limit(1000);
          if (queryError) throw queryError;
          return [table, rows ?? []] as const;
        }),
      );
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
  // Debounced, silent, hosted only; no polling.
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
    const channel = supabase
      .channel(`learning-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_assignments", filter: `user_id=eq.${uid}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "learning_feedback", filter: `user_id=eq.${uid}` }, soon)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
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
        if (activityError) throw activityError;
      }
      setData((current) => ({ ...current, activity_log: [activity, ...current.activity_log] }));
    },
    [supabase, user?.id],
  );

  const add = useCallback(
    async <K extends EntityName>(table: K, values: Omit<EntityMap[K], "id" | "user_id" | "created_at">): Promise<EntityMap[K]> => {
      if (supabase && !user) throw new Error("Sign in to save changes.");
      const record = { ...values, id: crypto.randomUUID(), user_id: user?.id ?? "demo", created_at: new Date().toISOString() } as EntityMap[K];
      if (supabase) {
        const { error: writeError } = await supabase.from(table).insert(record);
        if (writeError) throw writeError;
      }
      setData((current) => ({ ...current, [table]: [record, ...current[table]] }) as AppData);
      const summary = describeChange(table, undefined, record as unknown as Record<string, unknown>);
      if (summary) await writeActivity(table, record.id, summary);
      return record;
    },
    [supabase, user, writeActivity],
  );

  const update = useCallback(
    async <K extends EntityName>(table: K, id: string, values: Partial<EntityMap[K]>) => {
      if (supabase && !user) throw new Error("Sign in to save changes.");
      const existing = (data[table] as EntityMap[K][]).find((item) => item.id === id);
      if (!existing) throw new Error("Record no longer exists.");
      const next = { ...existing, ...values, updated_at: new Date().toISOString() } as EntityMap[K];
      if (supabase) {
        const { error: writeError } = await supabase
          .from(table)
          .update({ ...values, updated_at: next.updated_at })
          .eq("id", id);
        if (writeError) throw writeError;
      }
      setData(
        (current) =>
          ({
            ...current,
            [table]: (current[table] as EntityMap[K][]).map((item) => (item.id === id ? { ...item, ...values, updated_at: next.updated_at } : item)),
          }) as AppData,
      );
      const summary = describeChange(table, existing as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>);
      if (summary) await writeActivity(table, id, summary);
    },
    [data, supabase, user, writeActivity],
  );

  const remove = useCallback(
    async <K extends EntityName>(table: K, id: string) => {
      const deleted_at = new Date().toISOString();
      if (supabase) {
        const { error: writeError } = await supabase.from(table).update({ deleted_at }).eq("id", id);
        if (writeError) throw writeError;
      }
      setData((current) => ({ ...current, [table]: (current[table] as EntityMap[K][]).filter((item) => item.id !== id) }) as AppData);
    },
    [supabase],
  );

  const resetDemo = () => {
    if (!demo) return;
    const seed = demoData();
    localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
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

  return (
    <StoreContext.Provider
      value={{ data, loading, error, user, hosted: !demo, demo, add, update, remove, refresh, resetDemo, enterDemo, exitDemo, signOut }}
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

