import { describe, it, expect } from "vitest";
import { verifyFeedbackIntent } from "./learning-feedback";

describe("actual owner learning intent", () => {
  it("preserves stated outcome and actual minutes", () => {
    expect(
      verifyFeedbackIntent("Completed it in 45 minutes", { kind: "completed", minutes: 45 }),
    ).toEqual({ minutes: 45, notes: "Completed it in 45 minutes" });
    expect(verifyFeedbackIntent("done", { kind: "completed" }).minutes).toBeNull();
    expect(
      verifyFeedbackIntent("I spent 45 minutes on it", { kind: "minutes", minutes: 45 }).minutes,
    ).toBe(45);
  });
  it("rejects invented completion, time, date and additional time", () => {
    for (const [text, input] of [
      ["show my progress", { kind: "completed" }],
      ["not started", { kind: "completed" }],
      ["done", { kind: "completed", minutes: 45 }],
      ["done in 20 minutes", { kind: "completed", minutes: 45 }],
      ["done in 20 minutes", { kind: "completed", minutes: 20, minutes_mode: "additional" }],
      ["reschedule tomorrow", { kind: "reschedule", new_date: "2099-01-01" }],
    ] as const)
      expect(() => verifyFeedbackIntent(text, input)).toThrow("needs_clarification");
  });
});
