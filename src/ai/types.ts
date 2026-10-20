import { z } from "zod";

export const proposalSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_task"),
    title: z.string().trim().min(2).max(200),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    type: z
      .enum([
        "Learn",
        "Build",
        "Practice",
        "Interview",
        "Network",
        "Apply",
        "Research",
        "Document",
        "Admin",
      ])
      .default("Learn"),
    status: z.enum(["backlog", "month", "week", "today"]).default("backlog"),
  }),
  z.object({
    action: z.literal("complete_task"),
    task_id: z.string(),
    minutes: z.number().int().min(0).max(1440).optional(),
  }),
  z.object({
    action: z.literal("reschedule_task"),
    task_id: z.string(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((s) => {
        try {
          return new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
        } catch {
          return false;
        }
      }),
    status: z.enum(["today", "week"]).default("week"),
  }),
  z.object({ action: z.literal("create_skill"), name: z.string().min(2).max(100) }),
  z.object({
    action: z.literal("add_note"),
    title: z.string().min(2).max(120),
    content: z.string().max(4000),
  }),
]);

export const commandResultSchema = z.object({
  answer: z.string().max(4000),
  proposals: z.array(proposalSchema).max(8),
});
export type Proposal = z.infer<typeof proposalSchema>;
export type CommandResult = z.infer<typeof commandResultSchema> & { source: "local" | "ai" };
