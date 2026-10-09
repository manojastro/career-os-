import { z } from "zod";

const url = z.string().url().max(2000).regex(/^https?:\/\//);
const optUrl = z.union([url, z.literal("")]).optional();
const ts = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const key = z.string().min(3).max(200);
const text = (max: number) => z.string().max(max);
const provenance = z.record(z.unknown()).optional();
const uuid = z.string().uuid();

export const ingestSchema = z
  .object({
    run: z
      .object({
        workflow: z.string().min(1).max(80),
        idempotency_key: z.string().min(8).max(200),
        status: z.enum(["running", "succeeded", "failed", "skipped"]),
        started_at: ts.optional(),
        finished_at: ts.optional(),
        next_run_at: ts.optional(),
        error: text(4000).optional(),
        usage: z.record(z.unknown()).optional(),
        delivery: z.record(z.unknown()).optional(),
        provenance,
      })
      .strict(),
    companies: z.array(z.object({ name: z.string().min(1).max(200), website: optUrl, industry: text(200).optional(), notes: text(2000).optional(), source_url: optUrl, verified_at: ts.optional(), provenance }).strict()).max(200).optional(),
    job_leads: z
      .array(
        z
          .object({
            company: z.string().min(1).max(200),
            title: z.string().min(1).max(300),
            location: text(200).optional(),
            work_type: text(60).optional(),
            salary_range: text(120).optional(),
            official_url: url,
            source_url: optUrl,
            verified_at: ts.optional(),
            posted_at: ts.optional(),
            summary: text(4000).optional(),
            fit_notes: text(4000).optional(),
            fit_is_inference: z.boolean().optional(),
            status: z.enum(["new", "verified", "expired"]).optional(),
            provenance,
          })
          .strict()
          .refine((lead) => lead.status !== "verified" || !!lead.verified_at, { message: "verified leads need verified_at" }),
      )
      .max(200)
      .optional(),
    recommendations: z.array(z.object({ dedupe_key: key, kind: z.enum(["top_priority", "briefing", "action", "insight", "interview"]).optional(), title: z.string().min(1).max(300), body: text(8000).optional(), priority: z.number().int().min(0).max(100).optional(), briefing_date: date.optional(), is_inference: z.boolean().optional(), source_url: optUrl, verified_at: ts.optional(), provenance }).strict()).max(100).optional(),
    study_tasks: z.array(z.object({ dedupe_key: key, title: z.string().min(1).max(300), detail: text(4000).optional(), skill_id: uuid.optional(), resource_url: optUrl, estimated_minutes: z.number().int().min(0).max(1440).optional(), due_date: date.optional(), priority: z.enum(["low", "medium", "high"]).optional(), is_inference: z.boolean().optional(), provenance }).strict()).max(100).optional(),
    project_tasks: z.array(z.object({ dedupe_key: key, project_id: uuid, title: z.string().min(1).max(300), kind: z.enum(["milestone", "task", "evidence"]).optional(), detail: text(4000).optional(), evidence_url: optUrl, due_date: date.optional(), is_inference: z.boolean().optional(), provenance }).strict()).max(100).optional(),
    outreach: z.array(z.object({ dedupe_key: key, contact_id: uuid.optional(), recipient: text(200).optional(), channel: z.enum(["linkedin", "email", "other"]).optional(), subject: text(300).optional(), draft: z.string().min(1).max(8000), reason: text(2000).optional(), is_inference: z.boolean().optional(), provenance }).strict()).max(100).optional(),
    events: z.array(z.object({ dedupe_key: key, title: z.string().min(1).max(300), organizer: text(200).optional(), starts_at: ts.optional(), location: text(200).optional(), url: optUrl, source_url: url, verified_at: ts, summary: text(4000).optional(), provenance }).strict()).max(100).optional(),
    source_documents: z.array(z.object({ dedupe_key: key, title: z.string().min(1).max(300), kind: z.enum(["resume", "job_description", "certificate", "article", "note", "transcript", "other"]).optional(), url: optUrl, summary: text(8000).optional(), status: z.enum(["processing", "processed", "action_needed"]).optional(), provenance }).strict()).max(100).optional(),
    uncertain_claims: z.array(z.object({ dedupe_key: key, claim: z.string().min(1).max(2000), context: text(4000).optional(), source_url: optUrl, verified_at: ts.optional(), confidence: z.number().int().min(0).max(100).optional(), document_id: uuid.optional(), provenance }).strict()).max(100).optional(),
    notifications: z.array(z.object({ dedupe_key: key, title: z.string().min(1).max(300), body: text(4000).optional(), channel: z.enum(["in_app", "email", "telegram", "other"]).optional(), delivery_status: z.enum(["pending", "delivered", "failed"]).optional(), delivered_at: ts.optional(), provenance }).strict()).max(100).optional(),
  })
  .strict();

export const completeSchema = z
  .object({ id: uuid, status: z.enum(["completed", "failed", "queued"]), result: z.record(z.unknown()).optional() })
  .strict();

