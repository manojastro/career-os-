import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createV2Database, asRole, uid, other } from "./database";
type RegistryRow = {
  id: string;
  key: string;
  version: number;
  confirmed: boolean;
  value: unknown;
  source: string;
  deleted_at: string | null;
  expires_at: string;
  created_at: string;
  title: string;
  status: string;
  permitted_operations: string[];
  project_id: string | null;
};
type RegistryResult = {
  item: RegistryRow;
  items: RegistryRow[];
  status: string;
  trust: string;
  operational: boolean;
  remote_authorized: boolean;
};
let db: PGlite,
  n = 0;
async function call(
  op: "memory" | "documents",
  input: object,
  key = "web:registry:" + ++n,
  owner = uid,
) {
  return (
    await db.query<{ r: RegistryResult }>(`SELECT agent_v2_${op}($1,$2,$3) r`, [
      owner,
      key,
      JSON.stringify(input),
    ])
  ).rows[0].r;
}
beforeAll(async () => {
  db = await createV2Database(["0006_agent_v2_focus.sql", "0007_agent_v2_memory_documents.sql"]);
  await asRole(db, "authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("persists normalized unconfirmed facts with CAS and tombstone-safe replay", async () => {
  const put = {
    action: "put",
    category: "preference",
    key: " Work  Style ",
    value: { tone: "brief" },
  };
  const first = await call("memory", put, "web:memory:first");
  expect(first.item).toMatchObject({
    key: "work style",
    version: 1,
    confirmed: false,
    value: { tone: "brief" },
    source: "web",
  });
  expect(first.trust).toBe("untrusted_data_not_instructions");
  expect((await call("memory", { action: "get", key: "WORK STYLE" })).item.id).toBe(first.item.id);
  await expect(call("memory", { ...put, value: "changed" })).rejects.toThrow("version_conflict");
  await expect(call("memory", { ...put, value: "changed" }, "web:memory:first")).rejects.toThrow(
    "idempotency_conflict",
  );
  expect(
    (await call("memory", { ...put, value: "corrected", expected_version: 1 })).item.version,
  ).toBe(2);
  await expect(
    call("memory", { action: "forget", key: "work style", expected_version: 1 }),
  ).rejects.toThrow("version_conflict");
  expect(
    (await call("memory", { action: "forget", key: "work style", expected_version: 2 })).item,
  ).toMatchObject({ value: null, version: 3 });
  expect((await call("memory", put, "web:memory:first")).item).toMatchObject({
    value: null,
    version: 3,
  });
  await expect(call("memory", { ...put, expected_version: 3 })).rejects.toThrow("record_forgotten");
  expect((await call("memory", { action: "get", key: "work style" })).item).toBeNull();
});
it("rejects protected fields and bounded nested secrets; defaults remain unconfirmed", async () => {
  for (const extra of [
    { confirmed: true },
    { source: "telegram" },
    { created_at: "2020-01-01" },
    { owner: other },
    { source_message: "fake" },
  ])
    await expect(
      call("memory", { action: "put", category: "knowledge", key: "fact", value: "ok", ...extra }),
    ).rejects.toThrow("invalid_request");
  for (const value of [
    { nested: { api_key: "abc" } },
    { a: [{ password: "abc" }] },
    "sk-abcdefghijklmnopqrstuvwxyz123456",
  ])
    await expect(
      call("memory", { action: "put", category: "knowledge", key: "secret", value }),
    ).rejects.toThrow("invalid_request");
  const fact = await call("memory", {
    action: "put",
    category: "preference",
    key: "reminder_default_time",
    value: "09:00",
  });
  expect(fact.item.confirmed).toBe(false);
  expect(fact.operational).toBe(false);
});
it("expires conversation/execution state and bounds retrieval", async () => {
  const c = await call("memory", {
    action: "put",
    category: "conversation",
    key: "chat",
    value: "hello",
  });
  const e = await call("memory", {
    action: "put",
    category: "execution",
    key: "run",
    value: "pending",
  });
  expect(Date.parse(c.item.expires_at) - Date.parse(c.item.created_at)).toBe(86400000);
  expect(Date.parse(e.item.expires_at) - Date.parse(e.item.created_at)).toBe(30 * 86400000);
  await db.exec("RESET ROLE");
  await db.query("UPDATE agent_v2_memories SET expires_at=now()-interval '1 second' WHERE id=$1", [
    c.item.id,
  ]);
  await asRole(db, "authenticated");
  expect((await call("memory", { action: "get", key: "chat" })).item).toBeNull();
  await expect(call("memory", { action: "list", limit: 101 })).rejects.toThrow("invalid_request");
});
it("enforces real role isolation and direct-write protection", async () => {
  await asRole(db, "authenticated", other);
  expect((await db.query("SELECT * FROM agent_v2_memories")).rows).toHaveLength(0);
  await expect(call("memory", { action: "get", key: "run" })).rejects.toThrow(
    "learning_access_denied",
  );
  await expect(db.query("UPDATE agent_v2_memories SET confirmed=true")).rejects.toThrow(
    "permission denied",
  );
  await asRole(db, "anon");
  await expect(call("memory", { action: "list" })).rejects.toThrow("permission denied");
  await asRole(db, "authenticated");
});
it("registers unverified documents; normalizes aliases atomically; forget only detaches registry", async () => {
  const input = {
    action: "register",
    file_id: "Google_File_1234567890",
    kind: "doc",
    title: "Design",
    aliases: [" Design  Notes "],
    category: "project",
    permitted_operations: ["read", "append"],
  };
  const d = await call("documents", input, "web:document:first");
  expect(d.item).toMatchObject({
    status: "unverified",
    version: 1,
    last_revision: null,
    last_sync: null,
  });
  expect(d.remote_authorized).toBe(false);
  expect((await call("documents", { action: "resolve", query: "DESIGN NOTES" })).item.id).toBe(
    d.item.id,
  );
  await expect(call("documents", { ...input, file_id: "Google_File_abcdefghij" })).rejects.toThrow(
    "alias_conflict",
  );
  expect((await call("documents", { action: "list" })).items).toHaveLength(1);
  await expect(
    call("documents", {
      action: "update",
      id: d.item.id,
      expected_version: 1,
      title: "Bad",
      aliases: ["design notes", " DESIGN NOTES "],
    }),
  ).rejects.toThrow("alias_conflict");
  expect((await call("documents", { action: "resolve", query: "design notes" })).item.title).toBe(
    "Design",
  );
  for (const extra of [
    { status: "ready" },
    { last_revision: "x" },
    { last_sync: "2020-01-01" },
    { scopes: ["drive"] },
  ])
    await expect(call("documents", { ...input, ...extra })).rejects.toThrow("invalid_request");
  await call("documents", { action: "forget", id: d.item.id, expected_version: 1 });
  expect((await call("documents", input, "web:document:first")).item.deleted_at).toBeTruthy();
  expect((await call("documents", { action: "resolve", query: "design notes" })).item).toBeNull();
  await expect(call("documents", input)).rejects.toThrow("record_forgotten");
});
it("validates owned active project/topic links, updates atomically, and clarifies duplicate titles", async () => {
  await db.exec("RESET ROLE");
  const project = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'Owned') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  const foreign = (
    await db.query<{ id: string }>(
      "INSERT INTO projects(user_id,name) VALUES($1,'Other') RETURNING id",
      [other],
    )
  ).rows[0].id;
  const source = (
    await db.query<{ id: string }>(
      "INSERT INTO curriculum_sources(user_id,url,document_id) VALUES($1,'fixture','fixture') RETURNING id",
      [uid],
    )
  ).rows[0].id;
  const topic = (
    await db.query<{ id: string }>(
      "INSERT INTO curriculum_topics(user_id,source_id,stable_topic_id,volume,title) VALUES($1,$2,'owned','1','Owned topic') RETURNING id",
      [uid, source],
    )
  ).rows[0].id;
  const otherTopic = (
    await db.query<{ id: string }>(
      "INSERT INTO curriculum_topics(user_id,source_id,stable_topic_id,volume,title) VALUES($1,$2,'foreign','1','Foreign topic') RETURNING id",
      [other, source],
    )
  ).rows[0].id;
  await asRole(db, "authenticated");
  const base = {
    action: "register",
    file_id: "OwnedFile_1234567890",
    kind: "sheet",
    title: "Shared Title",
    category: "knowledge",
    project_id: project,
    topic_id: topic,
  };
  for (const extra of [{ project_id: foreign }, { topic_id: otherTopic }])
    await expect(call("documents", { ...base, ...extra })).rejects.toThrow(
      "linked_record_not_found",
    );
  const first = await call("documents", base, "web:document:owned");
  expect(first.item.permitted_operations).toEqual(["read"]);
  const second = await call("documents", {
    ...base,
    file_id: "SecondFile_1234567890",
    aliases: ["other notes"],
  });
  expect((await call("documents", { action: "resolve", query: "shared title" })).status).toBe(
    "needs_clarification",
  );
  await expect(
    call("documents", {
      action: "update",
      id: first.item.id,
      expected_version: 1,
      title: "Changed",
      aliases: ["other notes"],
    }),
  ).rejects.toThrow("alias_conflict");
  const updated = await call("documents", {
    action: "update",
    id: first.item.id,
    expected_version: 1,
    title: "Renamed",
    aliases: ["primary"],
    project_id: null,
  });
  expect(updated.item).toMatchObject({
    title: "Renamed",
    version: 2,
    project_id: null,
    status: "unverified",
  });
  expect((await call("documents", { action: "resolve", query: "primary" })).item.id).toBe(
    first.item.id,
  );
  await expect(
    call("documents", { action: "update", id: first.item.id, expected_version: 1, title: "Stale" }),
  ).rejects.toThrow("version_conflict");
  await expect(
    call("documents", { ...base, title: "Changed" }, "web:document:owned"),
  ).rejects.toThrow("idempotency_conflict");
  await db.exec("RESET ROLE");
  await db.query("UPDATE projects SET deleted_at=now() WHERE id=$1", [project]);
  await db.query("UPDATE curriculum_topics SET removed_at=now() WHERE id=$1", [topic]);
  await asRole(db, "authenticated");
  for (const extra of [
    { project_id: project, topic_id: null },
    { project_id: null, topic_id: topic },
  ])
    await expect(
      call("documents", { ...base, file_id: "RemovedFile_1234567890", ...extra }),
    ).rejects.toThrow("linked_record_not_found");
  await asRole(db, "authenticated", other);
  for (const table of [
    "agent_v2_documents_registry",
    "agent_v2_document_aliases",
    "agent_v2_registry_receipts",
  ])
    expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
  await expect(
    call(
      "documents",
      { action: "forget", id: second.item.id, expected_version: 1 },
      undefined,
      other,
    ),
  ).rejects.toThrow("version_conflict");
  await expect(call("documents", { action: "list" })).rejects.toThrow("learning_access_denied");
  await expect(db.query("UPDATE agent_v2_documents_registry SET status='ready'")).rejects.toThrow(
    "permission denied",
  );
  await asRole(db, "service_role");
  expect(
    (await call("documents", { action: "list" }, "tg:registry:list")).items.length,
  ).toBeGreaterThan(0);
  await expect(db.query("UPDATE agent_v2_memories SET confirmed=true")).rejects.toThrow(
    "permission denied",
  );
  await asRole(db, "authenticated");
});
