import { describe, it, expect } from "vitest";
import { localCommand } from "./local";
import { proposalSchema } from "./types";
import { demoData } from "@/lib/domain/seed";
describe("truthful local Copilot proposals", () => {
  it("preserves high priority in a validated proposal", () => {
    const result = localCommand("Create a high-priority task to review FastAPI", demoData());
    expect(result.proposals[0]).toMatchObject({
      action: "create_task",
      priority: "high",
      title: "review FastAPI",
    });
    expect(proposalSchema.safeParse(result.proposals[0]).success).toBe(true);
  });
  it("does not choose ambiguous completion matches or accept invalid dates", () => {
    const data = demoData();
    data.tasks[0].title = "Repeated task";
    data.tasks[1].title = "Repeated task";
    expect(localCommand("Finished Repeated task", data).proposals).toHaveLength(0);
    expect(
      proposalSchema.safeParse({
        action: "reschedule_task",
        task_id: data.tasks[0].id,
        date: "2026-02-30",
      }).success,
    ).toBe(false);
  });
});
