import { it, expect } from "vitest";
import { v2Envelope } from "../contracts";
it("exposes strict implemented workflow kinds and prior-only typed ID bindings", () => {
  const input = {
    action: "prepare",
    steps: [
      { id: "task", kind: "task.create", depends_on: [], input: { title: "Task" } },
      {
        id: "focus",
        kind: "focus.transition",
        depends_on: ["task"],
        input: { action: "start", task_id: { step: "task", alias: "id" } },
      },
    ],
  };
  const parse = (v: unknown) => v2Envelope.safeParse({ operation: "workflow", input: v }).success;
  expect(parse(input)).toBe(true);
  expect(parse({ ...input, confirmed: true })).toBe(false);
  expect(parse({ ...input, steps: [{ ...input.steps[0], kind: "google.write" }] })).toBe(false);
  expect(parse({ ...input, steps: [input.steps[1], input.steps[0]] })).toBe(false);
  expect(
    parse({ ...input, steps: [{ ...input.steps[0], input: { title: "Task", sql: "select 1" } }] }),
  ).toBe(false);
});
