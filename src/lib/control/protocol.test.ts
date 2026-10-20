import { describe, expect, it } from "vitest";
import { validateOperations, verifyTelegramIdentity } from "./protocol";
describe("control boundary", () => {
  it("rejects forged sender, group chat and missing private provenance", () => {
    const hash = "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b";
    expect(
      verifyTelegramIdentity({ sender: "1", chat: "1", chat_type: "private", message: "8" }, hash),
    ).toBe(true);
    for (const p of [
      { sender: "2", chat: "1", chat_type: "private", message: "8" },
      { sender: "1", chat: "-1", chat_type: "group", message: "8" },
      { sender: "1", chat: "1", chat_type: "private", message: "" },
    ])
      expect(verifyTelegramIdentity(p, hash)).toBe(false);
  });
  it("rejects arbitrary entities, protected fields, invalid enum, cross tool overrides", () => {
    for (const op of [
      { entity: "auth.users", action: "create", values: {} },
      {
        entity: "tasks",
        action: "update",
        id: "00000000-0000-4000-8000-000000000001",
        values: { user_id: "x" },
      },
      { entity: "tasks", action: "create", values: { title: "Work", status: "Done" } },
      { entity: "tasks", action: "create", values: { title: "Work", actual_minutes: 90 } },
    ])
      expect(() => validateOperations([op])).toThrow();
  });
  it("validates typed values, real dates, URLs and limits", () => {
    expect(
      validateOperations([
        {
          entity: "tasks",
          action: "create",
          values: { title: "Study Pydantic", priority: "high", scheduled_date: "2026-10-11" },
        },
      ]),
    ).toHaveLength(1);
    for (const values of [
      { title: "x", due_date: "2026-02-30" },
      { title: "x", estimated_minutes: -1 },
      { title: "x", github_url: "javascript:alert(1)" },
    ])
      expect(() => validateOperations([{ entity: "tasks", action: "create", values }])).toThrow();
  });
});
