"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppData, EntityMap, EntityName, ENTITY_NAMES, emptyData, Activity } from "./domain/types";
import { demoData } from "./domain/seed";
import { browserSupabase, hostedMode } from "./supabase";

const DEMO_KEY = "career-os-demo-v4";

interface Store {
  data: AppData;
  loading: boolean;
  error: string | null;
  user: User | null;
  hosted: boolean;
  learningReady: boolean;
  add: <K extends EntityName>(table: K, values: Omit<EntityMap[K], "id" | "user_id" | "created_at">) => Promise<EntityMap[K]>;
  update: <K extends EntityName>(table: K, id: string, values: Partial<EntityMap[K]>) => Promise<void>;
  remove: <K extends EntityName>(table: K, id: string) => Promise<void>;
  refresh: () => Promise<void>;
  resetDemo: () => void;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

function initialDemo(): AppData {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    return saved ? { ...emptyData(), ...JSON.parse(saved) } as AppData : demoData();
  } catch {
    return demoData();
  }
}

function describeChange(table: EntityName, before: Record<string, unknown> | undefined, after: Record<string, unknown>): string | null {
  if (table === "tasks" && !before) return `Created task: ${after.title}`;
  if (table === "tasks" && before?.status !== "completed" && after.status === "completed") return `Completed ${after.title}`;
  if (table === "goals" && !before) return `Created goal: ${after.title}`;
  if (table === "goals" && before?.status !== after.status) return `Goal ${after.title}: ${after.status}`;
  if (table === "milestones" && before?.status !== "completed" && after.status === "completed") return `Reached milestone: ${after.title}`;
  if (table === "job_applications" && !before) return `Saved application: ${after.company} · ${after.role}`;
  if (table === "job_applications" && before?.status !== after.status) return `${after.company}: moved to ${after.status}`;
  if (table === "skills" && !before) return `Added skill: ${after.name}`;
  if (table === "skills" && before?.status !== after.status) return `${after.name}: ${after.status}`;
  if (table === "contacts" && !before) return `Added contact: ${after.name}`;
  if (table === "interview_practice") return "Practiced an interview question";
  if (table === "network_interactions") return "Recorded a networking interaction";
  if (table === "focus_sessions") return "Finished a focus session";
  if (table === "projects" && !before) return `Created project: ${after.name}`;
  if (table === "projects" && before?.status !== after.status) return `${after.name}: ${after.status}`;
  if (table === "evidence" && !before) return `Added evidence: ${after.title}`;
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learningReady, setLearningReady] = useState(false);
  const supabase = useMemo(() => browserSupabase(), []);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setData(initialDemo());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    setUser(session.user);
    if (!session.user) {
      setData(emptyData());
      setLoading(false);
      return;
    }
    try {
      let missingLearningSchema = false;
      const results = await Promise.all(ENTITY_NAMES.map(async (table) => {
        const { data: rows, error: queryError } = await supabase.from(table).select("*").is("deleted_at", null).limit(table === "curriculum_topics" || table === "learning_baselines" ? 2000 : table === "curriculum_prerequisites" ? 5000 : 1000);
        const learningEntity = table.startsWith("curriculum_") || table.startsWith("learning_") && table !== "learning_sessions" || table === "scheduler_runs" || table === "telegram_message_map";
        if (learningEntity && queryError && ["42P01", "PGRST205"].includes(queryError.code)) {
          missingLearningSchema = true;
          return [table, []] as const;
        }
        if (queryError) throw queryError;
        return [table, rows ?? []] as const;
      }));
      setData(Object.fromEntries(results) as AppData);
      setLearningReady(!missingLearningSchema);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your workspace.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { void refresh(); }, 0); });
    return () => listener.subscription.unsubscribe();
  }, [refresh, supabase]);

  const userId = user?.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const requestRefresh = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void refresh(); }, 400);
    };
    document.addEventListener("visibilitychange", requestRefresh);
    window.addEventListener("focus", requestRefresh);
    const channel = supabase.channel(`learning-updates:${userId}`);
    for (const table of ["tasks", "focus_sessions", "learning_sessions", "learning_assignments", "learning_feedback", "skill_topics", "learning_baselines", "curriculum_sources"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` }, requestRefresh);
    }
    channel.subscribe();
    return () => {
      clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", requestRefresh);
      window.removeEventListener("focus", requestRefresh);
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, refresh]);

  useEffect(() => {
    if (!hostedMode && !loading) localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  }, [data, loading]);

  const writeActivity = useCallback(async (table: EntityName, entityId: string, summary: string) => {
    const activity: Activity = {
      id: crypto.randomUUID(), user_id: user?.id ?? "demo", created_at: new Date().toISOString(),
      entity_type: table, entity_id: entityId, action: "updated", summary,
      occurred_at: new Date().toISOString(), metadata: {},
    };
    if (supabase) {
      const { error: activityError } = await supabase.from("activity_log").insert(activity);
      if (activityError) throw activityError;
    }
    setData((current) => ({ ...current, activity_log: [activity, ...current.activity_log] }));
  }, [supabase, user?.id]);

  const add = useCallback(async <K extends EntityName>(table: K, values: Omit<EntityMap[K], "id" | "user_id" | "created_at">): Promise<EntityMap[K]> => {
    if (supabase && !user) throw new Error("Sign in to save changes.");
    const record = { ...values, id: crypto.randomUUID(), user_id: user?.id ?? "demo", created_at: new Date().toISOString() } as EntityMap[K];
    if (supabase) {
      const { error: writeError } = await supabase.from(table).insert(record);
      if (writeError) throw writeError;
    }
    setData((current) => ({ ...current, [table]: [record, ...current[table]] } as AppData));
    const summary = describeChange(table, undefined, record as unknown as Record<string, unknown>);
    if (summary) await writeActivity(table, record.id, summary);
    return record;
  }, [supabase, user, writeActivity]);

  const update = useCallback(async <K extends EntityName>(table: K, id: string, values: Partial<EntityMap[K]>) => {
    if (supabase && !user) throw new Error("Sign in to save changes.");
    const existing = (data[table] as EntityMap[K][]).find((item) => item.id === id);
    if (!existing) throw new Error("Record no longer exists.");
    const next = { ...existing, ...values, updated_at: new Date().toISOString() } as EntityMap[K];
    if (supabase) {
      const { error: writeError } = await supabase.from(table).update({ ...values, updated_at: next.updated_at }).eq("id", id);
      if (writeError) throw writeError;
    }
    setData((current) => ({ ...current, [table]: (current[table] as EntityMap[K][]).map((item) => item.id === id ? { ...item, ...values, updated_at: next.updated_at } : item) } as AppData));
    const summary = describeChange(table, existing as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>);
    if (summary) await writeActivity(table, id, summary);
  }, [data, supabase, user, writeActivity]);

  const remove = useCallback(async <K extends EntityName>(table: K, id: string) => {
    const deleted_at = new Date().toISOString();
    if (supabase) {
      const { error: writeError } = await supabase.from(table).update({ deleted_at }).eq("id", id);
      if (writeError) throw writeError;
    }
    setData((current) => ({ ...current, [table]: (current[table] as EntityMap[K][]).filter((item) => item.id !== id) } as AppData));
  }, [supabase]);

  const resetDemo = () => {
    if (hostedMode) return;
    const seed = demoData();
    localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
    setData(seed);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setUser(null);
    setData(emptyData());
  };

  return <StoreContext.Provider value={{ data, loading, error, user, hosted: hostedMode, learningReady, add, update, remove, refresh, resetDemo, signOut }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
