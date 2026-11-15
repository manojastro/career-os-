import { it, expect } from "vitest";
import {
  auditLabel,
  changeLabel,
  hermesMessages,
  pendingConfirmations,
  usageLabel,
  usageSummary,
  workerActivity,
} from "./activity";
const run = (id: string, usage: Record<string, unknown>, started_at = "2026-11-01T05:00:00Z") => ({
  id,
  usage,
  started_at,
  finished_at: null,
});
it("never turns unreported usage into zero tokens or zero cost", () => {
  expect(usageLabel(usageSummary([]))).toBe("No runs yet");
  expect(usageLabel(usageSummary([run("a", {}), run("b", {})]))).toBe(
    "Last 2 runs · usage not reported",
  );
  expect(
    usageLabel(
      usageSummary([
        run("a", { input_tokens: 1000, output_tokens: 234 }),
        run("b", { cost_usd: 0.25, input_tokens: "n/a" }),
        run("c", {}),
      ]),
    ),
  ).toBe("Last 3 runs · 1,234 tokens (1 of 3 runs reported) · $0.25 (1 of 3 runs reported)");
});
it("reports the latest recorded worker activity and commands nobody has claimed", () => {
  const now = Date.parse("2026-11-02T06:00:00Z");
  const activity = workerActivity(
    [{ ...run("r", {}), finished_at: "2026-11-02T04:00:00Z" }],
    [
      { id: "1", status: "completed", created_at: "x", claimed_at: "2026-11-02T04:30:00Z" },
      { id: "2", status: "queued", created_at: "2026-11-02T05:40:00Z" },
      { id: "3", status: "queued", created_at: "2026-11-02T05:55:00Z" },
    ],
    now,
  );
  expect(activity).toEqual({ last: "2026-11-02T04:30:00.000Z", waiting: 1, online: null });
  expect(workerActivity([], [], now)).toEqual({ last: null, waiting: 0, online: null });
  // A recorded poll check-in turns "unknown" into a real online/offline answer.
  expect(workerActivity([], [], now, "2026-11-02T05:58:00Z")).toEqual({
    last: "2026-11-02T05:58:00.000Z",
    waiting: 0,
    online: true,
  });
  expect(workerActivity([], [], now, "2026-11-02T05:00:00Z").online).toBe(false);
});
it("lists pending Telegram confirmations from both approval systems, soonest expiry first", () => {
  const now = Date.parse("2026-11-02T06:00:00Z");
  const v1 = [
    {
      id: "a1",
      operations: [
        { entity: "tasks", action: "create" },
        { entity: "tasks", action: "create" },
        { entity: "goals", action: "update" },
      ],
      expires_at: "2026-11-02T06:05:00Z",
      consumed_at: null,
    },
    {
      id: "a2",
      operations: [{ action: "undo", request_key: "tg:x" }],
      expires_at: "2026-11-02T06:06:00Z",
      consumed_at: null,
    },
    {
      id: "a3",
      operations: [{ action: "learning_workflow", operation: "sync_guide" }],
      expires_at: "2026-11-02T06:07:00Z",
      consumed_at: null,
    },
    { id: "old", operations: [], expires_at: "2026-11-02T05:00:00Z", consumed_at: null },
    { id: "used", operations: [], expires_at: "2026-11-02T06:09:00Z", consumed_at: "x" },
  ];
  const v2 = [
    {
      id: "w1",
      state: "awaiting_confirmation",
      approval_id: "ap",
      approval_expires_at: "2026-11-02T06:08:00Z",
      plan: [{ kind: "task.create" }, { kind: "memory.put" }],
    },
    { id: "w2", state: "completed", approval_id: "x", approval_expires_at: "2026-11-02T06:09:00Z" },
  ];
  expect(pendingConfirmations(v1, v2, now)).toEqual([
    {
      id: "a1",
      reply: "confirm a1",
      summary: "3 changes: tasks create ×2, goals update",
      expires_at: "2026-11-02T06:05:00Z",
    },
    {
      id: "a2",
      reply: "confirm a2",
      summary: "Undo an earlier change",
      expires_at: "2026-11-02T06:06:00Z",
    },
    {
      id: "a3",
      reply: "confirm a3",
      summary: "Learning: sync guide",
      expires_at: "2026-11-02T06:07:00Z",
    },
    {
      id: "w1",
      reply: "confirm v2 ap",
      summary: "Workflow with 2 steps: task.create, memory.put",
      expires_at: "2026-11-02T06:08:00Z",
    },
  ]);
});
it("groups Hermes calls per Telegram message and never needs payload text", () => {
  const rows = [
    {
      id: "1",
      action: "control_call",
      created_at: "2026-11-02T05:00:01Z",
      detail: { message_ref: "42", operation: "begin", http_status: 200, duration_ms: 30 },
    },
    {
      id: "2",
      action: "control_call",
      created_at: "2026-11-02T05:00:03Z",
      detail: { message_ref: "42", operation: "query", step: "tasks", duration_ms: 120 },
    },
    {
      id: "3",
      action: "control_rejected",
      created_at: "2026-11-02T05:00:04Z",
      detail: { message_ref: "42", operation: "execute", error: "invalid_enum", duration_ms: 15 },
    },
    {
      id: "4",
      action: "control_call",
      created_at: "2026-11-02T06:00:00Z",
      detail: { message_ref: "43", operation: "begin", duration_ms: 25 },
    },
    { id: "5", action: "update", created_at: "2026-11-02T06:01:00Z", detail: {} },
  ];
  expect(hermesMessages(rows)).toEqual([
    { message_ref: "43", at: "2026-11-02T06:00:00Z", calls: [], rejected: [], duration_ms: 25 },
    {
      message_ref: "42",
      at: "2026-11-02T05:00:01Z",
      calls: ["query tasks"],
      rejected: ["execute: invalid enum"],
      duration_ms: 165,
    },
  ]);
});
it("labels Hermes changes and audit events in plain words with a page to open", () => {
  expect(changeLabel({ id: "c", before_row: null, after_row: { title: "Ship RAG" } })).toEqual({
    verb: "created",
    title: "Ship RAG",
  });
  expect(
    changeLabel({
      id: "c",
      before_row: { company: "Acme", role: "ML Engineer" },
      after_row: { company: "Acme", role: "ML Engineer", deleted_at: "x" },
    }),
  ).toEqual({ verb: "deleted", title: "Acme · ML Engineer" });
  expect(
    changeLabel({ id: "c", before_row: { name: "Priya" }, after_row: { name: "Priya Shah" } }),
  ).toEqual({ verb: "updated", title: "Priya Shah" });
  expect(
    auditLabel({
      id: "e",
      actor: "agent",
      action: "update",
      entity_type: "job_leads",
      detail: { status: "saved" },
    }),
  ).toEqual({ text: "Agent updated job leads → saved", path: "/jobs" });
  expect(
    auditLabel({
      id: "e",
      actor: "user",
      action: "insert",
      entity_type: "agent_commands",
      detail: {},
    }),
  ).toEqual({ text: "You created agent commands", path: "/agent" });
});
