import { describe, it, expect } from "vitest";
import { query, resolve, search, report, type Db } from "./queries.server";
type Row = Record<string, unknown>;
const uid = "00000000-0000-4000-8000-000000000001";
const id = (n: number) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
function fixture(tables: Record<string, Row[]>) {
  let context: Row | null = null;
  const calls = { contextSaves: 0 };
  const db = {
    rpc: async (_name: string, params: Row) => {
      const entity = String(params.p_entity),
        q = (params.p_query ?? {}) as Row;
      let rows = tables[entity] ?? [];
      for (const f of (q.filters ?? []) as { field: string; value: unknown }[])
        rows = rows.filter((r) => r[f.field] === f.value);
      const offset = Number(q.offset ?? 0),
        limit = Number(q.limit ?? 50);
      const more = rows.length > offset + limit;
      return {
        error: null,
        data: {
          entity,
          rows: rows.slice(offset, offset + limit),
          has_more: more,
          next_offset: more ? offset + limit : null,
        },
      };
    },
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: context, error: null }),
        upsert: async (row: Row) => {
          calls.contextSaves++;
          context = row;
          return { error: null };
        },
        update: (row: Row) => {
          context = { ...context, ...row };
          return chain;
        },
        then: (done: (r: { error: null }) => unknown) => Promise.resolve(done({ error: null })),
      };
      return chain;
    },
  } as unknown as Db;
  return { db, getContext: () => context, calls };
}
describe("conversation references and shared calculations", () => {
  it("retains the ordered IDs across all pages rather than resolving against the last page", async () => {
    const { db, getContext } = fixture({
      tasks: Array.from({ length: 205 }, (_, i) => ({ id: id(i + 1), title: "Fixture " + i })),
    });
    await query(db, uid, "tasks", { limit: 200, offset: 0 }, "chat");
    const last = await query(db, uid, "tasks", { limit: 200, offset: 200 }, "chat");
    expect(last.first_ordinal).toBe(201);
    expect(getContext()?.record_ids as string[]).toHaveLength(205);
    expect((await resolve(db, uid, "chat", { entity: "tasks", ordinal: 2 })).rows[0].id).toBe(
      id(2),
    );
  });
  it("rejects a missing page ordinal and resolves a displayed absolute ordinal", async () => {
    const { db } = fixture({ tasks: Array.from({ length: 205 }, (_, i) => ({ id: id(i + 1) })) });
    await query(db, uid, "tasks", { offset: 200, limit: 200 }, "chat");
    await expect(resolve(db, uid, "chat", { entity: "tasks", ordinal: 2 })).rejects.toThrow(
      "needs_clarification",
    );
    expect((await resolve(db, uid, "chat", { entity: "tasks", ordinal: 202 })).rows[0].id).toBe(
      id(202),
    );
  });
  it("remembers each module in a cross-module search and clears ambiguous active selection", async () => {
    const { db, getContext, calls } = fixture({
      tasks: [
        { id: id(2), title: "RAG task" },
        { id: id(3), title: "RAG task 2" },
      ],
      projects: [{ id: id(4), name: "RAG project" }],
    });
    await search(db, uid, { search: "RAG", entities: ["tasks", "projects"] }, "chat");
    expect(calls.contextSaves).toBe(1);
    expect(getContext()?.entity).toBeNull();
    expect((await resolve(db, uid, "chat", { entity: "tasks", ordinal: 2 })).rows[0].id).toBe(
      id(3),
    );
  });
  it("uses saved timezone, excludes time mirrors and reuses actual project and goal calculations", async () => {
    const { db } = fixture({
      tasks: [
        {
          id: id(2),
          status: "completed",
          completed_at: "2026-10-10T19:30:00Z",
          scheduled_date: "2026-10-11",
          estimated_minutes: 90,
          actual_minutes: 60,
          skill_id: id(4),
          project_id: id(3),
          goal_id: id(5),
        },
      ],
      focus_sessions: [
        { id: id(6), task_id: id(2), started_at: "2026-10-10T19:00:00Z", duration_minutes: 60 },
      ],
      learning_sessions: [
        {
          id: id(7),
          task_id: id(2),
          focus_session_id: id(6),
          minutes: 60,
          occurred_at: "2026-10-10T19:00:00Z",
        },
        {
          id: id(8),
          skill_id: id(4),
          focus_session_id: null,
          minutes: 20,
          occurred_at: "2026-10-10T19:00:00Z",
        },
      ],
      projects: [{ id: id(3), name: "Fixture", status: "Building" }],
      goals: [{ id: id(5), title: "Goal", parent_goal_id: null }],
      skills: [{ id: id(4), name: "RAG" }],
      learning_preferences: [{ timezone: "Asia/Kolkata" }],
    });
    const r = await report(db, uid, { from: "2026-10-11", to: "2026-10-11" });
    expect(r.completed_tasks).toBe(1);
    expect(r.actual_minutes).toBe(80);
    expect(r.focus_minutes).toBe(60);
    expect(r.legacy_standalone_learning_minutes).toBe(20);
    expect(r.project_progress[0].progress).toBe(100);
    expect(r.goal_progress[0].progress).toBe(100);
    expect(r.learning_by_skill[0].minutes).toBe(80);
  });
});
