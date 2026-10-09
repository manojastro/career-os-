import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod/v4";
import { agentJson, verifyAgentToken } from "@/lib/agent-auth.server";
import { mergeIdempotencyKey, readJsonLimited, schemaAcceptsIdempotencyKey } from "@/lib/learning/http";

// Hermes learning-manager API. Same bearer digest auth + agent_owner binding as /api/agent/*.
// Contract: docs/AGENT_API.md → "Learning manager".

const key = z
  .string()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9:._-]+$/);
const day = z.iso.date();
const jobs = z.enum(["curriculum_sync", "morning_plan", "evening_check"]);
const telegram = z
  .object({
    sender_id: z.string().min(1).max(40),
    chat_ref: z.string().min(1).max(80),
    message_id: z.string().min(1).max(40),
    reply_to_message_id: z.string().min(1).max(40),
  })
  .strict();
const schemas = {
  recommendation: z
    .object({
      idempotency_key: key,
      assignment_date: day,
      topic_id: z.uuid(),
      rationale: z.string().max(2000).default(""),
      practical_outcome: z.string().max(2000).default(""),
      completion_criteria: z.string().max(2000).default(""),
      plan: z
        .array(
          z
            .object({ step: z.string().min(1).max(300), minutes: z.number().int().min(1).max(300) })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
  completion: z
    .object({
      idempotency_key: key,
      assignment_id: z.uuid().optional(),
      date: day.optional(),
      text: z.string().max(4000).optional(),
      kind: z
        .enum(["completed", "partial", "not_started", "reschedule", "help", "minutes"])
        .optional(),
      minutes: z.number().int().min(1).max(600).optional(),
      minutes_mode: z.enum(["total", "additional"]).optional(),
      notes: z.string().max(4000).optional(),
      new_date: day.optional(),
      telegram: telegram.optional(),
    })
    .strict()
    .refine((v) => v.text || v.kind, "text_or_kind_required"),
  "check-in": z.object({ run_date: day.optional() }).strict(),
  "delivery-begin": z
    .object({
      idempotency_key: key,
      kind: z.enum(["morning_plan", "evening_check", "test", "help"]),
      assignment_id: z.uuid().optional(),
      chat_ref: z.string().max(80).default(""),
    })
    .strict(),
  "delivery-finish": z
    .object({
      delivery_id: z.uuid(),
      reservation_token: z.uuid(),
      status: z.enum(["sent", "failed", "unknown"]),
      chat_ref: z.string().max(80).default(""),
      message_id: z.string().max(40).default(""),
      error: z.string().max(300).default(""),
      reconcile: z.boolean().default(false),
    })
    .strict(),
  "command-ack": z
    .object({
      id: z.uuid(),
      status: z.enum(["completed", "failed"]),
      result: z.record(z.string(), z.unknown()).default({}),
    })
    .strict(),
  "delivery-status": z
    .object({
      idempotency_key: key,
      kind: z.enum(["morning_plan", "evening_check", "test", "help"]),
      assignment_id: z.uuid().optional(),
      status: z.enum(["sent", "failed"]),
      chat_ref: z.string().max(80).default(""),
      message_id: z.string().max(40).default(""),
      error: z.string().max(300).default(""),
    })
    .strict(),
  sync: z.object({}).strict(),
  "run-claim": z
    .object({
      job: jobs,
      run_date: day,
      catch_up: z.boolean().default(false),
      lease_seconds: z.number().int().min(60).max(3600).default(900),
    })
    .strict(),
  "run-finish": z
    .object({
      job: jobs,
      run_date: day,
      attempt_token: z.uuid(),
      status: z.enum(["succeeded", "failed", "skipped"]),
      detail: z.record(z.string(), z.unknown()).default({}),
    })
    .strict(),
} as const;

/** Server-side sender check: SHA-256 of the Telegram sender id must equal TELEGRAM_OWNER_ID_SHA256. */
function senderAllowed(senderId: string) {
  const expected = (process.env["TELEGRAM_OWNER_ID_SHA256"] ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) return "telegram_sender_not_configured";
  const actual = createHash("sha256").update(senderId, "utf8").digest();
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) ? null : "telegram_sender_rejected";
}

const LIMITS: Record<string, number> = { sync: 6, default: 120 };

async function ctx(request: Request, action: string) {
  const denied = verifyAgentToken(request);
  if (denied) return { denied };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Persisted (cross-instance) rate limit per action, per hour.
  const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("agent_rate_hit", {
    p_bucket: `learning:${action}`,
    p_limit: LIMITS[action] ?? LIMITS.default,
    p_window_seconds: 3600,
  });
  if (rlErr) return { denied: agentJson({ error: "context_unavailable" }, 500) };
  if (allowed === false) return { denied: agentJson({ error: "rate_limited" }, 429) };
  const { data: owner, error } = await supabaseAdmin
    .from("agent_owner")
    .select("user_id")
    .eq("singleton", true)
    .maybeSingle();
  if (error) return { denied: agentJson({ error: "context_unavailable" }, 500) };
  if (!owner?.user_id) return { denied: agentJson({ error: "agent_owner_not_bound" }, 409) };
  await supabaseAdmin
    .from("learning_preferences")
    .update({ hermes_last_seen_at: new Date().toISOString() })
    .eq("user_id", owner.user_id);
  return { db: supabaseAdmin, uid: owner.user_id as string, origin: new URL(request.url).origin };
}

async function audit(db: unknown, uid: string, action: string, detail: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).from("audit_events").insert({
    user_id: uid,
    actor: "agent",
    action,
    entity_type: "learning",
    detail,
    source: "agent",
    provenance: {},
  });
}

function fail(e: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;
  if (err?.name === "Error" && typeof err.code === "string" && typeof err.status === "number") {
    // Only structured, non-database detail (e.g. validation error codes) is returned.
    const detail = Array.isArray(err.detail) ? err.detail : null;
    return agentJson({ error: err.code, detail }, err.status);
  }
  console.error("[agent/learning] failure");
  return agentJson({ error: "learning_request_failed" }, 500);
}

export const Route = createFileRoute("/api/agent/learning/$action")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!["context", "progress", "curriculum", "pulse"].includes(params.action))
          return agentJson({ error: "not_found" }, 404);
        const c = await ctx(request, params.action);
        if ("denied" in c) return c.denied;
        const svc = await import("@/lib/learning/service.server");
        const eng = await import("@/lib/learning/engine");
        try {
          const now = new Date();
          const prefs = await svc.getPrefs(c.db, c.uid);
          const tz = String(prefs.timezone || eng.DEFAULT_TZ);
          const { date } = eng.zonedParts(now, tz);
          const [pendingCommands, reconcile] = await Promise.all([
            svc.pendingLearningCommands(c.db, c.uid),
            svc.deliveriesNeedingReconciliation(c.db, c.uid),
          ]);
          const { data: runs, error: qe1 } = await c.db
            .from("scheduler_runs")
            .select("job,status,attempt,lease_until,finished_at")
            .eq("user_id", c.uid)
            .eq("run_date", date);
          if (qe1) throw (await import("@/lib/learning/service.server")).queryFailed();
          const schedule = {
            sync_time: String(prefs.sync_time),
            morning_time: String(prefs.morning_time),
            evening_time: String(prefs.evening_time),
            paused: Boolean(prefs.paused),
            timezone: tz,
          };
          const due = eng.dueJobs(now, schedule, svc.occupiedJobs(runs ?? [], now) as never);
          if (params.action === "pulse") {
            // Cheap poll: the worker re-reads persisted settings here, so Settings changes apply automatically.
            return agentJson({
              generated_at: now.toISOString(),
              timezone: tz,
              local_date: date,
              ist_date: date, // DEPRECATED alias of local_date (kept for older workers)
              config_version: prefs.updated_at,
              schedule,
              daily_minutes: prefs.daily_minutes,
              weekly_minutes: prefs.weekly_minutes,
              baseline_completed: !!prefs.baseline_completed_at,
              due_jobs: due,
              runs_today: runs ?? [],
              pending_commands: pendingCommands,
              deliveries_needing_reconciliation: reconcile,
            });
          }
          if (params.action === "context" || params.action === "progress") {
            const sel = await svc.loadSelection(c.db, c.uid, date);
            const s = eng.selectCandidates(sel);
            const { data: source, error: qe2 } = await c.db
              .from("curriculum_sources")
              .select(
                "url,status,last_synced_at,last_checked_at,last_error,active_version_id,curriculum_versions!curriculum_sources_active_fk(content_hash,status,report)",
              )
              .eq("user_id", c.uid)
              .is("deleted_at", null)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (qe2) throw (await import("@/lib/learning/service.server")).queryFailed();
            const { data: feedback, error: qe3 } = await c.db
              .from("learning_feedback")
              .select("assignment_id,kind,channel,minutes,notes,created_at")
              .eq("user_id", c.uid)
              .order("created_at", { ascending: false })
              .limit(20);
            if (qe3) throw (await import("@/lib/learning/service.server")).queryFailed();
            return agentJson({
              generated_at: now.toISOString(),
              timezone: tz,
              local_date: date,
              ist_date: date, // DEPRECATED alias of local_date (kept for older workers)
              app_url: c.origin,
              config_version: prefs.updated_at,
              preferences: {
                ...schedule,
                daily_minutes: prefs.daily_minutes,
                weekly_minutes: prefs.weekly_minutes,
                baseline_completed: !!prefs.baseline_completed_at,
              },
              week_planned_minutes: eng.weekPlannedMinutes(sel.assignments, date),
              due_jobs: due,
              blocked: s.blocked,
              curriculum: source ?? null,
              today: s.today,
              carry_over: s.carry_over,
              candidates: s.candidates.slice(0, 10),
              excluded_count: s.excluded.length,
              recent_assignments: sel.assignments.slice(0, 14),
              recent_feedback: feedback ?? [],
              pending_commands: pendingCommands,
              deliveries_needing_reconciliation: reconcile,
              progress:
                params.action === "progress"
                  ? sel.topics.map((t) => ({
                      topic_id: t.id,
                      stable_topic_id: t.stable_topic_id,
                      state: eng.topicState(t.id, sel.baselines, sel.assignments),
                    }))
                  : undefined,
            });
          }
          const url = new URL(request.url);
          const limit = Math.min(
            200,
            Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100),
          );
          const after = Math.max(0, Number(url.searchParams.get("after_sequence") ?? 0) || 0);
          const { data: topics, error: qe4 } = await c.db
            .from("curriculum_topics")
            .select(
              "id,stable_topic_id,volume,volume_title,title,description,priority,priority_source,sequence,recommended_minutes,practical_exercise,completion_criteria,interview_notes,source_reference,skill_id,skill_topic_id,removed_at,updated_at",
            )
            .eq("user_id", c.uid)
            .is("deleted_at", null)
            .gt("sequence", after)
            .order("sequence")
            .limit(limit + 1);
          if (qe4) throw (await import("@/lib/learning/service.server")).queryFailed();
          const rows = topics ?? [];
          const items = rows.slice(0, limit);
          const { data: prereqs, error: qe5 } = await c.db
            .from("curriculum_prerequisites")
            .select("topic_id,prerequisite_topic_id,basis")
            .eq("user_id", c.uid)
            .in(
              "topic_id",
              items.map((t: { id: string }) => t.id),
            );
          if (qe5) throw (await import("@/lib/learning/service.server")).queryFailed();
          return agentJson({
            items,
            prerequisites: prereqs ?? [],
            next_after_sequence: rows.length > limit ? items[items.length - 1].sequence : null,
          });
        } catch (e) {
          return fail(e);
        }
      },
      POST: async ({ request, params }) => {
        const schema = schemas[params.action as keyof typeof schemas];
        if (!schema) return agentJson({ error: "not_found" }, 404);
        const c = await ctx(request, params.action);
        if ("denied" in c) return c.denied;
        const read = await readJsonLimited(request);
        if (!read.ok) return agentJson({ error: read.error }, read.status);
        const merged = mergeIdempotencyKey(request, read.body, schemaAcceptsIdempotencyKey(schema));
        if (!merged.ok) return agentJson({ error: merged.error }, 400);
        const parsed = schema.safeParse(merged.body);
        if (!parsed.success)
          return agentJson(
            {
              error: "invalid_request",
              issues: parsed.error.issues
                .slice(0, 10)
                .map((i) => ({ path: i.path.join("."), message: i.message })),
            },
            400,
          );
        const svc = await import("@/lib/learning/service.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = parsed.data as any;
        try {
          switch (params.action) {
            case "sync": {
              const r = await svc.syncCurriculum(c.db, c.uid);
              await audit(c.db, c.uid, "learning.sync", { outcome: r.outcome });
              return agentJson(r);
            }
            case "recommendation": {
              const r = await svc.createAssignment(
                c.db,
                c.uid,
                { ...data, source: "agent" },
                c.origin,
              );
              await audit(c.db, c.uid, "learning.recommendation", {
                assignment_id: r.assignment.id,
                replayed: r.replayed,
              });
              return agentJson(r, r.replayed ? 200 : 201);
            }
            case "completion": {
              const { telegram: tg, ...rest } = data;
              if (tg) {
                // Both checks required: verified sender AND reply mapped to a stored outbound message (in SQL).
                const bad = senderAllowed(tg.sender_id);
                if (bad)
                  return agentJson(
                    { error: bad },
                    bad === "telegram_sender_not_configured" ? 412 : 403,
                  );
              }
              const r = await svc.applyFeedback(c.db, c.uid, {
                ...rest,
                channel: tg ? "telegram" : "agent",
                telegram: tg
                  ? {
                      chat_ref: tg.chat_ref,
                      message_id: tg.message_id,
                      reply_to_message_id: tg.reply_to_message_id,
                    }
                  : undefined,
              });
              await audit(c.db, c.uid, "learning.feedback", {
                assignment_id: r.assignment_id,
                kind: r.kind,
                replayed: r.replayed,
              });
              return agentJson(r);
            }
            case "check-in":
              return agentJson(await svc.eveningCheck(c.db, c.uid));
            case "delivery-begin": {
              const r = await svc.beginDelivery(c.db, c.uid, data);
              return agentJson(r, r.send_allowed ? 201 : 409);
            }
            case "delivery-finish":
              return agentJson(await svc.finishDelivery(c.db, c.uid, data));
            case "command-ack": {
              const r = await svc.ackCommand(c.db, c.uid, data);
              await audit(c.db, c.uid, "learning.command_ack", { id: data.id, status: data.status });
              return agentJson(r);
            }
            case "delivery-status":
              // Post-send receipts cannot prevent duplicate sends after a crash.
              return agentJson(
                { error: "deprecated_use_delivery_begin_finish" },
                410,
              );
            case "run-claim": {
              const r = await svc.claimRun(c.db, c.uid, data);
              return agentJson(r, r.claimed ? 201 : 409);
            }
            case "run-finish":
              return agentJson(await svc.finishRun(c.db, c.uid, data));
          }
          return agentJson({ error: "not_found" }, 404);
        } catch (e) {
          return fail(e);
        }
      },
    },
  },
});

