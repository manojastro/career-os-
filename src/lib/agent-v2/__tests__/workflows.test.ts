import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid, other } from "./database";
let db: PGlite,
  n = 0;
type Result = {
  id: string;
  plan_hash: string;
  approval_id: string;
  state: string;
  steps: { id: string; status: string; result: { id: string }; lease_token: string }[];
};
const call = async (input: object, key = "web:workflow:" + ++n, owner = uid) =>
  (
    await db.query<{ r: Result }>("SELECT agent_v2_workflow($1,$2,$3,$4,NULL,NULL) r", [
      owner,
      key,
      JSON.stringify(input),
      "Original owner instruction",
    ])
  ).rows[0].r;
const plan = [
  { id: "task", kind: "task.create", depends_on: [], input: { title: "Durable task" } },
  {
    id: "fact",
    kind: "memory.put",
    depends_on: ["task"],
    input: { key: "workflow fact", category: "knowledge", value: "retained" },
  },
];
const claim = async (id: string) =>
  (
    await db.query<{ r: { step_id: string; token: string } | null }>(
      "SELECT agent_v2_workflow_claim($1,$2) r",
      [uid, id],
    )
  ).rows[0].r;
const finish = async (id: string, c: { step_id: string; token: string }) =>
  db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)", [uid, id, c.step_id, c.token]);
const approve = async (p: Result) =>
  call({
    action: "confirm",
    id: p.id,
    approval_id: p.approval_id,
    expected_plan_hash: p.plan_hash,
    confirm: true,
  });
