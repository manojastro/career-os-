# Hermes tool capability matrix — Career OS V2 baseline

29 October 2026. Read with `CAREER-OS-V2-MASTER-AUDIT.md`. Status vocabulary: source-supported = implementation inspected; unverified = no fresh live evidence; absent = not exposed by reviewed Career OS baseline; blocked = credential/deployment/approval prerequisite. An installed SDK feature is not an enabled Career OS tool.

## Current Career OS tool contract

All tool names below are registered by `scripts/hermes-career-control/__init__.py:138` from the fifteen actions at `:17`; strict model schemas are at `:146`. Transport identity is obtained from trusted session context (`:71`), never tool arguments. Telegram guard at `:115` blocks other tools. Root metadata reports this control plugin absent from the live profile and control HTTP 406, so all fifteen remain **source-supported, not live activated**.

| Tool | Supported operation / result | Important boundary |
| --- | --- | --- |
| career_catalog | Entity/field/enum/relationship catalog | 58 entities, 43 writable, 15 read-only; inspect registry, not invented fields. |
| career_context | Real owner context | Does not expose browser-local active timer or authoritative V2 personal memory. |
| career_query | Owned structured filtering, bounded pages | Continue next_offset; selection references stored by module. |
| career_search | Search named entities | Ambiguous results require clarification; no external research search. |
| career_resolve | Actual ID/name/ordinal/selected reference | Expired selection context must be re-listed. |
| career_execute | Up to 50 transactional owned CRUD/special operations | Only reviewed writable fields; exact replay receipts; destructive/bulk/substantial edits require actual human confirmation. No active Focus start/stop API. |
| career_learning | Explicit assignment feedback/minutes/reschedule/help | Genuine owner text/reply mapping; canonical learning transaction and no invented mastery/duration. |
| career_learning_manage | Status, generate_plan, sync_guide, finish_baseline | Guide/baseline approval path; does not enable disabled automation. |
| career_report | Actual date-range report | Persisted ledger and non-mirror totals, not inferred activity. |
| career_export | JSON/CSV/entity/project export | Private bounded output; not database or binary backup restoration. |
| career_upload | Trusted current-message attachment index | Regular-file/size check; server MIME/signature/owned storage validation; processing not_started. |
| career_download | Owned stored attachment signed URL | 300-second link; no arbitrary filesystem read or remote fetch. |
| career_history | Persisted changes/audit references | Does not constitute multi-system execution graph. |
| career_undo | Preview and confirmed conflict-aware restoration | Request identity and actual prior snapshots required; no arbitrary external undo. |
| career_development_request | Saves pending development request | No autonomous implementation, deploy or publish executor. |

Implementation counterparts: `src/lib/control/service.server.ts:76`, `protocol.ts:39`, `queries.server.ts:37`, `files.server.ts:29`, `workflows.server.ts:3`; `drizzle/migrations/0005_telegram_control.sql:357`, `:446`, `:554`. Coverage tests inspected: `scripts/test_hermes_career_control.py:16` through `:74`, `src/lib/control/service.test.ts:81`, `files.test.ts:37`, `__tests__/transactions.test.ts:487`, `:517`, `:1005`. Inspection is not today's passing test result.

## Required integration capability map

| Capability | Existing application / SDK primitive | Baseline status and blocker | Required V2 proof |
| --- | --- | --- | --- |
| Natural-language task actions | Prompt resolves enums/IDs; execute validates and returns actual rows | Partial: model interpretation plus explicit transactional actions; no durable semantic plan identity | Actual task lookup/create/update/complete with ambiguity handling and stable execution receipts. |
| Duplicate suppression | Plugin SQLite seen_messages; server payload-derived key; SQL receipts | Exact retry source-supported; changed payload/new message not semantic dedupe; crash gap (V2-003) | Persist ingress/workflow identity and deterministic steps; restart/failure tests, no repeat of committed action. |
| Active task/Focus | Browser localStorage timer; focus_sessions saved ledger | Partial, device-local active timer; no Telegram start/stop (V2-002) | Global owned active state, pause/resume/stop, concurrent channel exclusivity, actual elapsed time, one canonical save. |
| Completion-based recurrence | Opt-in task recurrence trigger | Source-supported; not a background reminder scheduler | Preserve opt-in semantics; do not infer future reminder delivery from successor task. |
| Learning | Deterministic parser/engine, transactional assignment/feedback/time, delivery reservations | Source-supported; real baseline/guide completeness and live loop blocked; job `46a628bb9ae9` remains disabled | Genuine assignment/delivery/reply/progress proof in authorized fixture and then approved live scope. |
| Google public guide read | Allowlisted Docs export/published HTML and DOCX input | Implemented public import only; not OAuth Workspace integration | Keep bounded redirects/parser rollback; official OAuth read/write requires separate adapter proof. |
| Google Docs create/edit | No reviewed Career OS adapter/tool | Absent; checked OAuth env keys absent; production authorization not supplied | Scoped auth, registry destination, revision-aware section edit, verified read-back and actual link. |
| Google Sheets read/update | No reviewed Career OS adapter/tool | Absent; same credential/deployment blockers | Explicit spreadsheet/tab/range, bounded operations, conflict/idempotency and persisted verification. |
| Google Drive registry/discovery | source_documents stores Career OS imported metadata, not Google operation/revision registry | Absent for required aliases/scopes/revisions | Owner-scoped aliases, file IDs, supported operations, revision/sync/permission status; ambiguous alias blocks. |
| Persistent owner memory | Business preferences/context; Hermes curated file memory exists | Partial primitives; no authoritative Career OS memory lifecycle/provenance API | PostgreSQL categories, provenance/trust, corrections, contradictions, expiry/deletion; no secrets. |
| Conversation/session context | ContextVar SDK and stored Career OS reference lists | Source-supported selection/transport context; not complete execution memory | Trusted actor/chat/message provenance plus durable pending clarification/result references. |
| One-time/recurring reminders | Followup/event dates; SDK durable cron stores and delivery queue | Career OS reminders absent; SDK usable building blocks, not currently authorized Telegram tools | Explicit owner timezone/time/default, persistent occurrence ID, scheduler registration, cancel/edit, receipt and recovery. |
| Multi-system workflow | Local atomic operation batch; learning workflow claim/finish | General orchestration absent (V2-007) | Durable step dependencies, lease/fence, completed/failed/uncertain states, restart and cancellation races. |
| Research | Saved URLs/resources; no reviewed generic research fetch adapter | Absent for safe automated search/fetch-to-document workflow | Source attribution, untrusted content isolation, SSRF/redirect/DNS/size limits and verified saved references. |
| Document intelligence | Bounded DOCX text parser and file metadata | Partial; PDF/image upload does not prove extraction | Bounded parsing job, supported media types, extraction status/errors, source trust and recoverability. |
| GitHub management | Project repository URL and pending development requests | Tracking only; no reviewed source-owned GitHub executor | Explicit repository/permission adapter, reviewable write approval and real result verification. |
| Telegram delivery | Existing learning reserve-before-send/finish | Source primitives; actual control plugin uninstalled; no V2 reminder delivery | Trusted delivery worker, receipt, uncertain-send fence and approved live end-to-end proof. |
| Cost/observability | Agent audit/change receipts; app AI budgets | Partial; no general V2 workflow cost ledger or controlled optimization | Safe execution/step trace and actual usage when available; preserve approved provider/model. |

