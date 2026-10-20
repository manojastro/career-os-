import { createHash } from "node:crypto";
import { z } from "zod";
import { agentJson, verifyAgentToken } from "@/lib/agent-auth.server";
import { readJsonLimited } from "@/lib/learning/http";
import { registry, validateOperations, verifyTelegramIdentity } from "./protocol";
import { csvCell } from "./csv";
import { verifyFeedbackIntent } from "./learning-feedback";
import { allRows, query, resolve, search, report, rpc, type Db } from "./queries.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
const envelope = z
  .object({
    identity: z
      .object({ sender: z.string(), chat: z.string(), chat_type: z.string(), message: z.string() })
      .strict(),
    action: z.string().max(40),
    input: z.record(z.unknown()).default({}),
  })
  .strict();
const errorCodes = [
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
];
export async function handleControl(request: Request): Promise<Response> {
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
        return agentJson({ error: "use_secure_credentials_interface" }, 400);
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
      return agentJson({ status: "ready" });
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
    if (action === "catalog") {
      const entity = input.entity ? String(input.entity) : null;
      if (entity && !Object.hasOwn(registry, entity)) throw new Error("unsupported_entity");
      return agentJson({
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
      return agentJson({
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
    if (action === "query")
      return agentJson(await query(db, uid, String(input.entity), input, chat));
    if (action === "search") return agentJson(await search(db, uid, input, chat));
    if (action === "resolve") return agentJson(await resolve(db, uid, chat, input));
    if (action === "report") return agentJson(await report(db, uid, input));
    if (action === "execute") {
      const ops = validateOperations(input.operations);
      return agentJson(
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
        return agentJson(await confirmWorkflow(db, uid, chat, identity.message, id, key));
      }
      if (
        Array.isArray(a.operations) &&
        typeof a.operations[0] === "object" &&
        a.operations[0] !== null &&
        "action" in a.operations[0] &&
        a.operations[0].action === "undo"
      )
        return agentJson(
          await rpc(db, "control_confirm_undo", {
            p_uid: uid,
            p_chat: chat,
            p_message: identity.message,
            p_id: id,
            p_key: key,
          }),
        );
      return agentJson(
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
      return agentJson(
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
        return agentJson(await svc.generateToday(db, uid, new URL(request.url).origin));
      if (operation === "status")
        return agentJson({
          preferences: (await query(db, uid, "learning_preferences", {})).rows,
          source: (await query(db, uid, "curriculum_sources", {})).rows,
          assignments: await query(db, uid, "learning_assignments", {}),
        });
      return agentJson(
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
      return agentJson(
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
      return agentJson(
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
      return agentJson({
        changes: (data ?? []).slice(0, options.limit),
        limit: options.limit,
        has_more: more,
        next_offset: more ? options.offset + options.limit : null,
      });
    }
    if (action === "export") return exportWorkspace(db, uid, input, key);
    if (action === "upload" || action === "download") {
      const { fileAction } = await import("./files.server");
      return agentJson(await fileAction(db, uid, action, input, key));
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
          },
        });
      } catch {
        /* Error reporting must not turn a rejected write into a claimed success. */
      }
    }
    return agentJson(
      {
        error: known ?? "request_rejected",
        status: "No success is claimed; re-read the record before retrying a rejected operation.",
      },
      known ? 409 : 422,
    );
  }
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
