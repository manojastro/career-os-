import { registry } from "./protocol";
import type { SupabaseClient } from "@supabase/supabase-js";
import { goalProgress, projectProgress } from "@/lib/domain/insights";
import { emptyData, type AppData } from "@/lib/domain/types";
import { createHash } from "node:crypto";
export type Db = SupabaseClient;
export async function rpc<T = unknown>(
  db: Db,
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await db.rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}
export type Page = {
  entity: string;
  rows: Record<string, unknown>[];
  has_more: boolean;
  next_offset: number | null;
  first_ordinal?: number;
};
type StoredList = {
  record_ids: string[];
  selected_id: string | null;
  query_signature: string | null;
  base_offset: number;
  updated_at: string;
};
function savedLists(value: unknown): Record<string, StoredList> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, StoredList>)
    : {};
}
export async function query(
  db: Db,
  uid: string,
  entity: string,
  input: Record<string, unknown>,
  chat?: string,
): Promise<Page> {
  if (!Object.hasOwn(registry, entity)) throw new Error("unsupported_entity");
  const page = await rpc<Page>(db, "control_query", {
    p_uid: uid,
    p_entity: entity,
    p_query: input,
  });
  if (chat) {
    const offset = Number(input.offset ?? 0);
    const signature = createHash("sha256")
      .update(
        JSON.stringify({
          entity,
          search: input.search ?? "",
          sort: input.sort ?? "created_at",
          direction: input.direction ?? "desc",
          filters: input.filters ?? [],
        }),
      )
      .digest("hex");
    const { data: prior, error: priorError } = await db
      .from("control_context")
      .select("entity,record_ids,query_signature,base_offset,updated_at,lists")
      .eq("user_id", uid)
      .eq("chat_ref", chat)
      .maybeSingle();
    if (priorError) throw new Error("context_save_failed");
    const lists = savedLists(prior?.lists),
      old = lists[entity];
    const previous = Array.isArray(old?.record_ids) ? old.record_ids : [];
    const append =
      offset > 0 &&
      old?.query_signature === signature &&
      Number(old.base_offset) + previous.length === offset &&
      Date.parse(old.updated_at) > Date.now() - 86400000;
    const ids = append ? [...previous, ...page.rows.map((r) => r.id)] : page.rows.map((r) => r.id);
    const now = new Date().toISOString();
    const current = {
      record_ids: ids,
      query_signature: signature,
      base_offset: append ? Number(old.base_offset) : offset,
      selected_id: ids.length === 1 ? ids[0] : null,
      updated_at: now,
    };
    const { error } = await db.from("control_context").upsert({
      user_id: uid,
      chat_ref: chat,
      entity,
      record_ids: ids,
      query_signature: signature,
      base_offset: current.base_offset,
      selected_id: ids.length === 1 ? ids[0] : null,
      updated_at: now,
      lists: { ...lists, [entity]: current },
    });
    if (error) throw new Error("context_save_failed");
    page.first_ordinal = offset + 1;
  }
  return page;
}
export async function allRows(
  db: Db,
  uid: string,
  entity: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const p = await query(db, uid, entity, { limit: 200, offset, sort: "id", direction: "asc" });
    rows.push(...p.rows);
    if (!p.has_more) break;
    offset = p.next_offset!;
  }
  return rows;
}
export async function resolve(db: Db, uid: string, chat: string, input: Record<string, unknown>) {
  const entity = String(input.entity ?? "");
  if (!Object.hasOwn(registry, entity)) throw new Error("unsupported_entity");
  if (input.ordinal !== undefined || input.selected === true) {
    const { data, error } = await db
      .from("control_context")
      .select("entity,record_ids,selected_id,updated_at,base_offset,lists")
      .eq("user_id", uid)
      .eq("chat_ref", chat)
      .maybeSingle();
    const lists = savedLists(data?.lists),
      current = lists[entity];
    if (error || !data || !current || Date.parse(current.updated_at) < Date.now() - 86400000)
      throw new Error("context_expired_relist");
    const ids = current.record_ids;
    const ordinal = Number(input.ordinal);
    const id =
      input.selected === true
        ? current.selected_id
        : Number.isInteger(ordinal) && ordinal >= 1
          ? ids[ordinal - 1 - Number(current.base_offset ?? 0)]
          : null;
    if (!id) throw new Error("needs_clarification");
    const page = await query(db, uid, entity, { filters: [{ field: "id", op: "eq", value: id }] });
    if (!page.rows.length) throw new Error("record_not_found");
    const { error: updateError } = await db
      .from("control_context")
      .update({
        entity,
        record_ids: ids,
        base_offset: current.base_offset,
        query_signature: current.query_signature,
        selected_id: id,
        updated_at: new Date().toISOString(),
        lists: {
          ...lists,
          [entity]: { ...current, selected_id: id, updated_at: new Date().toISOString() },
        },
      })
      .eq("user_id", uid)
      .eq("chat_ref", chat);
    if (updateError) throw new Error("context_save_failed");
    return page;
  }
  const p = await query(db, uid, entity, { search: String(input.name ?? ""), limit: 50 }, chat);
  return {
    ...p,
    status:
      p.rows.length === 1 && !p.has_more
        ? "resolved"
        : p.rows.length
          ? "needs_clarification"
          : "not_found",
  };
}
export async function search(db: Db, uid: string, input: Record<string, unknown>, chat?: string) {
  const entities = input.entities === undefined ? Object.keys(registry) : input.entities;
  if (
    !Array.isArray(entities) ||
    entities.length > 60 ||
    entities.some((e) => typeof e !== "string" || !Object.hasOwn(registry, e))
  )
    throw new Error("unsupported_entity");
  const results: Page[] = [];
  for (const entity of entities)
    results.push(
      await query(
        db,
        uid,
        entity,
        {
          search: String(input.search ?? ""),
          limit: Number(input.limit ?? 20),
          offset: Number(input.offset ?? 0),
          filters: input.filters ?? [],
          sort: input.sort ?? "id",
          direction: input.direction ?? "asc",
        },
        chat,
      ),
    );
  if (chat) {
    const matches = results.filter((p) => p.rows.length);
    if (matches.length !== 1 || matches[0].rows.length !== 1 || matches[0].has_more) {
      const { error } = await db
        .from("control_context")
        .update({ entity: null, selected_id: null })
        .eq("user_id", uid)
        .eq("chat_ref", chat);
      if (error) throw new Error("context_save_failed");
    } else {
      const { error } = await db
        .from("control_context")
        .update({ entity: matches[0].entity, selected_id: matches[0].rows[0].id })
        .eq("user_id", uid)
        .eq("chat_ref", chat);
      if (error) throw new Error("context_save_failed");
    }
  }
  return {
    results,
    has_more: results.some((p) => p.has_more),
    pagination: "Use query for each entity's next_offset; all matching pages remain available.",
  };
}
export async function report(db: Db, uid: string, input: Record<string, unknown>) {
  const from = String(input.from ?? "").slice(0, 10),
    to = String(input.to ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to)
    throw new Error("report_dates_required");
  const [
    tasks,
    focus,
    projects,
    skills,
    contacts,
    interactions,
    apps,
    preferences,
    goals,
    milestones,
    learning,
  ] = await Promise.all(
    [
      "tasks",
      "focus_sessions",
      "projects",
      "skills",
      "contacts",
      "network_interactions",
      "job_applications",
      "learning_preferences",
      "goals",
      "milestones",
      "learning_sessions",
    ].map((e) => allRows(db, uid, e)),
  );
  const timezone = String(preferences[0]?.timezone ?? "Asia/Kolkata");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const within = (v: unknown) => {
    const raw = String(v ?? "");
    const day = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : raw && Number.isFinite(Date.parse(raw))
        ? formatter.format(new Date(raw))
        : "";
    return day >= from && day <= to;
  };
  const completed = tasks.filter((t) => t.status === "completed" && within(t.completed_at));
  const ledger = focus.filter((s) => within(s.started_at));
  const focusMinutes = ledger.reduce((n, s) => n + Number(s.duration_minutes ?? 0), 0);
  const scheduled = tasks.filter((t) => within(t.scheduled_date));
  const fallback = scheduled.filter((t) => !focus.some((f) => f.task_id === t.id));
  const legacy = learning.filter(
    (s) =>
      !s.focus_session_id && within(s.occurred_at) && !fallback.some((t) => t.id === s.task_id),
  );
  const legacyMinutes = legacy.reduce((n, s) => n + Number(s.minutes ?? 0), 0);
  const fallbackMinutes = fallback.reduce((n, t) => n + Number(t.actual_minutes ?? 0), 0);
  const minutes = focusMinutes + legacyMinutes + fallbackMinutes;
  const progressData = { ...emptyData(), tasks, projects, goals, milestones } as unknown as AppData;
  const group = (rows: Record<string, unknown>[], field: string) =>
    rows.reduce<Record<string, number>>((a, r) => {
      const k = String(r[field] ?? "Unknown");
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {});
  const bySkill = skills.map((s) => ({
    id: s.id,
    name: s.name,
    minutes:
      ledger
        .filter((f) => tasks.find((t) => t.id === f.task_id)?.skill_id === s.id)
        .reduce((n, f) => n + Number(f.duration_minutes ?? 0), 0) +
      legacy.filter((l) => l.skill_id === s.id).reduce((n, l) => n + Number(l.minutes ?? 0), 0) +
      fallback
        .filter((t) => t.skill_id === s.id)
        .reduce((n, t) => n + Number(t.actual_minutes ?? 0), 0),
  }));
  return {
    from,
    to,
    timezone,
    completed_tasks: completed.length,
    planned_minutes: scheduled.reduce((n, t) => n + Number(t.estimated_minutes ?? 0), 0),
    actual_minutes: minutes,
    focus_minutes: focusMinutes,
    legacy_standalone_learning_minutes: legacyMinutes,
    legacy_task_fallback_minutes: fallbackMinutes,
    time_source:
      "Existing website accounting: focus ledger plus non-mirrored legacy rows and task totals only when no ledger exists; fallback totals do not establish exact historical session dates.",
    project_status: group(projects, "status"),
    project_progress: projects.map((p) => ({
      id: p.id,
      name: p.name,
      progress: projectProgress(progressData, String(p.id)),
    })),
    goal_progress: goals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: goalProgress(progressData, String(g.id)),
    })),
    learning_by_skill: bySkill,
    contacts: contacts.length,
    network_interactions: interactions.filter((r) => within(r.occurred_at)).length,
    application_stages: group(apps, "status"),
  };
}
