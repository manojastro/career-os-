import { it, expect } from "vitest";
import { v2Envelope } from "../contracts";
it("accepts bounded memory and document operations with no model-controlled provenance", () => {
  expect(
    v2Envelope.safeParse({
      operation: "memory",
      input: { action: "put", category: "knowledge", key: "fact", value: { text: "safe" } },
    }).success,
  ).toBe(true);
  expect(
    v2Envelope.safeParse({
      operation: "documents",
      input: {
        action: "register",
        file_id: "Google_File_1234567890",
        kind: "doc",
        title: "Notes",
        category: "project",
      },
    }).success,
  ).toBe(true);
});
it("rejects nested credentials, large/deep values, identity and protected document state", () => {
  for (const extra of [
    { confirmed: true },
    { source: "telegram" },
    { source_message: "fake" },
    { created_at: "2000-01-01" },
    { user_id: crypto.randomUUID() },
  ])
    expect(
      v2Envelope.safeParse({
        operation: "memory",
        input: { action: "put", category: "preference", key: "timezone", value: "UTC", ...extra },
      }).success,
    ).toBe(false);
  for (const value of [
    { a: { refresh_token: "abc" } },
    "sk-abcdefghijklmnopqrstuvwxyz123456",
    "x".repeat(8001),
    { a: { b: { c: { d: { e: { f: { g: "x" } } } } } } },
  ])
    expect(
      v2Envelope.safeParse({
        operation: "memory",
        input: { action: "put", category: "knowledge", key: "fact", value },
      }).success,
    ).toBe(false);
  for (const extra of [
    { status: "ready" },
    { last_sync: "now" },
    { last_revision: "fake" },
    { scopes: ["drive"] },
  ])
    expect(
      v2Envelope.safeParse({
        operation: "documents",
        input: {
          action: "register",
          file_id: "Google_File_1234567890",
          kind: "doc",
          title: "Notes",
          category: "project",
          ...extra,
        },
      }).success,
    ).toBe(false);
  expect(
    v2Envelope.safeParse({ operation: "memory", input: { action: "forget", key: "fact" } }).success,
  ).toBe(false);
});

it("rejects secret-named keys and token fields before unbounded JSON parsing", () => {
  for (const input of [
    { action: "put", key: "password", category: "knowledge", value: "abc" },
    { action: "put", key: "fact", category: "knowledge", value: { token: "abc" } },
  ])
    expect(v2Envelope.safeParse({ operation: "memory", input }).success).toBe(false);
  let deep: unknown = "x";
  for (let i = 0; i < 10000; i++) deep = { a: deep };
  expect(
    v2Envelope.safeParse({
      operation: "memory",
      input: { action: "put", key: "deep", category: "knowledge", value: deep },
    }).success,
  ).toBe(false);
});
