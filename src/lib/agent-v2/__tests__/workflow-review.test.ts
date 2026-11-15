import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid } from "./database";
// Independent-review hardening for the 0008 workflow slice (findings 1 and 2).
let db: PGlite,
  n = 0;
type Result = {
  id: string;
  plan_hash: string;
  approval_id: string;
  state: string;
  steps: { id: string; status: string }[];
};
const call = async (input: object) =>
  (
    await db.query<{ r: Result }>("SELECT agent_v2_workflow($1,$2,$3,$4,NULL,NULL) r", [
      uid,
      "web:review:" + ++n,
      JSON.stringify(input),
      "Original owner instruction",
    ])
  ).rows[0].r;
const claim = async (id: string) =>
  (
    await db.query<{ r: { step_id: string; token: string } | null }>(
      "SELECT agent_v2_workflow_claim($1,$2) r",
      [uid, id],
    )
  ).rows[0].r;
const approve = async (p: Result) =>
  call({
    action: "confirm",
    id: p.id,
    approval_id: p.approval_id,
    expected_plan_hash: p.plan_hash,
    confirm: true,
  });
const put = (id: string, key: string, depends_on: string[] = []) => ({
  id,
  kind: "memory.put",
  depends_on,
  input: { key, category: "preference", value: "bullets" },
});
const confirmStep = (id: string, key: string, depends_on: string[]) => ({
  id,
  kind: "memory.confirm",
  depends_on,
  input: { key, expected_version: 1 },
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
it("refuses a memory.confirm whose value the owner could not see in the preview", async () => {
  // No such memory exists yet: the preview would carry no value to approve.
  await expect(
    call({
      action: "prepare",
      steps: [confirmStep("confirm", "preferred_doc_format", [])],
    }),
  ).rejects.toThrow("invalid_plan");
  // A put for another key, or one the confirm does not depend on, does not make the value visible.
  await expect(
    call({
      action: "prepare",
      steps: [
        put("put", "reminder_default_time"),
        confirmStep("confirm", "preferred_doc_format", ["put"]),
      ],
    }),
  ).rejects.toThrow("invalid_plan");
  await expect(
    call({
      action: "prepare",
      steps: [
        put("put", "preferred_doc_format"),
        confirmStep("confirm", "preferred_doc_format", []),
      ],
    }),
  ).rejects.toThrow("invalid_plan");
  // A prior put of the same key in depends_on shows the value in the same preview.
  const ok = await call({
    action: "prepare",
    steps: [
      put("put", "preferred_doc_format"),
      confirmStep("confirm", "preferred_doc_format", ["put"]),
    ],
  });
  expect(ok.state).toBe("awaiting_confirmation");
  await approve(ok);
  for (let i = 0; i < 2; i++) {
    const c = (await claim(ok.id))!;
    await db.query("SELECT agent_v2_workflow_finish($1,$2,$3,$4)", [
      uid,
      ok.id,
      c.step_id,
      c.token,
    ]);
  }
  expect((await call({ action: "get", id: ok.id })).state).toBe("completed");
  // With an existing fact the preview carries its value, so a bare confirm stays valid.
  const bare = await call({
    action: "prepare",
    steps: [confirmStep("confirm", "preferred_doc_format", [])],
  });
  expect(bare.state).toBe("awaiting_confirmation");
});
it("cancel never hides an uncertain or dead-lettered workflow", async () => {
  const two = (title: string) => [
    { id: "a", kind: "task.create", depends_on: [], input: { title: title + " A" } },
    { id: "b", kind: "task.create", depends_on: [], input: { title: title + " B" } },
    { id: "c", kind: "task.create", depends_on: [], input: { title: title + " C" } },
  ];
  // Synthetic state-machine fixture only; 0008 registers no external kind.
  await db.exec("RESET ROLE");
  await db.exec(
    "INSERT INTO agent_v2_kind_policy VALUES('fixture.external','external_write',true) ON CONFLICT DO NOTHING",
  );
  await asRole(db, "authenticated");
  const unsure = await call({ action: "prepare", steps: two("Cancel uncertain") });
  await approve(unsure);
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET kind='fixture.external' WHERE workflow_id=$1 AND id='a'",
    [unsure.id],
  );
  await asRole(db, "authenticated");
  const external = (await claim(unsure.id))!;
  expect(external.step_id).toBe("a");
  await asRole(db, "service_role");
  await db.query(
    "SELECT agent_v2_workflow_provider_finish($1,$2,'a',$3,NULL,'provider_uncertain')",
    [uid, unsure.id, external.token],
  );
  await asRole(db, "authenticated");
  expect((await call({ action: "get", id: unsure.id })).state).toBe("uncertain");
  const cancelledUncertain = await call({ action: "cancel", id: unsure.id });
  expect(cancelledUncertain.state).toBe("uncertain");
  expect(cancelledUncertain.steps.map((s) => s.status)).toEqual([
    "uncertain",
    "cancelled",
    "cancelled",
  ]);

  const dead = await call({ action: "prepare", steps: two("Cancel dead") });
  await approve(dead);
  expect((await claim(dead.id))!.step_id).toBe("a");
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_workflow_steps SET attempts=3,lease_deadline=clock_timestamp()-interval '1 second' WHERE workflow_id=$1 AND id='a'",
    [dead.id],
  );
  await asRole(db, "authenticated");
  expect(await claim(dead.id)).toBeNull();
  const cancelledDead = await call({ action: "cancel", id: dead.id });
  expect(cancelledDead.state).toBe("dead_letter");
  expect(cancelledDead.steps.map((s) => s.status)).toEqual([
    "dead_letter",
    "cancelled",
    "cancelled",
  ]);

  // An ordinary running/ready workflow still becomes cancelled.
  const plain = await call({ action: "prepare", steps: two("Cancel plain") });
  await approve(plain);
  expect((await call({ action: "cancel", id: plain.id })).state).toBe("cancelled");
});
