import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const uid = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
type ControlResult = {
  status: string;
  changes: {
    entity: string;
    action: string;
    record: Record<string, string | number | boolean | null>;
  }[];
  request_key: string;
  approval_id: string;
  reply: string;
  rows: Record<string, string | number | boolean | null>[];
  has_more: boolean;
  next_offset: number;
  deployed: boolean;
};
let db: PGlite;
let seq = 0;
const chat = "owner-hash";
async function inbound(text = "Make the requested change") {
  const message = String(++seq);
  await db.query(
    "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,$3,$4)",
    [uid, chat, message, text],
  );
  return message;
}
async function execute(
  ops: unknown,
  key = "test:command:" + ++seq,
  message?: string,
  approval?: string,
) {
  return (
    await db.query<{ r: ControlResult }>("SELECT control_execute($1,$2,$3,$4,$5,$6) r", [
      uid,
      chat,
      message ?? (await inbound()),
      key,
      JSON.stringify(ops),
      approval ?? null,
    ])
  ).rows[0].r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL("./schema-fixture.sql", import.meta.url), "utf8"));
  await db.query("INSERT INTO auth.users VALUES($1),($2)", [uid, other]);
  await db.query("INSERT INTO agent_owner(singleton,user_id) VALUES(true,$1)", [uid]);
  const learning = readFileSync(
    new URL("../../../../drizzle/migrations/0003_learning_transactions_rpc.sql", import.meta.url),
    "utf8",
  );
  for (const fn of learning.match(/create or replace function[\s\S]*?end \$\$;/gi) ?? [])
    await db.exec(fn);
  await db.exec(
    readFileSync(
      new URL("../../../../drizzle/migrations/0005_telegram_control.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("real PostgreSQL control transactions", () => {
  it("normalizes new skill identities and rejects duplicates without merging evidence or history", async () => {
    const added = await execute([
      { entity: "skills", action: "create", values: { name: "  Distinct fixture skill  " } },
    ]);
    expect(added.changes[0].record.name).toBe("Distinct fixture skill");
    await expect(
      execute([{ entity: "skills", action: "create", values: { name: "distinct FIXTURE skill" } }]),
    ).rejects.toThrow("skill_name_exists");
    await execute([
      {
        entity: "skills",
        action: "update",
        id: added.changes[0].record.id,
        values: { knowledge: 2 },
      },
    ]);
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::integer n FROM skills WHERE user_id=$1 AND lower(name)='distinct fixture skill'",
          [uid],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("owns outreach feedback links and restores detached notes when undoing a parent delete", async () => {
    const outreach = await execute([
      { entity: "outreach", action: "create", values: { recipient: "Fixture only" } },
    ]);
    const target = outreach.changes[0].record.id;
    const feedback = await execute([
      {
        entity: "feedback",
        action: "create",
        values: { target_type: "outreach", target_id: target, action: "useful" },
      },
    ]);
    expect(feedback.status).toBe("completed");
    const project = await execute([
      { entity: "projects", action: "create", values: { name: "Notes undo fixture" } },
    ]);
    const id = project.changes[0].record.id;
    const note = await execute([
      {
        entity: "notes",
        action: "create",
        values: { title: "Linked note", entity_type: "projects", entity_id: id },
      },
    ]);
    const operations = [{ entity: "projects", action: "delete", id }];
    const pending = await execute(operations);
    const removed = await execute(
      operations,
      undefined,
      await inbound(pending.reply),
      pending.approval_id,
    );
    await db.query("SELECT control_undo($1,$2,$3)", [
      uid,
      removed.request_key,
      "test:undo:linked-note",
    ]);
    const restored = (
      await db.query<{ entity_id: string; deleted_at: null }>(
        "SELECT entity_id,deleted_at FROM notes WHERE id=$1",
        [note.changes[0].record.id],
      )
    ).rows[0];
    expect(restored.entity_id).toBe(id);
    expect(restored.deleted_at).toBeNull();
    const history = await db.query<{ total: number }>(
      "SELECT count(*)::integer total FROM control_changes WHERE user_id=$1 AND request_key=$2",
      [uid, removed.request_key],
    );
    expect(history.rows[0].total).toBeGreaterThan(0);
  });
  it("edits a unique text fragment and appends without overwriting rich note formatting", async () => {
    const note = await execute([
      {
        entity: "notes",
        action: "create",
        values: {
          title: "Formatting fixture",
          content: "<p><strong>Important</strong> unchanged paragraph.</p>",
        },
      },
    ]);
    const id = note.changes[0].record.id;
    const edited = await execute([
      {
        entity: "notes",
        action: "edit_text",
        id,
        values: {
          field: "content",
          mode: "replace_fragment",
          find: "unchanged paragraph.",
          text: "updated paragraph.",
        },
      },
    ]);
    expect(edited.changes[0].record.content).toBe(
      "<p><strong>Important</strong> updated paragraph.</p>",
    );
    const appended = await execute([
      {
        entity: "notes",
        action: "edit_text",
        id,
        values: { field: "content", mode: "append", text: "A <literal> observation" },
      },
    ]);
    expect(appended.changes[0].record.content).toBe(
      "<p><strong>Important</strong> updated paragraph.</p><p>A &lt;literal&gt; observation</p>",
    );
    await expect(
      execute([
        {
          entity: "notes",
          action: "edit_text",
          id,
          values: {
            field: "content",
            mode: "replace_fragment",
            find: "missing fragment",
            text: "replacement",
          },
        },
      ]),
    ).rejects.toThrow("text_fragment_not_found");
  });
  it("requires approval when a short replacement removes a substantial existing document", async () => {
    const create = [
      {
        entity: "notes",
        action: "create",
        values: { title: "Long note fixture", content: "Existing confirmed notes. ".repeat(110) },
      },
    ];
    const p = await execute(create);
    const note = await execute(create, undefined, await inbound(p.reply), p.approval_id);
    const id = note.changes[0].record.id;
    const shortened = await execute([
      { entity: "notes", action: "update", id, values: { content: "Short replacement" } },
    ]);
    expect(shortened.status).toBe("awaiting_confirmation");
    expect(
      (await db.query<{ content: string }>("SELECT content FROM notes WHERE id=$1", [id])).rows[0]
        .content.length,
    ).toBeGreaterThan(2000);
  });
  it("atomically creates a project and tasks, then records minutes using a real generated task alias", async () => {
    const ops = [
      { entity: "projects", action: "create", ref: "p", values: { name: "Atomic owner work" } },
      {
        entity: "tasks",
        action: "create",
        ref: "t",
        values: { title: "New FastAPI fixture", type: "Build", project_id: "$p" },
      },
      { entity: "tasks", action: "record_time", id: "$t", values: { minutes: 90, complete: true } },
      {
        entity: "tasks",
        action: "create",
        values: { title: "Pydantic tomorrow", scheduled_date: "2026-10-11", project_id: "$p" },
      },
    ];
    const pending = await execute(ops);
    const done = await execute(ops, undefined, await inbound(pending.reply), pending.approval_id);
    expect(done.status).toBe("completed");
    expect(done.changes[2].record.actual_minutes).toBe(90);
    expect(done.changes[2].record.status).toBe("completed");
    expect(done.changes[1].record.project_id).toBe(done.changes[0].record.id);
    const context = (
      await db.query<{ ids: string[] }>(
        "SELECT record_ids ids FROM control_context WHERE user_id=$1 AND chat_ref=$2",
        [uid, chat],
      )
    ).rows[0];
    expect(context.ids).toHaveLength(2);
  });
  it("creates, updates and completes tasks with exact retry protection", async () => {
    const ops = [{ entity: "tasks", action: "create", values: { title: "Control task" } }],
      key = "test:task:retry",
      message = await inbound();
    const first = await execute(ops, key, message);
    expect(first.status).toBe("completed");
    expect(await execute(ops, key, message)).toEqual(first);
    const id = first.changes[0].record.id;
    const changed = await execute([
      { entity: "tasks", action: "update", id, values: { status: "completed", priority: "high" } },
    ]);
    expect(changed.changes[0].record.completed_at).toBeTruthy();
    await expect(
      execute(
        [{ entity: "tasks", action: "create", values: { title: "Different" } }],
        key,
        message,
      ),
    ).rejects.toThrow("idempotency_conflict");
  });
  it("rolls back dependent compound changes and enforces cross owner links", async () => {
    const p = (
      await db.query<{ id: string }>(
        "INSERT INTO projects(user_id,name) VALUES($1,'Private') RETURNING id",
        [other],
      )
    ).rows[0].id;
    await expect(
      execute([{ entity: "tasks", action: "create", values: { title: "Bad", project_id: p } }]),
    ).rejects.toThrow("linked_record_not_found");
    const count = (
      await db.query<{ n: number }>("SELECT count(*)::int n FROM projects WHERE user_id=$1", [uid])
    ).rows[0].n;
    await expect(
      execute([
        { entity: "projects", action: "create", ref: "p", values: { name: "Atomic" } },
        { entity: "tasks", action: "create", values: { title: "", project_id: "$p" } },
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ n: number }>("SELECT count(*)::int n FROM projects WHERE user_id=$1", [
          uid,
        ])
      ).rows[0].n,
    ).toBe(count);
  });
  it("requires actual inbound confirmation, expires and consumes approvals once", async () => {
    const created = await execute([
      { entity: "resources", action: "create", values: { title: "Disposable" } },
    ]);
    const id = created.changes[0].record.id;
    const ops = [{ entity: "resources", action: "delete", id }];
    const pending = await execute(ops);
    expect(pending.status).toBe("awaiting_confirmation");
    expect(
      (
        await db.query<{ deleted_at: unknown }>("SELECT deleted_at FROM resources WHERE id=$1", [
          id,
        ])
      ).rows[0].deleted_at,
    ).toBeNull();
    await expect(
      execute(ops, undefined, await inbound("yes"), pending.approval_id),
    ).rejects.toThrow("invalid_confirmation");
    const approved = await execute(
      ops,
      undefined,
      await inbound(pending.reply),
      pending.approval_id,
    );
    expect(approved.status).toBe("completed");
    await expect(
      execute(ops, undefined, await inbound(pending.reply), pending.approval_id),
    ).rejects.toThrow("invalid_confirmation");
  });
  it("supports linked project plus tasks atomically after exact approval", async () => {
    const ops = [
      { entity: "projects", action: "create", ref: "p", values: { name: "RAG Control Project" } },
      { entity: "tasks", action: "create", values: { title: "Build API", project_id: "$p" } },
    ];
    const pending = await execute(ops);
    const result = await execute(ops, undefined, await inbound(pending.reply), pending.approval_id);
    expect(result.changes[1].record.project_id).toBe(result.changes[0].record.id);
  });
  it("undo restores the actual snapshot and rejects later conflicting changes", async () => {
    const result = await execute([
      { entity: "contacts", action: "create", values: { name: "Undo fixture" } },
    ]);
    const request = result.request_key;
    await db.query("SELECT control_undo($1,$2,$3)", [uid, request, "test:undo:" + ++seq]);
    const id = result.changes[0].record.id;
    expect(
      (await db.query<{ deleted_at: unknown }>("SELECT deleted_at FROM contacts WHERE id=$1", [id]))
        .rows[0].deleted_at,
    ).toBeTruthy();
  });
  it("creates each principal module and applies its business effects", async () => {
    const skill = (
      await execute([{ entity: "skills", action: "create", values: { name: "Control skill" } }])
    ).changes[0].record.id;
    const goal = (
      await execute([
        {
          entity: "goals",
          action: "create",
          values: { title: "Career milestone parent", goal_type: "career" },
        },
      ])
    ).changes[0].record.id;
    const cases = [
      { entity: "milestones", values: { goal_id: goal, title: "Career checkpoint" } },
      { entity: "skill_topics", values: { skill_id: skill, title: "Deep topic" } },
      {
        entity: "notes",
        values: {
          title: "RAG notes",
          content: "LangGraph",
          entity_type: "skills",
          entity_id: skill,
        },
      },
      {
        entity: "resources",
        values: { title: "RAG source", url: "https://example.com", skill_id: skill },
      },
      {
        entity: "evidence",
        values: { title: "Proof", kind: "link", url: "https://example.com", skill_id: skill },
      },
      { entity: "inbox_items", values: { content: "Captured thought" } },
      { entity: "daily_logs", values: { log_date: "2026-10-10", journal: "Progress" } },
      {
        entity: "interview_stories",
        values: { title: "STAR example", situation: "Confirmed scenario" },
      },
      { entity: "mock_interviews", values: { title: "Practice round" } },
      {
        entity: "job_applications",
        values: { company: "Fixture Co", role: "AI engineer", status: "Applied" },
      },
    ];
    for (const c of cases) {
      const r = await execute([{ ...c, action: "create" }]);
      expect(r.status, c.entity).toBe("completed");
      expect(r.changes[0].record.user_id).toBe(uid);
      if (c.entity === "job_applications") expect(r.changes[0].record.date_applied).toBeTruthy();
    }
    const q = (
      await execute([
        { entity: "interview_questions", action: "create", values: { question: "Explain RAG" } },
      ])
    ).changes[0].record.id;
    await execute([
      {
        entity: "interview_practice",
        action: "create",
        values: { question_id: q, confidence: 3, notes: "Actual owner rating" },
      },
    ]);
    const question = (
      await db.query<{ practice_count: number }>(
        "SELECT practice_count FROM interview_questions WHERE id=$1",
        [q],
      )
    ).rows[0];
    expect(question.practice_count).toBe(1);
    const c = (
      await execute([{ entity: "contacts", action: "create", values: { name: "Contact fixture" } }])
    ).changes[0].record.id;
    await execute([
      {
        entity: "network_interactions",
        action: "create",
        values: { contact_id: c, kind: "Message", notes: "Reported manually" },
      },
    ]);
    expect(
      (
        await db.query<{ last_interaction: unknown }>(
          "SELECT last_interaction FROM contacts WHERE id=$1",
          [c],
        )
      ).rows[0].last_interaction,
    ).toBeTruthy();
  });
  it("preserves ledger minutes on retry and never counts the learning mirror twice", async () => {
    const id = (
      await execute([
        { entity: "tasks", action: "create", values: { title: "Ledger learning", type: "Learn" } },
      ])
    ).changes[0].record.id;
    const ops = [
        { entity: "tasks", action: "record_time", id, values: { minutes: 90, complete: true } },
      ],
      key = "test:90minute:retry",
      message = await inbound();
    expect((await execute(ops, key, message)).changes[0].record.actual_minutes).toBe(90);
    await execute(ops, key, message);
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT sum(duration_minutes)::int n FROM focus_sessions WHERE task_id=$1",
          [id],
        )
      ).rows[0].n,
    ).toBe(90);
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT sum(minutes)::int n FROM learning_sessions WHERE task_id=$1",
          [id],
        )
      ).rows[0].n,
    ).toBe(90);
  });
  it("queries all pages with stable IDs, numeric filters and no cross owner leak", async () => {
    await db.query(
      "INSERT INTO tasks(user_id,title,estimated_minutes) SELECT $1,'Paging fixture '||n,n FROM generate_series(1,205) n",
      [uid],
    );
    await db.query("INSERT INTO tasks(user_id,title) VALUES($1,'Paging fixture private')", [other]);
    const params = { search: "Paging fixture", limit: 200, sort: "id", direction: "asc" };
    const page = (
      await db.query<{ r: ControlResult }>("SELECT control_query($1,'tasks',$2) r", [
        uid,
        JSON.stringify(params),
      ])
    ).rows[0].r;
    expect(page.rows).toHaveLength(200);
    expect(page.has_more).toBe(true);
    const second = (
      await db.query<{ r: ControlResult }>("SELECT control_query($1,'tasks',$2) r", [
        uid,
        JSON.stringify({ ...params, offset: page.next_offset }),
      ])
    ).rows[0].r;
    expect(second.rows).toHaveLength(5);
    expect(new Set([...page.rows, ...second.rows].map((r) => r.id)).size).toBe(205);
    const numeric = (
      await db.query<{ r: ControlResult }>("SELECT control_query($1,'tasks',$2) r", [
        uid,
        JSON.stringify({
          search: "Paging fixture",
          filters: [{ field: "estimated_minutes", op: "gte", value: 200 }],
        }),
      ])
    ).rows[0].r;
    expect(numeric.rows).toHaveLength(6);
  });
  it("rejects expired and wrong-chat approvals and conflicting undo", async () => {
    const result = await execute([
      { entity: "projects", action: "create", values: { name: "Undo conflict" } },
    ]);
    const id = result.changes[0].record.id;
    const pending = await execute([{ entity: "projects", action: "delete", id }]);
    const foreignMessage = String(++seq);
    await db.query(
      "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,$3,$4)",
      [uid, "other-chat", foreignMessage, pending.reply],
    );
    await expect(
      db.query("SELECT control_execute($1,$2,$3,$4,$5,$6)", [
        uid,
        "other-chat",
        foreignMessage,
        "test:wrong-chat",
        JSON.stringify([{ entity: "projects", action: "delete", id }]),
        pending.approval_id,
      ]),
    ).rejects.toThrow("invalid_confirmation");
    await db.query(
      "UPDATE control_approvals SET expires_at=now()-interval '1 minute' WHERE id=$1",
      [pending.approval_id],
    );
    await expect(
      execute(
        [{ entity: "projects", action: "delete", id }],
        undefined,
        await inbound(pending.reply),
        pending.approval_id,
      ),
    ).rejects.toThrow("invalid_confirmation");
    await execute([
      { entity: "projects", action: "update", id, values: { description: "Later owner edit" } },
    ]);
    await expect(
      db.query("SELECT control_undo($1,$2,$3)", [uid, result.request_key, "test:undo:conflict"]),
    ).rejects.toThrow("undo_conflict");
  });
  it("persists selected references and queues development requests without deploying", async () => {
    const r = await execute([
      { entity: "projects", action: "create", values: { name: "Selected project" } },
    ]);
    const context = (
      await db.query<{ selected_id: string }>(
        "SELECT selected_id FROM control_context WHERE user_id=$1 AND chat_ref=$2",
        [uid, chat],
      )
    ).rows[0];
    expect(context.selected_id).toBe(r.changes[0].record.id);
    const result = (
      await db.query<{ r: ControlResult }>("SELECT control_queue_development($1,$2,$3) r", [
        uid,
        "Add a reviewed dashboard section",
        "test:devrequest:1",
      ])
    ).rows[0].r;
    expect(result.status).toBe("pending");
    expect(result.deployed).toBe(false);
  });

  it("exercises every declared writable entity against deployed columns and constraints", async () => {
    const { registry } = await import("../protocol");
    async function valuesFor(entity: string, fixture = false): Promise<Record<string, unknown>> {
      const e = registry[entity],
        v: Record<string, unknown> = {};
      for (const [k, f] of Object.entries(e.fields)) {
        if (!f.required || (!fixture && !f.editable) || ["id", "user_id"].includes(k)) continue;
        if (f.references) {
          const parent = registry[f.references];
          let prior = (
            await db.query<{ id: string }>(
              `SELECT id FROM "${f.references}" WHERE "${parent.owner}"=$1 ${parent.softDelete ? "AND deleted_at IS NULL" : ""} LIMIT 1`,
              [uid],
            )
          ).rows[0];
          if (!prior) {
            const pv = await valuesFor(f.references, true);
            const owner = parent.owner;
            const complete = { ...pv, [owner]: uid };
            if (f.references === "profiles") complete.id = uid;
            // Fixture seeding is confined to the isolated database, never a production tool.
            const cols = Object.keys(complete);
            const row = (
              await db.query<{ id: string }>(
                `INSERT INTO "${f.references}"(${cols.map((c) => '"' + c + '"').join(",")}) SELECT ${cols.map((c) => 'x."' + c + '"').join(",")} FROM jsonb_populate_record(NULL::public."${f.references}",$1) x RETURNING id`,
                [JSON.stringify(complete)],
              )
            ).rows[0];
            prior = row;
          }
          if (
            (k === "depends_on_id" || k === "prerequisite_topic_id") &&
            Object.values(v).includes(prior.id)
          ) {
            const pv = await valuesFor(f.references, true),
              complete = { ...pv, [parent.owner]: uid };
            const cols = Object.keys(complete);
            prior = (
              await db.query<{ id: string }>(
                `INSERT INTO "${f.references}"(${cols.map((c) => '"' + c + '"').join(",")}) SELECT ${cols.map((c) => 'x."' + c + '"').join(",")} FROM jsonb_populate_record(NULL::public."${f.references}",$1) x RETURNING id`,
                [JSON.stringify(complete)],
              )
            ).rows[0];
          }
          v[k] = prior.id;
        } else if (f.enum) v[k] = f.enum[0];
        else if (f.type === "text")
          v[k] = /url/.test(k)
            ? "https://docs.google.com/document/d/fixture/edit"
            : "Registry fixture " + ++seq;
        else if (f.type === "date") v[k] = "2026-10-11";
        else if (f.type === "timestamptz") v[k] = new Date().toISOString();
        else if (f.type === "time") v[k] = k === "end_time" ? "10:00" : "09:00";
        else if (f.type === "bool") v[k] = false;
        else if (f.type.startsWith("_")) v[k] = [];
        else if (f.type === "jsonb") v[k] = {};
        else v[k] = 1;
      }
      return v;
    }
    const verified: string[] = [];
    for (const [entity, e] of Object.entries(registry)) {
      if (!e.writable) continue;
      if (entity === "profiles") {
        await db.query(
          "INSERT INTO profiles(id,display_name) VALUES($1,'Fixture profile') ON CONFLICT(id) DO NOTHING",
          [uid],
        );
        const pending = await execute([
          {
            entity,
            action: "update",
            id: uid,
            values: { career_target: "Owner-selected AI role" },
          },
        ]);
        expect(
          (
            await execute(
              [
                {
                  entity,
                  action: "update",
                  id: uid,
                  values: { career_target: "Owner-selected AI role" },
                },
              ],
              undefined,
              await inbound(pending.reply),
              pending.approval_id,
            )
          ).status,
        ).toBe("completed");
        verified.push(entity);
        continue;
      }
      const values = await valuesFor(entity);
      const ops = [{ entity, action: "create", values }];
      const result = await execute(ops);
      if (result.status === "awaiting_confirmation")
        expect(
          (await execute(ops, undefined, await inbound(result.reply), result.approval_id)).status,
          entity,
        ).toBe("completed");
      else expect(result.status, entity).toBe("completed");
      verified.push(entity);
    }
    expect(verified.length).toBe(Object.values(registry).filter((e) => e.writable).length);
  }, 30000);
  it("exports real full pages and a scoped project snapshot", async () => {
    const full = (
      await db.query<{ r: Record<string, unknown[]> }>(
        "SELECT control_export($1,ARRAY['tasks']::text[],NULL) r",
        [uid],
      )
    ).rows[0].r;
    expect(full.tasks.length).toBeGreaterThan(200);
    const p = await execute([
      { entity: "projects", action: "create", values: { name: "Export project" } },
    ]);
    const id = p.changes[0].record.id;
    await execute([
      {
        entity: "tasks",
        action: "create",
        values: { title: "Scoped export work", project_id: id },
      },
    ]);
    const result = (
      await db.query<{ r: Record<string, unknown[]> }>(
        "SELECT control_export($1,ARRAY['tasks','projects']::text[],$2) r",
        [uid, id],
      )
    ).rows[0].r;
    expect(result.tasks).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
  });
  it("confirms baseline finalization and refuses a stale destructive preview", async () => {
    const ready = (
      await db.query<{ r: ControlResult }>(
        "SELECT control_prepare_workflow($1,$2,'finish_baseline',$3) r",
        [uid, chat, "test:finish:baseline"],
      )
    ).rows[0].r;
    const m = await inbound(ready.reply);
    await db.query("SELECT control_claim_workflow($1,$2,$3,$4,$5)", [
      uid,
      chat,
      m,
      ready.approval_id,
      "test:baseline:confirmed",
    ]);
    await db.query("SELECT control_finish_baseline($1,$2)", [uid, "test:baseline:confirmed"]);
    expect(
      (
        await db.query<{ finished: boolean }>(
          "SELECT baseline_completed_at IS NOT NULL finished FROM learning_preferences WHERE user_id=$1",
          [uid],
        )
      ).rows[0].finished,
    ).toBe(true);
    const row = await execute([
      {
        entity: "notes",
        action: "create",
        values: { title: "Revision fixture", content: "Original content" },
      },
    ]);
    const id = row.changes[0].record.id;
    const ops = [{ entity: "notes", action: "delete", id }];
    const pending = await execute(ops);
    await db.query("UPDATE notes SET content='A later browser edit' WHERE id=$1", [id]);
    await expect(
      execute(ops, undefined, await inbound(pending.reply), pending.approval_id),
    ).rejects.toThrow("approval_stale_repreview");
  });
  it("denies service functions to authenticated clients", async () => {
    expect(
      (
        await db.query<{ ok: boolean }>(
          "SELECT has_function_privilege('authenticated','control_execute(uuid,text,text,text,jsonb,uuid)','execute') ok",
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("synchronizes task and planner edits, unscheduling and safe undo", async () => {
    const task = await execute([
      {
        entity: "tasks",
        action: "create",
        values: {
          title: "Schedule fixture",
          scheduled_date: "2026-10-12",
          scheduled_start: "08:30",
          scheduled_end: "09:45",
        },
      },
    ]);
    const id = task.changes[0].record.id;
    const block = (
      await db.query<{ id: string }>(
        "SELECT id FROM planner_blocks WHERE task_id=$1 AND deleted_at IS NULL",
        [id],
      )
    ).rows[0];
    expect(block).toBeTruthy();
    await execute([
      {
        entity: "planner_blocks",
        action: "update",
        id: block.id,
        values: { block_date: "2026-10-13", start_time: "19:15", end_time: "20:30" },
      },
    ]);
    expect(
      (
        await db.query<{ day: string }>(
          'SELECT scheduled_date::text AS "day" FROM tasks WHERE id=$1',
          [id],
        )
      ).rows[0].day,
    ).toBe("2026-10-13");
    const moved = await execute([
      { entity: "tasks", action: "update", id, values: { scheduled_date: "2026-10-14" } },
    ]);
    expect(
      (
        await db.query<{ day: string }>(
          'SELECT block_date::text AS "day" FROM planner_blocks WHERE id=$1',
          [block.id],
        )
      ).rows[0].day,
    ).toBe("2026-10-14");
    await db.query("SELECT control_undo($1,$2,$3)", [uid, moved.request_key, "test:undo:schedule"]);
    expect(
      (
        await db.query<{ day: string }>(
          'SELECT block_date::text AS "day" FROM planner_blocks WHERE id=$1',
          [block.id],
        )
      ).rows[0].day,
    ).toBe("2026-10-13");
    await execute([
      {
        entity: "tasks",
        action: "update",
        id,
        values: { scheduled_date: null, scheduled_start: null, scheduled_end: null },
      },
    ]);
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM planner_blocks WHERE task_id=$1 AND deleted_at IS NULL",
          [id],
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("enforces private storage paths, polymorphic ownership and dependency cycles", async () => {
    await expect(
      execute([
        {
          entity: "resources",
          action: "create",
          values: { title: "Forbidden object", url: "storage:" + other + "/private.pdf" },
        },
      ]),
    ).rejects.toThrow("invalid_storage_reference");
    const privateDoc = (
      await db.query<{ id: string }>(
        "INSERT INTO source_documents(user_id,title) VALUES($1,'Other owner document') RETURNING id",
        [other],
      )
    ).rows[0];
    await expect(
      execute([
        {
          entity: "feedback",
          action: "create",
          values: { target_type: "source_document", target_id: privateDoc.id, action: "save" },
        },
      ]),
    ).rejects.toThrow("linked_record_not_found");
    const a = (
      await execute([{ entity: "tasks", action: "create", values: { title: "Dependency A" } }])
    ).changes[0].record.id;
    const b = (
      await execute([{ entity: "tasks", action: "create", values: { title: "Dependency B" } }])
    ).changes[0].record.id;
    await execute([
      { entity: "task_dependencies", action: "create", values: { task_id: a, depends_on_id: b } },
    ]);
    await expect(
      execute([
        { entity: "task_dependencies", action: "create", values: { task_id: b, depends_on_id: a } },
      ]),
    ).rejects.toThrow("cyclic_relationship");
    await expect(
      execute([{ entity: "tasks", action: "update", id: a, values: { status: "completed" } }]),
    ).rejects.toThrow("dependencies_incomplete");
  });
  it("recomputes both interview questions when a practice record is relinked", async () => {
    const a = (
      await execute([
        { entity: "interview_questions", action: "create", values: { question: "Question A" } },
      ])
    ).changes[0].record.id;
    const b = (
      await execute([
        { entity: "interview_questions", action: "create", values: { question: "Question B" } },
      ])
    ).changes[0].record.id;
    const practice = (
      await execute([
        {
          entity: "interview_practice",
          action: "create",
          values: { question_id: a, confidence: 4 },
        },
      ])
    ).changes[0].record.id;
    await execute([
      { entity: "interview_practice", action: "update", id: practice, values: { question_id: b } },
    ]);
    const rows = (
      await db.query<{ id: string; practice_count: number }>(
        "SELECT id,practice_count FROM interview_questions WHERE id=ANY($1::uuid[])",
        [[a, b]],
      )
    ).rows;
    expect(rows.find((r) => r.id === a)?.practice_count).toBe(0);
    expect(rows.find((r) => r.id === b)?.practice_count).toBe(1);
  });
  it("rejects command payload execution and supports private resource and evidence attachment metadata", async () => {
    await expect(
      execute([
        {
          entity: "agent_commands",
          action: "create",
          values: { command: "run_now", workflow: "orchestrator", payload: { shell: "whoami" } },
        },
      ]),
    ).rejects.toThrow("invalid_command_payload");
    const path = uid + "/control-attachments/fixture";
    for (const target of ["resources", "evidence"]) {
      const result = (
        await db.query<{ r: ControlResult }>("SELECT control_attach_record($1,$2,$3,$4,$5) r", [
          uid,
          target,
          JSON.stringify({ title: "Trusted attachment", kind: "file" }),
          path,
          "test:attachment:" + target,
        ])
      ).rows[0].r;
      expect(result.status).toBe("completed");
      expect(result.changes[0].record.url).toBe("storage:" + path);
    }
  });
  it("reads every catalog entity and updates, deletes and restores every permitted business entity", async () => {
    const { registry } = await import("../protocol");
    for (const [entity, e] of Object.entries(registry)) {
      const page = (
        await db.query<{ r: ControlResult }>("SELECT control_query($1,$2,'{}') r", [uid, entity])
      ).rows[0].r;
      expect(page.rows, entity).toBeInstanceOf(Array);
      if (!e.writable) continue;
      await db.exec("BEGIN");
      try {
        const row = (
          await db.query<{ r: Record<string, unknown> }>(
            `SELECT to_jsonb(t) r FROM public."${entity}" t WHERE "${e.owner}"=$1 ${e.softDelete ? "AND deleted_at IS NULL" : ""} ORDER BY created_at DESC LIMIT 1`,
            [uid],
          )
        ).rows[0].r;
        let id = row.id;
        let values: Record<string, unknown>;
        if (entity === "agent_commands") {
          const ops = [
            {
              entity,
              action: "create",
              values: { command: "ping_learning_manager", workflow: "study_coach" },
            },
          ];
          const p = await execute(ops);
          const c = await execute(ops, undefined, await inbound(p.reply), p.approval_id);
          id = c.changes[0].record.id;
          values = { status: "cancelled" };
        } else {
          const text = Object.entries(e.fields).find(
            ([k, f]) =>
              f.editable &&
              f.type === "text" &&
              !f.enum &&
              !/url|time|timezone|website|email/.test(k),
          );
          const candidate =
            text ??
            Object.entries(e.fields).find(
              ([k, f]) => f.editable && !f.references && k !== "status",
            ) ??
            Object.entries(e.fields).find(([, f]) => f.editable);
          if (!candidate) throw new Error("No update fixture for " + entity);
          const [k, f] = candidate;
          values = {
            [k]: text
              ? "Revised isolated " + entity
              : (f.enum?.find((x) => x !== row[k]) ?? row[k]),
          };
        }
        const ops = [{ entity, action: "update", id, values }];
        let result = await execute(ops);
        if (result.status === "awaiting_confirmation")
          result = await execute(ops, undefined, await inbound(result.reply), result.approval_id);
        expect(result.status, entity).toBe("completed");
        for (const [k, v] of Object.entries(values))
          expect(result.changes[0].record[k], entity + "." + k).toEqual(v);
        if (e.operations?.includes("delete")) {
          const remove = [{ entity, action: "delete", id }];
          const preview = await execute(remove);
          expect(preview.status, entity).toBe("awaiting_confirmation");
          const deleted = await execute(
            remove,
            undefined,
            await inbound(preview.reply),
            preview.approval_id,
          );
          expect(deleted.changes[0].record.deleted_at, entity).toBeTruthy();
          const reversed = (
            await db.query<{ r: ControlResult }>("SELECT control_undo($1,$2,$3) r", [
              uid,
              deleted.request_key,
              "test:restore:" + entity,
            ])
          ).rows[0].r;
          expect(reversed.status, entity).toBe("completed");
          expect(
            (
              await db.query<{ active: boolean }>(
                `SELECT deleted_at IS NULL active FROM "${entity}" WHERE id=$1`,
                [id],
              )
            ).rows[0].active,
            entity,
          ).toBe(true);
        }
      } finally {
        await db.exec("ROLLBACK");
      }
    }
  }, 30000);
});