## Installed Hermes SDK inspection

Inspected source root: `C:/Users/manoj/AppData/Local/hermes/hermes-agent`. Python runtime available at `venv/Scripts/python.exe`; no live-profile import/execution was needed for this audit. `pyproject.toml:5` reports 0.21.3; read-only Git describe reports `v2026.5.16-28148-g01382698fc-dirty`. A dirty checkout requires pinning exact reviewed source before relying on release behavior. These observations do not independently prove gateway process source parity.

| SDK surface | Exact observed interface/source | Compatibility / boundary |
| --- | --- | --- |
| Plugin initialization | `hermes_cli/plugins.py:225` PluginContext; `:460` register_tool; `:916` register_hook; `:940` register_system_prompt_section | Existing plugin register(ctx) uses actual supported methods. No invented startup/service API needed. Existing isolated SDK fixture at `scripts/test_hermes_career_control.py:74`; root reruns it separately. |
| Tool registration/dispatch | `tools/registry.py:649` register, `:824` get_definitions, `:874` dispatch | Fifteen constrained career_* tools should remain Telegram surface. Do not expose generic filesystem/terminal/provider/scheduler tools as a shortcut. |
| Hook enforcement | `hermes_cli/plugins.py:1904` pre-tool dispatch; existing plugin `:79` ingress and `:115` guard | Actual event source/internal/bot/private metadata and raw confirmation captured before model rewrite. Hook presence alone does not verify live invocation. |
| Task-local identity | `gateway/session_context.py:10`, `:115` set_session_vars, `:173` get_session_env | ContextVar-backed per-task context with documented fallback; existing plugin additionally checks trusted inbound SQLite record and 30-minute age. Never accept actor authority from model args. |
| Telegram adapter | `plugins/platforms/telegram/adapter.py:5757` documents bounded attachment download into cache | Existing plugin reads only normalized current-message media. Adapter/cache safety is distinct from arbitrary model path or remote research URL. No attachment bodies/account data opened. |
| Curated memory | `tools/memory_tool.py:2`, `:38`, `:172`; separate `memory_tool_store.py` | File-backed MEMORY.md / USER.md management is real SDK functionality. It is not PostgreSQL Career OS memory; no private memory file was opened or copied. Telegram allowlist currently blocks generic memory tool. |
| Durable scheduler store | `cron/jobs.py:18` cross-process locking, `:39` atomic file utility, `:74` jobs.json, `:171` use_cron_store | Reuse supported SDK mechanisms after pinning contract. Do not edit live jobs.json or assume a process restart tests host reboot recovery. |
| Cron delivery queue | `cron/delivery_queue.py:79` schema; `:106` states pending/delivering/delivered/failed/unknown/suppressed; `:218` claim_next; `:271` recover_abandoned | SQLite reserve-before-send and unknown fencing exist. No need to invent these APIs; still requires owner-bound Career OS reminder mapping and approved worker integration. Unknown is not safe automatic retry. |
| Gateway session persistence | Source files `gateway/session_persistence.py:1`, `session_recovery.py:1`, `session_context.py:1` | SDK has session persistence/recovery modules; not proof of Career OS workflow checkpointing or production crash/reboot success. |

No credential values, protected configuration, private memory, conversations, account bodies or live scheduler records were read by this worker. Provider/model/job facts above come from the root controller's safe metadata checks. No registration, activation, send, external API write or scheduler mutation occurred.

## Acceptance boundary

The V2 acceptance examples cross several currently absent surfaces. Research → Google edit → task → Sunday reminder must remain blocked/partial until destination, OAuth, date/time and trusted execution receipts exist. A local mocked Google response proves protocol handling only. The source has useful transactional, identity and reservation foundations, but no source inspection or unit test can convert missing live integration into a completed personal chief-of-staff workflow.