beforeAll(async () => {
  db = await createV2Database([
    "0006_agent_v2_focus.sql",
    "0007_agent_v2_memory_documents.sql",
    "0008_agent_v2_workflows.sql",
  ]);
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("rejects expired approvals, tampered plans, cross-owner reads and direct table writes", async () => {
  const p = await call({ action: "prepare", steps: plan });
  await expect(
    db.query("UPDATE agent_v2_workflows SET plan='[]' WHERE id=$1", [p.id]),
  ).rejects.toThrow("permission denied");
  await expect(
    db.query("SELECT agent_v2_workflow_provider_finish($1,$2,'task',$3,'{}',NULL)", [
      uid,
      p.id,
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow("permission denied");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflows SET approval_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
    [p.id],
  );
  await asRole(db, "authenticated");
  await expect(approve(p)).rejects.toThrow("invalid_confirmation");
  expect(await claim(p.id)).toBeNull();
  await asRole(db, "authenticated", other);
  await expect(call({ action: "get", id: p.id }, undefined, other)).rejects.toThrow(
    "workflow_not_found",
  );
  expect((await db.query("SELECT id FROM agent_v2_workflows")).rows).toEqual([]);
  await asRole(db, "authenticated");
  const listed = (
    await db.query<{ r: { items: Record<string, unknown>[] } }>(
      "SELECT agent_v2_workflow($1,'web:list:test','{\"action\":\"list\",\"limit\":1}','list',NULL,NULL) r",
      [uid],
    )
  ).rows[0].r;
  expect(listed.items.length).toBe(1);
  expect(listed.items[0]).not.toHaveProperty("plan");
  expect(listed.items[0]).not.toHaveProperty("instruction");
});
it("resolves prior canonical IDs for Focus and journals exactly one time effect", async () => {
  const p = await call({
    action: "prepare",
    steps: [
      { ...plan[0], input: { title: "Bound focus task" } },
      {
        id: "start",
        kind: "focus.transition",
        depends_on: ["task"],
        input: { action: "start", task_id: { step: "task", alias: "id" } },
      },
      {
        id: "finish",
        kind: "focus.transition",
        depends_on: ["start"],
        input: { action: "finish", session_id: { step: "start", alias: "id" }, complete: false },
      },
    ],
  });
  await approve(p);
  await finish(p.id, (await claim(p.id))!);
  await finish(p.id, (await claim(p.id))!);
  const active = await call({ action: "get", id: p.id });
  const interval = active.steps[1].result.id;
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_focus_intervals SET started_at=clock_timestamp()-interval '2 minutes',running_since=clock_timestamp()-interval '2 minutes' WHERE id=$1",
    [interval],
  );
  await asRole(db, "authenticated");
  const last = (await claim(p.id))!;
  await finish(p.id, last);
  await finish(p.id, last);
  expect((await call({ action: "get", id: p.id })).state).toBe("completed");
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ n: number }>("SELECT count(*)::int n FROM focus_sessions WHERE id=$1", [
        interval,
      ])
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.query<{ actual_minutes: number }>("SELECT actual_minutes FROM tasks WHERE id=$1", [
        active.steps[0].result.id,
      ])
    ).rows[0].actual_minutes,
  ).toBe(2);
  await asRole(db, "authenticated");
});
it("rejects invalid operational facts and invalidates a confirmed default after target deletion", async () => {
  for (const [key, category, value] of [
    ["reminder_default_time", "preference", "25:10"],
    ["default_document_id", "knowledge", "bullets"],
    ["default_project_id", "preference", other],
  ]) {
    await db.query("SELECT agent_v2_memory($1,$2,$3)", [
      uid,
      "web:invalid:" + ++n,
      JSON.stringify({ action: "put", key, category, value }),
    ]);
    const p = await call({
      action: "prepare",
      steps: [
        {
          id: "promote",
          kind: "memory.confirm",
          depends_on: [],
          input: { key, expected_version: 1 },
        },
      ],
    });
    await approve(p);
    await finish(p.id, (await claim(p.id))!);
    expect((await call({ action: "get", id: p.id })).state).toBe("partial");
  }
  await db.exec("RESET ROLE");
  const project = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'Preference target') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
  await db.query("SELECT agent_v2_memory($1,'web:target:put',$2)", [
    uid,
    JSON.stringify({
      action: "put",
      key: "default_project_id",
      category: "preference",
      value: project,
      expected_version: 1,
    }),
  ]);
  const p = await call({
    action: "prepare",
    steps: [
      {
        id: "promote",
        kind: "memory.confirm",
        depends_on: [],
        input: { key: "default_project_id", expected_version: 2 },
      },
    ],
  });
  await approve(p);
  await finish(p.id, (await claim(p.id))!);
  const get = async () =>
    (
      await db.query<{ r: { operational: boolean } }>(
        'SELECT agent_v2_memory($1,\'web:target:get\',\'{"action":"get","key":"default_project_id"}\') r',
        [uid],
      )
    ).rows[0].r;
  expect((await get()).operational).toBe(true);
  await db.exec("RESET ROLE");
  await db.query("UPDATE projects SET deleted_at=now() WHERE id=$1", [project]);
  await asRole(db, "authenticated");
  expect((await get()).operational).toBe(false);
});
it("previews immutable plans and binds approval to owner, hash, source and single use", async () => {
  const p = await call({ action: "prepare", steps: plan }, "web:workflow:identity");
  expect(p.state).toBe("awaiting_confirmation");
  expect((await call({ action: "prepare", steps: plan }, "web:workflow:identity")).id).toBe(p.id);
  await expect(
    call({ action: "prepare", steps: [plan[0]] }, "web:workflow:identity"),
  ).rejects.toThrow("idempotency_conflict");
  await expect(
    call({
      action: "confirm",
      id: p.id,
      approval_id: p.approval_id,
      expected_plan_hash: "0".repeat(64),
      confirm: true,
    }),
  ).rejects.toThrow("invalid_confirmation");
  await expect(call({ action: "get", id: p.id }, undefined, other)).rejects.toThrow(
    "learning_access_denied",
  );
  expect(
    (
      await call({
        action: "confirm",
        id: p.id,
        approval_id: p.approval_id,
        expected_plan_hash: p.plan_hash,
        confirm: true,
      })
    ).state,
  ).toBe("ready");
  await expect(
    call({
      action: "confirm",
      id: p.id,
      approval_id: p.approval_id,
      expected_plan_hash: p.plan_hash,
      confirm: true,
    }),
  ).rejects.toThrow("invalid_confirmation");
});
it("keeps committed earlier steps truthful when a dependent action fails and exhausts retries", async () => {
  const p = await call({
    action: "prepare",
    steps: [
      { ...plan[0], input: { title: "Partial survives" } },
      {
        id: "bad",
        kind: "task.update",
        depends_on: ["task"],
        input: {
          id: { step: "task", alias: "id" },
          expected_updated_at: "2000-01-01T00:00:00Z",
          title: "Missing",
        },
      },
      {
        id: "blocked",
        kind: "memory.put",
        depends_on: ["bad"],
        input: { key: "never saved", category: "knowledge", value: "blocked" },
      },
    ],
  });
  await approve(p);
  await finish(p.id, (await claim(p.id))!);
  for (let attempt = 0; attempt < 3; attempt++) {
    await finish(p.id, (await claim(p.id))!);
    await db.exec("RESET ROLE");
    await db.query(
      "UPDATE agent_v2_workflow_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE workflow_id=$1",
      [p.id],
    );
    await asRole(db, "authenticated");
  }
  const state = await call({ action: "get", id: p.id });
  expect(state.state).toBe("dead_letter");
  expect(state.steps.map((s) => s.status)).toEqual(["succeeded", "dead_letter", "blocked"]);
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int n FROM tasks WHERE title='Partial survives'",
      )
    ).rows[0].n,
  ).toBe(1);
  await asRole(db, "authenticated");
});
it("reclaims expired local work, fences stale tokens, and retains cancellation truth", async () => {
  const p = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "Reclaim once" } }],
  });
  const old = (await claim(p.id))!;
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET lease_deadline=clock_timestamp()-interval '1 second' WHERE workflow_id=$1",
    [p.id],
  );
  await asRole(db, "authenticated");
  expect(await claim(p.id)).toBeNull();
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE workflow_id=$1",
    [p.id],
  );
  await asRole(db, "authenticated");
  const fresh = (await claim(p.id))!;
  expect(fresh.token).not.toBe(old.token);
  await expect(finish(p.id, old)).rejects.toThrow("stale_lease");
  await call({ action: "cancel", id: p.id });
  await finish(p.id, fresh);
  const cancelled = await call({ action: "get", id: p.id });
  expect(cancelled.state).toBe("cancelled");
  expect(cancelled.steps[0].status).toBe("succeeded");
  expect(await claim(p.id)).toBeNull();
  const before = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "Cancelled before claim" } }],
  });
  await call({ action: "cancel", id: before.id });
  expect(await claim(before.id)).toBeNull();
});
it("reuses a unique compatible canonical task and blocks conflicting duplicates", async () => {
  const make = () =>
    call({
      action: "prepare",
      steps: [{ ...plan[0], input: { title: " No   duplicate task ", type: "Build" } }],
    });
  const a = await make();
  await finish(a.id, (await claim(a.id))!);
  const id = (await call({ action: "get", id: a.id })).steps[0].result.id;
  const b = await make();
  await finish(b.id, (await claim(b.id))!);
  expect((await call({ action: "get", id: b.id })).steps[0].result.id).toBe(id);
  const conflict = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "no duplicate TASK", type: "Learn" } }],
  });
  await finish(conflict.id, (await claim(conflict.id))!);
  expect((await call({ action: "get", id: conflict.id })).state).toBe("partial");
});
it("registers actual document metadata and rejects deleted parents at execution", async () => {
  await db.exec("RESET ROLE");
  const project = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'Deleted before execution') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
  const p = await call({
    action: "prepare",
    steps: [
      {
        id: "doc",
        kind: "document.register",
        depends_on: [],
        input: {
          file_id: "workflow_document_fixture",
          kind: "doc",
          title: "Registered workflow document",
          category: "knowledge",
          permitted_operations: ["read"],
        },
      },
    ],
  });
  await finish(p.id, (await claim(p.id))!);
  const d = (await call({ action: "get", id: p.id })).steps[0].result.id;
  expect(d).toBeTruthy();
  const missing = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "Deleted parent must reject", project_id: project } }],
  });
  await db.exec("RESET ROLE");
  await db.query("UPDATE projects SET deleted_at=now() WHERE id=$1", [project]);
  await asRole(db, "authenticated");
  await finish(missing.id, (await claim(missing.id))!);
  expect((await call({ action: "get", id: missing.id })).state).toBe("partial");
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ status: string }>(
        "SELECT status FROM agent_v2_documents_registry WHERE id=$1",
        [d],
      )
    ).rows[0].status,
  ).toBe("unverified");
  await asRole(db, "authenticated");
});
it("rejects cyclic, forward, duplicate and unowned bindings and stale versions", async () => {
  for (const steps of [
    [{ ...plan[0], depends_on: ["future"] }],
    [plan[0], plan[0]],
    [{ ...plan[0], input: { title: "X", project_id: { step: "alien", alias: "id" } } }],
    [{ ...plan[0], input: { title: "X", sql: "select 1" } }],
  ])
    await expect(call({ action: "prepare", steps })).rejects.toThrow();
  const p = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "CAS seed" } }],
  });
  await finish(p.id, (await claim(p.id))!);
  const id = (await call({ action: "get", id: p.id })).steps[0].result.id;
  const stale = await call({
    action: "prepare",
    steps: [
      {
        id: "stale",
        kind: "task.update",
        depends_on: [],
        input: { id, expected_updated_at: "2000-01-01T00:00:00Z", title: "Should not apply" },
      },
    ],
  });
  await finish(stale.id, (await claim(stale.id))!);
  expect((await call({ action: "get", id: stale.id })).state).toBe("partial");
});
it("requires exact actual Telegram source text and guards exposed direct V1 and V2 writes", async () => {
  const chat = "a".repeat(64);
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,'900','Create task and fact')",
    [uid, chat],
  );
  await asRole(db, "service_role");
  const tg = async (input: object, message = "900") =>
    (
      await db.query<{ r: Result }>("SELECT agent_v2_workflow($1,$2,$3,NULL,$4,$5) r", [
        uid,
        `tg:${chat}:${message}:v2:workflow`,
        JSON.stringify(input),
        chat,
        message,
      ])
    ).rows[0].r;
  const p = await tg({ action: "prepare", steps: plan });
  await expect(
    tg({
      action: "confirm",
      id: p.id,
      approval_id: p.approval_id,
      expected_plan_hash: p.plan_hash,
      confirm: true,
    }),
  ).rejects.toThrow("invalid_confirmation");
  await asRole(db, "authenticated");
  await expect(approve(p)).rejects.toThrow("invalid_confirmation");
  await expect(
    db.query("SELECT agent_v2_mark_source_exposure($1,$2,$3,$4)", [
      uid,
      chat,
      crypto.randomUUID(),
      "b".repeat(64),
    ]),
  ).rejects.toThrow("permission denied");
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,'901',$3)",
    [uid, chat, "confirm v2 " + p.approval_id],
  );
  await asRole(db, "service_role");
  await tg(
    {
      action: "confirm",
      id: p.id,
      approval_id: p.approval_id,
      expected_plan_hash: p.plan_hash,
      confirm: true,
    },
    "901",
  );
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,'902','Create one task before exposure')",
    [uid, chat],
  );
  await asRole(db, "service_role");
  const beforeExposure = await tg(
    { action: "prepare", steps: [{ ...plan[0], input: { title: "Exposure race must preview" } }] },
    "902",
  );
  const beforeClaim = (await claim(beforeExposure.id))!;
  await db.query("SELECT agent_v2_mark_source_exposure($1,$2,$3,$4)", [
    uid,
    chat,
    crypto.randomUUID(),
    "b".repeat(64),
  ]);
  await finish(beforeExposure.id, beforeClaim);
  await expect(db.query("SELECT agent_v2_control_guard($1,$2,'902')", [uid, chat])).rejects.toThrow(
    "source_approval_required",
  );
  expect((await tg({ action: "get", id: beforeExposure.id }, "902")).state).toBe(
    "awaiting_confirmation",
  );
  await expect(
    db.query("SELECT agent_v2_memory($1,'web:exposed:put',$2)", [
      uid,
      JSON.stringify({ action: "put", category: "knowledge", key: "injected", value: "bad" }),
    ]),
  ).rejects.toThrow("source_approval_required");
  const v1 = (
    await db.query<{ r: { status: string } }>(
      "SELECT control_execute($1,$2,'900','tg:source:guard',$3) r",
      [
        uid,
        chat,
        JSON.stringify([
          { entity: "tasks", action: "create", values: { title: "V1 exposed preview" } },
        ]),
      ],
    )
  ).rows[0].r;
  expect(v1.status).toBe("awaiting_confirmation");
  await finish(p.id, (await claim(p.id))!);
  await finish(p.id, (await claim(p.id))!);
  expect((await tg({ action: "get", id: p.id })).state).toBe("completed");
  await asRole(db, "authenticated");
  expect((await call({ action: "prepare", steps: [plan[0]] })).state).toBe("ready");
  await db.exec("RESET ROLE");
  await db.query("DELETE FROM agent_v2_source_exposures WHERE user_id=$1", [uid]);
  await asRole(db, "authenticated");
});
it("approves only typed preferences and correction revokes eligibility", async () => {
  await db.query("SELECT agent_v2_memory($1,'web:pref:put',$2)", [
    uid,
    JSON.stringify({
      action: "put",
      category: "preference",
      key: "preferred_doc_format",
      value: "bullets",
    }),
  ]);
  const p = await call({
    action: "prepare",
    steps: [
      {
        id: "confirm",
        kind: "memory.confirm",
        depends_on: [],
        input: { key: "preferred_doc_format", expected_version: 1 },
      },
    ],
  });
  expect(p.state).toBe("awaiting_confirmation");
  await call({
    action: "confirm",
    id: p.id,
    approval_id: p.approval_id,
    expected_plan_hash: p.plan_hash,
    confirm: true,
  });
  const c = (
    await db.query<{ r: { step_id: string; token: string } }>(
      "SELECT agent_v2_workflow_claim($1,$2) r",
      [uid, p.id],
    )
  ).rows[0].r;
  await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)", [uid, p.id, c.step_id, c.token]);
  let fact = (
    await db.query<{ r: { operational: boolean } }>(
      'SELECT agent_v2_memory($1,\'web:pref:get\',\'{"action":"get","key":"preferred_doc_format"}\') r',
      [uid],
    )
  ).rows[0].r;
  expect(fact.operational).toBe(true);
  await db.query("SELECT agent_v2_memory($1,'web:pref:fix',$2)", [
    uid,
    JSON.stringify({
      action: "put",
      category: "preference",
      key: "preferred_doc_format",
      value: "plain_text",
      expected_version: 1,
    }),
  ]);
  fact = (
    await db.query<{ r: { operational: boolean } }>(
      'SELECT agent_v2_memory($1,\'web:pref:get\',\'{"action":"get","key":"preferred_doc_format"}\') r',
      [uid],
    )
  ).rows[0].r;
  expect(fact.operational).toBe(false);
});
it("commits local effects and receipt atomically; lost response and restart never duplicate", async () => {
  let p = await call({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "Lost response task" } }],
  });
  const c = (
    await db.query<{ r: { step_id: string; token: string } }>(
      "SELECT agent_v2_workflow_claim($1,$2) r",
      [uid, p.id],
    )
  ).rows[0].r;
  expect(c.step_id).toBe("task");
  await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)", [uid, p.id, c.step_id, c.token]);
  await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)", [uid, p.id, c.step_id, c.token]);
  p = await call({ action: "get", id: p.id });
  expect(p.state).toBe("completed");
  expect(p.steps[0].result.id).toBeTruthy();
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int n FROM tasks WHERE title='Lost response task'",
      )
    ).rows[0].n,
  ).toBe(1);
  await asRole(db, "authenticated");
});
it("returns a retrying single Telegram step to preview when exposure precedes reclaim", async () => {
  const chat = "c".repeat(64);
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO tasks(user_id,title) VALUES($1,'Exposure retry twin'),($1,'exposure  retry twin')",
    [uid],
  );
  await db.query(
    "INSERT INTO control_messages(user_id,chat_ref,message_ref,text) VALUES($1,$2,'950','Create exposure retry twin')",
    [uid, chat],
  );
  await asRole(db, "service_role");
  const tg = async (input: object) =>
    (
      await db.query<{ r: Result }>("SELECT agent_v2_workflow($1,$2,$3,NULL,$4,'950') r", [
        uid,
        `tg:${chat}:950:v2:workflow`,
        JSON.stringify(input),
        chat,
      ])
    ).rows[0].r;
  const p = await tg({
    action: "prepare",
    steps: [{ ...plan[0], input: { title: "Exposure retry twin" } }],
  });
  expect(p.state).toBe("ready");
  await finish(p.id, (await claim(p.id))!);
  expect((await tg({ action: "get", id: p.id })).state).toBe("partial");
  await db.query("SELECT agent_v2_mark_source_exposure($1,$2,$3,$4)", [
    uid,
    chat,
    crypto.randomUUID(),
    "d".repeat(64),
  ]);
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE workflow_id=$1",
    [p.id],
  );
  await asRole(db, "service_role");
  expect(await claim(p.id)).toBeNull();
  const held = (await tg({ action: "get", id: p.id })) as Result & {
    steps: { attempts: number; permission_decision: string }[];
  };
  expect(held.state).toBe("awaiting_confirmation");
  expect(held.steps[0]).toMatchObject({
    status: "failed",
    attempts: 1,
    permission_decision: "approval_required",
  });
  await db.exec("RESET ROLE");
  await db.query("DELETE FROM agent_v2_source_exposures WHERE user_id=$1", [uid]);
  await asRole(db, "authenticated");
});
it("halts on a lease-expiry dead letter and keeps uncertain sibling truth after local finish", async () => {
  const independent = (title: string) => [
    { id: "a", kind: "task.create", depends_on: [], input: { title: title + " A" } },
    { id: "b", kind: "task.create", depends_on: [], input: { title: title + " B" } },
  ];
  const dead = await call({ action: "prepare", steps: independent("Dead lease") });
  await approve(dead);
  expect((await claim(dead.id))!.step_id).toBe("a");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET attempts=3,lease_deadline=clock_timestamp()-interval '1 second' WHERE workflow_id=$1 AND id='a'",
    [dead.id],
  );
  await asRole(db, "authenticated");
  expect(await claim(dead.id)).toBeNull();
  const halted = await call({ action: "get", id: dead.id });
  expect(halted.state).toBe("dead_letter");
  expect(halted.steps.map((s) => s.status)).toEqual(["dead_letter", "pending"]);
  // Synthetic state-machine fixture only; 0008 registers no external kind.
  await db.exec("RESET ROLE");
  await db.exec(
    "INSERT INTO agent_v2_kind_policy VALUES('fixture.external','external_write',true) ON CONFLICT DO NOTHING",
  );
  await asRole(db, "authenticated");
  const mixed = await call({ action: "prepare", steps: independent("Uncertain sibling") });
  await approve(mixed);
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET kind='fixture.external' WHERE workflow_id=$1 AND id='b'",
    [mixed.id],
  );
  await asRole(db, "authenticated");
  const local = (await claim(mixed.id))!;
  const external = (await claim(mixed.id))!;
  expect(external.step_id).toBe("b");
  await asRole(db, "service_role");
  await db.query(
    "SELECT agent_v2_workflow_provider_finish($1,$2,'b',$3,NULL,'provider_uncertain')",
    [uid, mixed.id, external.token],
  );
  await asRole(db, "authenticated");
  await finish(mixed.id, local);
  const truth = await call({ action: "get", id: mixed.id });
  expect(truth.state).toBe("uncertain");
  expect(truth.steps.map((s) => s.status)).toEqual(["succeeded", "uncertain"]);
});
