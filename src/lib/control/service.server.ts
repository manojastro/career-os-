import { createHash } from "node:crypto";
import { z } from "zod";
import { agentJson, verifyAgentToken } from "@/lib/agent-auth.server";
import { readJsonLimited } from "@/lib/learning/http";
import { registry, validateOperations, verifyTelegramIdentity } from "./protocol";
import { csvCell } from "./csv";
import { verifyFeedbackIntent } from "./learning-feedback";
import { DEFAULT_TZ, isValidTimeZone, zonedParts } from "@/lib/learning/engine";
import { checkAiQuota } from "@/lib/ai-quota.server";
import { analyzeJobPosting, type JobAnalysis } from "@/lib/jobs/analyze.server";
import { analyzeJobDescription, assessRequirements } from "@/lib/domain/jobGap";
import type { AppData } from "@/lib/domain/types";
import { allRows, query, resolve, search, report, rpc, type Db } from "./queries.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
const envelope = z
  .object({
    identity: z
      .object({ sender: z.string(), chat: z.string(), chat_type: z.string(), message: z.string() })
      .strict(),
    action: z.string().max(40),
    input: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
const errorCodes = [
  "source_approval_required",
  "invalid_recurrence",
  "invalid_completion",
  "skill_name_exists",
  "unsupported_entity",
  "unsupported_operation",
  "unsupported_action",
  "upload_failed",
  "download_failed",
  "export_failed",
  "attachment_lookup_failed",
  "too_many_linked_changes_use_batches",
  "record_not_found",
  "linked_record_not_found",
  "evidence_required",
  "dependencies_incomplete",
  "invalid_schedule",
  "invalid_confirmation",
  "inbound_context_required",
  "idempotency_conflict",
  "use_learning_completion",
  "use_canonical_task",
  "undo_conflict",
  "nothing_to_undo",
  "undo_not_supported",
  "context_expired_relist",
  "needs_clarification",
  "invalid_filter",
  "invalid_sort",
  "invalid_pagination",
  "report_dates_required",
  "attachment_not_found",
  "invalid_attachment",
  "attachment_association_requires_resource_or_evidence",
  "invalid_timezone",
  "invalid_time",
  "context_save_failed",
  "approval_stale_repreview",
  "evidence_baseline_protected",
  "automation_activation_blocked",
  "command_not_cancellable",
  "invalid_storage_reference",
  "invalid_command_payload",
  "invalid_enum",
  "protected_field",
  "invalid_time_record",
  "invalid_text_edit",
  "text_fragment_not_found",
  "text_fragment_ambiguous",
  "text_too_large_use_document",
  "cyclic_relationship",
  "preferences_unavailable",
  "workflow_not_claimed",
  "export_too_large_use_entity_export",
  "CSV_requires_one_entity",
  "invalid_attachment",
  "job_post_too_short",
];
export async function handleControl(request: Request): Promise<Response> {
  const started = Date.now();
  const denied = verifyAgentToken(request);
  if (denied) return denied;
  const json = await readJsonLimited(request, 9_000_000);
  if (!json.ok) return agentJson({ error: json.error }, json.status);
  const parsed = envelope.safeParse(json.body);
  if (!parsed.success) return agentJson({ error: "invalid_request" }, 400);
  const { identity, action, input } = parsed.data;
  if (!verifyTelegramIdentity(identity, (process.env.TELEGRAM_OWNER_ID_SHA256 ?? "").trim()))
    return agentJson({ error: "telegram_sender_or_chat_rejected" }, 403);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Extend generated types locally for the reviewed migration without editing generated files.
  const db = supabaseAdmin as unknown as SupabaseClient<Database>;
  const chat = createHash("sha256").update(identity.chat).digest("hex");
  let auditUid: string | undefined;
  try {
    const allowed = await rpc<boolean>(db, "agent_rate_hit", {
      p_bucket: "control:" + chat,
      p_limit: 240,
      p_window_seconds: 3600,
    });
    if (!allowed) return agentJson({ error: "rate_limited" }, 429);
    const { data: owner, error: ownerError } = await db
      .from("agent_owner")
      .select("user_id")
      .eq("singleton", true)
      .maybeSingle();
    if (ownerError || !owner?.user_id) return agentJson({ error: "owner_not_bound" }, 409);
    const uid = String(owner.user_id);
    auditUid = uid;
    // Per-call log for Agent Activity: operation names, status and timing only, never text.
    const note = async (status: number, body?: unknown) => {
      const error =
        body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
      const step = stepOf(action, input);
      try {
        await db.from("audit_events").insert({
          user_id: uid,
          actor: "agent",
          action: status >= 400 ? "control_rejected" : "control_call",
          entity_type: "control",
          source: "agent",
          detail: {
            chat_ref: chat,
            message_ref: identity.message,
            operation: action,
            ...(step ? { step } : {}),
            ...(error && /^[a-z_]{1,80}$/.test(error) ? { error } : {}),
            http_status: status,
            duration_ms: Date.now() - started,
          },
        });
      } catch {
        /* Logging must never change the reported result. */
      }
    };
    const logged = async (body: unknown, status = 200) => {
      await note(status, body);
      return agentJson(body, status);
    };
    const key =
      "tg:" +
      chat.slice(0, 16) +
      ":" +
      identity.message +
      ":" +
      createHash("sha256")
        .update(JSON.stringify(canonical({ action, input })))
        .digest("hex")
        .slice(0, 32);
    if (action === "begin") {
      const text = z.string().max(20000).parse(input.text);
      const replyRef =
        z
          .string()
          .regex(/^[1-9][0-9]{0,19}$/)
          .nullable()
          .optional()
          .parse(input.reply_to_message_ref) ?? null;
      if (/sk-or-v1-[a-f0-9]{32,}|\b\d{7,12}:[A-Za-z0-9_-]{30,}/.test(text))
        return logged({ error: "use_secure_credentials_interface" }, 400);
      const { data: prior, error } = await db
        .from("control_messages")
        .select("id,text,reply_to_message_ref")
        .eq("user_id", uid)
        .eq("chat_ref", chat)
        .eq("message_ref", identity.message)
        .maybeSingle();
      if (error) throw new Error("context_unavailable");
      if (prior && (prior.text !== text || (prior.reply_to_message_ref ?? null) !== replyRef))
        throw new Error("idempotency_conflict");
      if (!prior) {
        const { error } = await db.from("control_messages").insert({
          user_id: uid,
          chat_ref: chat,
          message_ref: identity.message,
          text,
          reply_to_message_ref: replyRef,
        });
        if (error) throw new Error("context_save_failed");
      }
      return logged({ status: "ready" });
    }
    const { data: message, error: messageError } = await db
      .from("control_messages")
      .select("text,created_at,reply_to_message_ref")
      .eq("user_id", uid)
      .eq("chat_ref", chat)
      .eq("message_ref", identity.message)
      .maybeSingle();
    if (messageError || !message || Date.parse(message.created_at) < Date.now() - 1800000)
      throw new Error("inbound_context_required");
    if (
      ["development_request", "upload", "export", "learning"].includes(action) ||
      (action === "learning_manage" && input.operation === "generate_plan")
    ) {
      await rpc(db, "agent_v2_control_guard", {
        p_uid: uid,
        p_chat: chat,
        p_message: identity.message,
      });
    }
    if (action === "confirm_v2") {
      const id = z.object({ approval_id: z.uuid() }).strict().parse(input).approval_id;
      if (message.text !== "confirm v2 " + id) throw new Error("invalid_confirmation");
      const requestKey = "tg:" + chat + ":" + identity.message + ":v2:confirm";
      const result = await rpc<{ id: string }>(db, "agent_v2_confirm_telegram", {
        p_uid: uid,
        p_key: requestKey,
        p_approval: id,
        p_chat: chat,
        p_message: identity.message,
      });
      const { runWorkflow } = await import("@/lib/agent-v2/runner.server");
      return logged(
        await runWorkflow(
          db,
          {
            uid,
            source: "telegram",
            requestKey,
            text: message.text,
            chatRef: chat,
            messageRef: identity.message,
          },
          result.id,
        ),
      );
    }
    if (action === "v2") {
      const { dispatchV2 } = await import("@/lib/agent-v2/service.server");
      const { v2Envelope, V2Error } = await import("@/lib/agent-v2/contracts");
      const parsed = v2Envelope.safeParse(input);
      if (!parsed.success) return logged({ error: "invalid_request" }, 400);
      const semantic =
        parsed.data.operation === "focus"
          ? "focus:" + parsed.data.input.action
          : parsed.data.operation;
      try {
        return logged(
          await dispatchV2(
            db,
            {
              uid,
              source: "telegram",
              text: message.text,
              chatRef: chat,
              messageRef: identity.message,
              requestKey: "tg:" + chat + ":" + identity.message + ":v2:" + semantic,
            },
            parsed.data,
          ),
        );
      } catch (e) {
        return logged(
          { error: e instanceof V2Error ? e.code : "v2_request_failed" },
          e instanceof V2Error ? e.status : 500,
        );
      }
    }
    if (action === "job_intake") {
      const fields = z
        .object({
          company: z.string().trim().min(1).max(200),
          role: z.string().trim().min(1).max(200),
          location: z.string().trim().min(1).max(200).optional(),
          job_url: z.string().url().max(2000).optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
        })
        .strict()
        .parse(input);
      // The owner's forwarded post is the description: the model never retypes or edits it.
      const description = message.text;
      if (description.trim().length < 80) throw new Error("job_post_too_short");
      const raw = db as unknown as Db;
      const rows = async (table: string, columns: string) => {
        const { data, error } = await raw
          .from(table)
          .select(columns)
          .eq("user_id", uid)
          .is("deleted_at", null)
          .limit(1000);
        if (error) throw new Error("context_unavailable");
        return (data ?? []) as unknown as Record<string, unknown>[];
      };
      const [apps, skills, evidence, tasks] = await Promise.all([
        rows("job_applications", "id,company,role"),
        rows("skills", "id,name,status"),
        rows("evidence", "skill_id,title"),
        rows("tasks", "skill_id,title,status"),
      ]);
      const same = (a: unknown, b: string) =>
        String(a ?? "")
          .trim()
          .toLowerCase() === b.toLowerCase();
      const existing = apps.find(
        (app) => same(app.company, fields.company) && same(app.role, fields.role),
      );
      if (existing)
        return logged({
          status: "already_tracked",
          application_id: existing.id,
          next: "Nothing was created. Update the existing application instead.",
        });
      const data = { skills, evidence, tasks } as unknown as AppData;
      const apiKey = process.env.LOVABLE_API_KEY;
      let analysis: JobAnalysis | null = null;
      if (apiKey && !(await checkAiQuota(uid, "analyze-jd")))
        analysis = await analyzeJobPosting(apiKey, description).catch(() => null);
      const groups: [string, string[]][] = analysis
        ? [
            ["required", analysis.required_skills],
            ["preferred", analysis.preferred_skills],
            ["tool", analysis.tools],
            ["cloud", analysis.cloud_requirements],
          ]
        : [["required", analyzeJobDescription(description, data).map((g) => g.name)]];
      const seen = new Set<string>();
      const requirements = groups
        .flatMap(([type, names]) =>
          names
            .map((name) => name.trim().slice(0, 200))
            .filter((name) => name && !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()))
            .map((name) => ({ type, name })),
        )
        .slice(0, 49);
      const gap = new Map(
        assessRequirements(
          requirements.map((r) => r.name),
          data,
        ).map((g) => [g.name, g.assessment]),
      );
      const ops = [
        {
          entity: "job_applications",
          action: "create",
          ref: "app",
          values: {
            company: fields.company,
            role: fields.role,
            ...(fields.location ? { location: fields.location } : {}),
            ...(fields.job_url ? { job_url: fields.job_url } : {}),
            ...(fields.priority ? { priority: fields.priority } : {}),
            job_description: description,
            status: "Saved",
            date_found: (await ownerClock(db, uid)).date,
          },
        },
        ...requirements.map((r) => {
          const skill = skills.find((s) => same(s.name, r.name));
          return {
            entity: "job_skill_requirements",
            action: "create",
            values: {
              application_id: "$app",
              skill_name: r.name,
              requirement_type: r.type,
              assessment: gap.get(r.name) ?? "Gap",
              ...(skill ? { skill_id: skill.id } : {}),
            },
          };
        }),
      ];
      // Several linked writes always return an exact preview for the owner's confirm reply.
      const result = await rpc<Record<string, unknown>>(db, "control_execute", {
        p_uid: uid,
        p_chat: chat,
        p_message: identity.message,
        p_key: key,
        p_ops: validateOperations(ops),
      });
      return logged({
        ...result,
        analysis_source: analysis ? "ai" : "local",
        gap: requirements.map((r) => ({ name: r.name, assessment: gap.get(r.name) ?? "Gap" })),
        experience_signals: analysis?.experience_signals ?? [],
        responsibilities: analysis?.responsibilities ?? [],
      });
    }
    if (action === "catalog") {
      const entity = input.entity ? String(input.entity) : null;
      if (entity && !Object.hasOwn(registry, entity)) throw new Error("unsupported_entity");
      return logged({
        entities: entity
          ? { [entity]: registry[entity] }
          : Object.fromEntries(
              Object.entries(registry).map(([name, e]) => [
                name,
                {
                  writable: e.writable,
                  operations: e.operations,
                  fields: Object.keys(e.fields),
                  editable_fields: Object.entries(e.fields)
                    .filter(([, f]) => f.editable)
                    .map(([k]) => k),
                },
              ]),
            ),
        capabilities: [
          "set_recurrence (tasks; values: {cadence: daily|weekly|monthly|null}; exact confirmation required)",
          "set_completed (subtasks, project_milestones, followups; values: {completed: boolean})",
          "query",
          "search",
          "resolve",
          "execute",
          "record_time (tasks operation)",
          "undo",
          "report",
          "export",
          "learning",
          "upload",
          "download",
          "development_request",
        ],
        external_sending: "Unavailable; outreach records are drafts and manual-send records only.",
      });
    }
    if (action === "context") {
      const { data, error } = await db
        .from("control_context")
        .select("entity,record_ids,selected_id,updated_at,base_offset,lists")
        .eq("user_id", uid)
        .eq("chat_ref", chat)
        .maybeSingle();
      if (error) throw new Error("context_unavailable");
      return logged({
        // The SDK prompt only carries the conversation's start date; give the owner's actual clock.
        owner_clock: await ownerClock(db, uid),
        context: data,
        owner_binding: "verified",
        conversation: "authorized private Telegram",
        integration: {
          expected_provider: "openrouter",
          expected_model: "meta/muse-spark-1.3-contributor",
          learning_cron_policy:
            "46a628bb9ae9 must remain disabled; app settings do not activate the host job",
        },
      });
    }
    if (action === "query") return logged(await query(db, uid, String(input.entity), input, chat));
    if (action === "search") return logged(await search(db, uid, input, chat));
    if (action === "resolve") return logged(await resolve(db, uid, chat, input));
    if (action === "report") return logged(await report(db, uid, input));
    if (action === "execute") {
      const ops = validateOperations(input.operations);
      return logged(
        await rpc(db, "control_execute", {
          p_uid: uid,
          p_chat: chat,
          p_message: identity.message,
          p_key: key,
          p_ops: ops,
        }),
      );
    }
    if (action === "confirm") {
      const id = z.string().uuid().parse(input.approval_id);
      if (message.text.trim().toLowerCase() !== "confirm " + id)
        throw new Error("invalid_confirmation");
      const { data: a, error } = await db
        .from("control_approvals")
        .select("operations")
        .eq("id", id)
        .eq("user_id", uid)
        .eq("chat_ref", chat)
        .maybeSingle();
      if (error || !a) throw new Error("invalid_confirmation");
      if (
        Array.isArray(a.operations) &&
        typeof a.operations[0] === "object" &&
        a.operations[0] !== null &&
        "action" in a.operations[0] &&
        a.operations[0].action === "learning_workflow"
      ) {
        const { confirmWorkflow } = await import("./workflows.server");
        return logged(await confirmWorkflow(db, uid, chat, identity.message, id, key));
      }
      if (
        Array.isArray(a.operations) &&
        typeof a.operations[0] === "object" &&
        a.operations[0] !== null &&
        "action" in a.operations[0] &&
        a.operations[0].action === "undo"
      )
        return logged(
          await rpc(db, "control_confirm_undo", {
            p_uid: uid,
            p_chat: chat,
            p_message: identity.message,
            p_id: id,
            p_key: key,
          }),
        );
      return logged(
        await rpc(db, "control_execute", {
          p_uid: uid,
          p_chat: chat,
          p_message: identity.message,
          p_key: key,
          p_ops: validateOperations(a.operations),
          p_approval: id,
        }),
      );
    }
    if (action === "undo") {
      const requestKey = z.string().min(8).max(200).parse(input.request_key);
      return logged(
        await rpc(db, "control_prepare_undo", {
          p_uid: uid,
          p_chat: chat,
          p_request: requestKey,
          p_key: key,
        }),
      );
    }
    if (action === "learning_manage") {
      const operation = z
        .enum(["status", "generate_plan", "sync_guide", "finish_baseline"])
        .parse(input.operation);
      const svc = await import("@/lib/learning/service.server");
      if (operation === "generate_plan")
        return logged(await svc.generateToday(db, uid, new URL(request.url).origin));
      if (operation === "status")
        return logged({
          preferences: (await query(db, uid, "learning_preferences", {})).rows,
          source: (await query(db, uid, "curriculum_sources", {})).rows,
          assignments: await query(db, uid, "learning_assignments", {}),
        });
      return logged(
        await rpc(db, "control_prepare_workflow", {
          p_uid: uid,
          p_chat: chat,
          p_operation: operation,
          p_key: key,
        }),
      );
    }
    if (action === "learning") {
      const svc = await import("@/lib/learning/service.server");
      const feedback = z
        .object({
          assignment_id: z.string().uuid().optional(),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          kind: z.enum(["completed", "partial", "not_started", "reschedule", "help", "minutes"]),
          minutes: z.number().int().min(0).max(600).optional(),
          minutes_mode: z.enum(["total", "additional"]).optional(),
          notes: z.string().max(4000).optional(),
          new_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        })
        .strict()
        .parse(input);
      const verified = verifyFeedbackIntent(message.text, feedback);
      let telegram:
        { chat_ref: string; message_id: string; reply_to_message_id: string } | undefined;
      if (message.reply_to_message_ref) {
        // The authenticated ingress captures the actual Telegram reply. Never accept a
        // model-supplied reply ID or guess between legacy chat-reference conventions.
        const { data: mappings, error } = await db
          .from("telegram_message_map")
          .select("chat_ref,assignment_id")
          .eq("user_id", uid)
          .eq("message_id", message.reply_to_message_ref)
          .eq("direction", "outbound")
          .eq("delivery_status", "sent")
          .is("deleted_at", null)
          .limit(2);
        if (
          error ||
          mappings?.length !== 1 ||
          !mappings[0].assignment_id ||
          (feedback.assignment_id && feedback.assignment_id !== mappings[0].assignment_id)
        )
          throw new Error("needs_clarification");
        telegram = {
          chat_ref: mappings[0].chat_ref,
          message_id: identity.message,
          reply_to_message_id: message.reply_to_message_ref,
        };
      } else if (!feedback.assignment_id && !feedback.date) {
        throw new Error("needs_clarification");
      }
      return logged(
        await svc.applyFeedback(db, uid, {
          ...feedback,
          ...verified,
          idempotency_key: key,
          channel: telegram ? "telegram" : "agent",
          ...(telegram ? { telegram } : {}),
          text: message.text,
        } as Parameters<typeof svc.applyFeedback>[2]),
      );
    }
    if (action === "development_request") {
      const text = z.string().min(5).max(20000).parse(input.request);
      return logged(
        await rpc(db, "control_queue_development", { p_uid: uid, p_request: text, p_key: key }),
      );
    }
    if (action === "history") {
      const options = z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
          entity: z.string().optional(),
          request_key: z.string().max(200).optional(),
          from: z.string().datetime({ offset: true }).optional(),
          to: z.string().datetime({ offset: true }).optional(),
        })
        .strict()
        .parse(input);
      let q = db
        .from("control_changes")
        .select("id,request_key,entity,record_id,created_at,undone_at,before_row,after_row")
        .eq("user_id", uid)
        .order("sequence", { ascending: false })
        .range(options.offset, options.offset + options.limit);
      if (options.entity) q = q.eq("entity", options.entity);
      if (options.request_key) q = q.eq("request_key", options.request_key);
      if (options.from) q = q.gte("created_at", options.from);
      if (options.to) q = q.lte("created_at", options.to);
      const { data, error } = await q;
      if (error) throw new Error("context_unavailable");
      const more = (data?.length ?? 0) > options.limit;
      return logged({
        changes: (data ?? []).slice(0, options.limit),
        limit: options.limit,
        has_more: more,
        next_offset: more ? options.offset + options.limit : null,
      });
    }
    if (action === "export") {
      const response = await exportWorkspace(db, uid, input, key);
      await note(response.status);
      return response;
    }
    if (action === "upload" || action === "download") {
      const { fileAction } = await import("./files.server");
      return logged(await fileAction(db, uid, action, input, key));
    }
    throw new Error("unsupported_action");
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    const known = errorCodes.find((c) => text.includes(c));
    if (auditUid) {
      try {
        await db.from("audit_events").insert({
          user_id: auditUid,
          actor: "agent",
          action: "control_rejected",
          entity_type: "control",
          source: "agent",
          detail: {
            chat_ref: chat,
            message_ref: identity.message,
            operation: action,
            error: known ?? "request_rejected",
            duration_ms: Date.now() - started,
          },
        });
      } catch {
        /* Error reporting must not turn a rejected write into a claimed success. */
      }
    }
    return agentJson(
      {
        error: known ?? "request_rejected",
        status:
          known === "source_approval_required"
            ? "Use Career OS as the signed-in owner for this action, or prepare a supported V2 workflow and confirm its exact preview."
            : "No success is claimed; re-read the record before retrying a rejected operation.",
      },
      known ? 409 : 422,
    );
  }
}
/** Owner's local date/time from the saved learning timezone (Asia/Kolkata when unset). */
async function ownerClock(db: SupabaseClient<Database>, uid: string) {
  const { data: prefs, error } = await db
    .from("learning_preferences")
    .select("timezone")
    .eq("user_id", uid)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error("context_unavailable");
  const saved = isValidTimeZone(prefs?.timezone);
  const timezone = saved ? String(prefs?.timezone) : DEFAULT_TZ;
  const now = zonedParts(new Date(), timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    timezone,
    timezone_source: saved ? "saved" : "default",
    date: now.date,
    time: pad(Math.floor(now.minutes / 60)) + ":" + pad(now.minutes % 60),
    weekday: new Date(now.date + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }),
  };
}
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)]),
    );
  return v;
}
/** Coarse step label for the call log: registry entity/operation names only, never values. */
function stepOf(action: string, input: Record<string, unknown>): string | undefined {
  const name = (v: unknown) => (typeof v === "string" && /^[a-z_.]{1,40}$/.test(v) ? v : "");
  const inner = input.input as Record<string, unknown> | undefined;
  let step = "";
  if (action === "v2")
    step = [name(input.operation), name(inner?.action)].filter(Boolean).join(":");
  else if (action === "learning_manage") step = name(input.operation);
  else if (action === "learning") step = name(input.kind);
  else if (action === "execute" && Array.isArray(input.operations))
    step = [
      ...new Set(
        input.operations.map(
          (op: Record<string, unknown>) => `${name(op?.entity)}:${name(op?.action)}`,
        ),
      ),
    ]
      .slice(0, 6)
      .join(",");
  else step = name(input.entity);
  return step || undefined;
}
async function exportWorkspace(
  db: Db,
  uid: string,
  input: Record<string, unknown>,
  key: string,
): Promise<Response> {
  const requested = input.entity ? String(input.entity) : null;
  if (requested && !Object.hasOwn(registry, requested)) throw new Error("unsupported_entity");
  const entities = requested ? [requested] : Object.keys(registry);
  const project = input.project_id === undefined ? null : z.string().uuid().parse(input.project_id);
  const data = await rpc<Record<string, unknown>>(db, "control_export", {
    p_uid: uid,
    p_entities: entities,
    p_project: project,
  });
  let body = JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2),
    type = "application/json",
    ext = "json";
  if (input.format === "csv") {
    if (!requested) throw new Error("CSV_requires_one_entity");
    const rows = data[requested] as Record<string, unknown>[];
    const fields = Object.keys(registry[requested].fields);
    const quote = csvCell;
    body = [
      fields.map(quote).join(","),
      ...rows.map((r) => fields.map((k) => quote(r[k])).join(",")),
    ].join("\r\n");
    type = "text/csv";
    ext = "csv";
  }
  if (Buffer.byteLength(body) > 20_000_000) throw new Error("export_too_large_use_entity_export");
  const path =
    uid + "/control-exports/" + createHash("sha256").update(key).digest("hex") + "." + ext;
  const { error } = await db.storage
    .from("career-evidence")
    .upload(path, body, { contentType: type, upsert: true });
  if (error) throw new Error("export_failed");
  const { data: signed, error: signError } = await db.storage
    .from("career-evidence")
    .createSignedUrl(path, 300);
  if (signError || !signed) throw new Error("export_failed");
  return agentJson({
    status: "completed",
    format: ext,
    entities: entities.length,
    download_url: signed.signedUrl,
    expires_in: 300,
    private: true,
    restore_supported: false,
    project_scope: project,
  });
}
