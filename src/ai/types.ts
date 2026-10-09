import { z } from "zod";

export const proposalSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_task"), title: z.string().min(2).max(200), type: z.enum(["Learn", "Build", "Practice", "Interview", "Network", "Apply", "Research", "Document", "Admin"]).default("Learn"), status: z.enum(["backlog", "month", "week", "today"]).default("backlog") }),
  z.object({ action: z.literal("complete_task"), task_id: z.string(), minutes: z.number().int().min(0).max(1440).optional() }),
  z.object({ action: z.literal("reschedule_task"), task_id: z.string(), date: z.string(), status: z.enum(["today", "week"]).default("week") }),
  z.object({ action: z.literal("create_skill"), name: z.string().min(2).max(100) }),
  z.object({ action: z.literal("add_note"), title: z.string().min(2).max(120), content: z.string().max(4000) }),
]);

export const commandResultSchema = z.object({ answer: z.string().max(4000), proposals: z.array(proposalSchema).max(8) });
export type Proposal = z.infer<typeof proposalSchema>;
export type CommandResult = z.infer<typeof commandResultSchema> & { source: "local" | "ai" };

