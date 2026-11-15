import { describe, expect, it } from "vitest";
import { completeSchema, ingestSchema } from "./agent-schema";

const run = { workflow: "fixture", idempotency_key: "fixture-key", status: "running" };

describe("agent wire validation", () => {
  it("retains arbitrary string-key metadata without granting owner fields", () => {
    expect(
      ingestSchema.parse({
        run: {
          ...run,
          provenance: { source: "fixture" },
          usage: { tokens: 1 },
          delivery: { ok: true },
        },
      }).run.usage,
    ).toEqual({ tokens: 1 });
    for (const payload of [
      { run, owner: "other" },
      { run: { ...run, user_id: "other" } },
      { run, companies: [{ name: "fixture", user_id: "other" }] },
    ]) {
      expect(ingestSchema.safeParse(payload).success).toBe(false);
    }
    expect(
      completeSchema.parse({
        id: "3c43a93f-4c25-4131-8b84-366ed5267a2d",
        status: "completed",
        result: { nested: { ok: true } },
      }).result,
    ).toEqual({ nested: { ok: true } });
  });

  it("retains enums, limits, strict keys and verified-source requirements", () => {
    for (const payload of [
      { run: { ...run, status: "done" } },
      { run: { ...run, workflow: "x".repeat(81) } },
      { run, study_tasks: [{ dedupe_key: "fixture", title: "fixture", priority: "urgent" }] },
      { run, study_tasks: [{ dedupe_key: "fixture", title: "fixture", estimated_minutes: 1441 }] },
      {
        run,
        job_leads: [
          {
            company: "fixture",
            title: "fixture",
            official_url: "https://example.com",
            status: "verified",
          },
        ],
      },
    ])
      expect(ingestSchema.safeParse(payload).success).toBe(false);
    expect(
      completeSchema.safeParse({
        id: "3c43a93f-4c25-4131-8b84-366ed5267a2d",
        status: "completed",
        owner: "other",
      }).success,
    ).toBe(false);
  });
});
