import { describe, expect, it } from "vitest";
import { demoData } from "../src/lib/domain/seed";
import { localCommand } from "../src/ai/local";

describe("local copilot fallback", () => {
  it("proposes a task from a direct add command", () => {
    const result = localCommand("Add Kubernetes under my learning backlog", demoData());
    expect(result.proposals).toContainEqual(expect.objectContaining({ action: "create_task", title: expect.stringContaining("Kubernetes") }));
  });

  it("answers neglect from actual weekly data", () => {
    const result = localCommand("Show me what I neglected this week", demoData());
    expect(result.answer.toLowerCase()).toContain("planned");
    expect(result.proposals).toHaveLength(0);
  });

  it("requires confirmation for bulk moves", () => {
    const result = localCommand("Move unfinished interview tasks to tomorrow", demoData());
    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals.every((item) => item.action === "reschedule_task")).toBe(true);
  });
});
