# Career Compass Agent API

Base URL: `https://career-os-manoj.lovable.app` (preview builds use the preview host).
All endpoints are JSON, `Cache-Control: no-store`, outbound-polled by the Linux worker.

## Authentication
- Header: `Authorization: Bearer <token>` (32–512 chars, long random string).
- The server stores only `AGENT_TOKEN_SHA256` (lowercase hex SHA-256 of the token, a server-only secret) and compares digests in constant time. The raw token is never stored or logged.
- Generate: `openssl rand -base64 48` → digest: `printf %s "$TOKEN" | sha256sum`.
- Until `AGENT_TOKEN_SHA256` is set, every endpoint returns `503 {"error":"agent_endpoint_not_activated"}`.

## Owner binding
All agent data is written for exactly one owner account (table `agent_owner`). The owner (`manojkumar9080@gmail.com`, email confirmed) signs in and clicks **Settings → Agent → Link agent to my account** (calls `claim_agent_owner()`). No other account can bind or see those rows. Before binding: `409 {"error":"agent_owner_not_bound"}`.

## POST /api/agent/ingest
Body (strict — unknown keys are rejected, max 1 MB). Only `run` is required; every array is optional.
```json
{
  "run": {"workflow":"morning_briefing","idempotency_key":"morning_briefing:2026-09-28","status":"succeeded",
          "started_at":"2026-09-28T01:30:00Z","finished_at":"2026-09-28T01:31:10Z","next_run_at":"2026-09-29T01:30:00Z",
          "error":"","usage":{"input_tokens":1200,"output_tokens":400,"cost_usd":0.01},"delivery":{"telegram":"delivered"}},
  "companies":[{"name":"Acme","website":"https://acme.com","source_url":"https://...","verified_at":"..."}],
  "job_leads":[{"company":"Acme","title":"Data Engineer","location":"Bengaluru","official_url":"https://acme.com/careers/123",
                "source_url":"https://...","verified_at":"2026-09-28T01:20:00Z","status":"verified",
                "summary":"...","fit_notes":"...","fit_is_inference":true}],
  "recommendations":[{"dedupe_key":"tp:2026-09-28","kind":"top_priority","title":"...","body":"...","priority":90,
                      "briefing_date":"2026-09-28","is_inference":true,"source_url":"","verified_at":null}],
  "study_tasks":[{"dedupe_key":"...","title":"...","resource_url":"https://...","estimated_minutes":45,"due_date":"2026-09-29","priority":"high"}],
  "project_tasks":[{"dedupe_key":"...","project_id":"<uuid owned by owner>","title":"...","kind":"milestone"}],
  "outreach":[{"dedupe_key":"...","recipient":"Jane","channel":"linkedin","draft":"...","reason":"..."}],
  "events":[{"dedupe_key":"...","title":"...","starts_at":"...","source_url":"https://...","verified_at":"..."}],
  "source_documents":[{"dedupe_key":"...","title":"...","kind":"resume","summary":"...","status":"processed"}],
  "uncertain_claims":[{"dedupe_key":"...","claim":"...","source_url":"https://...","confidence":40}],
  "notifications":[{"dedupe_key":"...","title":"Briefing ready","channel":"telegram","delivery_status":"delivered","delivered_at":"..."}]
}
```
Rules:
- Runs one DB transaction (`agent_ingest`). Any rejected row rolls back the whole payload.
- `run.idempotency_key` is unique per owner; re-sending updates the same run (status/usage/delivery) and re-upserts items. Reusing a key for a different workflow → `409 idempotency_key_conflict`.
- Job leads dedupe on company + title + location + official_url (case-insensitive) → one row. `official_url` is required; `status:"verified"` requires `verified_at`. User statuses (saved/applied/dismissed) are never overwritten.
- Other arrays dedupe on `dedupe_key`. Outreach drafts are only rewritten while still `draft`. Nothing is ever sent, applied, registered or edited on the user's behalf.
- Linked ids (`project_id`, `skill_id`, `contact_id`, `document_id`) must belong to the owner.

Response `200 {"ok":true,"run_id":"<uuid>","new_run":true,"counts":{"job_leads":1,...}}`.
Errors: `400 invalid_json|invalid_payload` (with `issues`), `401 unauthorized`, `409`, `413 payload_too_large`, `422 write_rejected`, `503`.

## GET /api/agent/commands?cursor=<ISO timestamp>&limit=20
Atomically claims queued commands (`FOR UPDATE SKIP LOCKED`, status → `claimed`) and returns user input since `cursor`:
```json
{"cursor":"2026-09-28T01:40:00.123Z",
 "commands":[{"id":"<uuid>","command":"run_now","workflow":"job_scan","payload":{},"created_at":"...","claimed_at":"..."}],
 "feedback":[{"id":"...","target_type":"job_lead","target_id":"...","action":"dismiss","note":"","created_at":"..."}],
 "preferences":{"target_roles":[],"locations":[],"agent_paused":false,"paused_workflows":[],"...":"..."} ,
 "changes":[{"table":"job_leads","id":"...","dedupe_key":"...","status":"saved","updated_at":"..."}]}
```
`preferences` is `null` when unchanged since the cursor. Store the returned `cursor` and send it next time (omit it on first poll). Commands: `run_now`, `pause`, `resume`, `refresh_preferences`, `reprocess_document`; `workflow` is a workflow name or `all`. Respect `preferences.agent_paused` / `paused_workflows`.

## POST /api/agent/commands
```json
{"id":"<claimed command uuid>","status":"completed","result":{"run_id":"..."}}
```
`status`: `completed`, `failed`, or `queued` (release for retry). Only `claimed` commands can be completed → otherwise `409 command_not_claimed`. State machine: queued→claimed|cancelled, claimed→completed|failed|queued; users may only cancel queued commands.

Times are UTC ISO-8601 on the wire; the app displays Asia/Kolkata.

## GET /api/agent/context?limit=100&before=<ISO>&sections=<csv>
Full authoritative owner context for each daily run (read-only, same bearer auth and owner binding). Only the bound owner's rows (soft-deleted rows excluded) are returned.
- `limit`: items per section, 1–200 (default 100).
- `sections`: optional comma list of `feedback, study_tasks, study_history, job_applications, job_leads, contacts, outreach, projects, project_tasks, source_documents, agent_runs, interview_questions, interview_practice` (default all). Unknown → `400 invalid_sections`.
- `before`: pagination cursor. Items are ordered by `updated_at` desc, then `id` desc; pass a section's `next_before` (with `sections=<that section>`) to fetch the next page. `null` means no more rows.
```json
{"generated_at":"2026-09-28T01:30:00.000Z","timezone":"Asia/Kolkata","limit":100,
 "preferences":{"id":"<uuid>","target_roles":[],"locations":[],"work_types":[],"min_salary":"","avoid_companies":[],
                "focus_skills":[],"briefing_time":"07:00","timezone":"Asia/Kolkata","study_minutes":45,"research_sources":[],"agent_paused":false,"paused_workflows":[],"notes":"","updated_at":"..."},
 "sections":{
   "feedback":{"items":[{"id":"...","target_type":"job_lead","target_id":"...","action":"dismiss","note":"","source":"user","created_at":"...","updated_at":"..."}],"next_before":null},
   "study_tasks":{"items":[{"id":"...","title":"...","detail":"","skill_id":null,"resource_url":"","estimated_minutes":45,"due_date":null,"priority":"medium","status":"queued","is_inference":false,"dedupe_key":null,"source":"user","created_at":"...","updated_at":"..."}],"next_before":null},
   "study_history":{"items":[{"id":"...","study_task_id":null,"skill_id":null,"minutes":30,"notes":"","occurred_at":"...","source":"user","created_at":"...","updated_at":"..."}],"next_before":null},
   "job_applications":{"items":[{"id":"...","company":"...","role":"...","location":"","work_type":"","job_url":"","status":"applied","priority":"medium","date_found":null,"date_applied":null,"followup_date":null,"resume_version":"","notes":"","created_at":"...","updated_at":"..."}],"next_before":null},
   "job_leads":{"items":[{"id":"...","company_id":null,"company":"...","title":"...","location":"...","work_type":"","official_url":"https://...","source_url":"https://...","verified_at":"...","status":"saved","application_id":null,"dedupe_key":"...","created_at":"...","updated_at":"..."}],"next_before":null},
   "contacts":{"items":[{"id":"...","name":"...","company":"","role":"","linkedin_url":"","location":"","relationship_stage":"new","topics":[],"notes":"","last_interaction":null,"next_followup":null,"created_at":"...","updated_at":"..."}],"next_before":null},
   "outreach":{"items":[{"id":"...","contact_id":null,"recipient":"...","channel":"linkedin","subject":"","draft":"...","reason":"","status":"draft","is_inference":true,"dedupe_key":"...","created_at":"...","updated_at":"..."}],"next_before":null},
   "projects":{"items":[{"id":"...","name":"...","description":"","status":"active","technologies":[],"github_url":"","deployment_url":"","start_date":null,"target_date":null,"created_at":"...","updated_at":"..."}],"next_before":null},
   "project_tasks":{"items":[{"id":"...","project_id":"...","title":"...","kind":"milestone","detail":"","evidence_url":"","due_date":null,"status":"todo","is_inference":false,"dedupe_key":null,"created_at":"...","updated_at":"..."}],"next_before":null},
   "source_documents":{"items":[{"id":"...","title":"...","kind":"resume","url":"","storage_path":"<owner-id>/...","summary":"","status":"pending","dedupe_key":null,"source":"user","created_at":"...","updated_at":"..."}],"next_before":null},
   "agent_runs":{"items":[{"id":"...","workflow":"morning_briefing","idempotency_key":"...","status":"succeeded","started_at":"...","finished_at":"...","next_run_at":"...","error":"","usage":{},"delivery":{},"created_at":"...","updated_at":"..."}],"next_before":null}
 }}
```
`preferences` falls back to `{"briefing_time":"07:00","timezone":"Asia/Kolkata","study_minutes":45,"research_sources":[],"agent_paused":false,"paused_workflows":[]}` when the owner hasn't saved any. Default briefing time is 07:00 Asia/Kolkata.
Errors: `400 invalid_cursor|invalid_sections`, `401 unauthorized`, `409 agent_owner_not_bound`, `500 context_unavailable`, `503 agent_endpoint_not_activated`. Error bodies contain no private data.

## GET /api/agent/document?id=<source_document uuid>
Private access to one Vault document of the bound owner (same bearer auth and owner binding). The bucket stays private; nothing is made public and no storage keys are returned.

File-backed document (`storage_path` set) → `200`:
```json
{"type":"file","id":"<uuid>","title":"Resume v3","kind":"resume","status":"new","source_url":null,"updated_at":"...",
 "file_name":"resume.pdf","content_type":"application/pdf","size_bytes":183422,
 "download_url":"https://…/storage/v1/object/sign/career-evidence/…?token=…","expires_at":"2026-09-28T01:45:00.000Z"}
```
`download_url` is a signed GET URL valid for 300 seconds. Download it promptly with a plain GET (no auth header) and parse privately; do not log or store the URL. Re-request if it expires.

Text-only document (no file, e.g. a note) → `200`:
```json
{"type":"text","id":"<uuid>","title":"...","kind":"note","status":"new","source_url":null,"updated_at":"...",
 "content_type":"text/plain","text":"...","truncated":false}
```
`text` is the stored summary/body, capped at 200,000 characters.

Allowed files: png, jpg/jpeg, webp, gif, pdf, docx, txt, md, csv; max 25 MB. Extension and stored content type must agree.

Errors (bodies contain no private data):
`400 invalid_id` · `401 unauthorized` · `404 not_found` (missing, deleted, or not the owner's — indistinguishable) · `404 file_missing` · `404 no_content` · `409 agent_owner_not_bound` · `413 file_too_large` · `415 unsupported_type` · `500 document_unavailable` · `503 agent_endpoint_not_activated`.

## POST /api/agent/document
Report the intake result for an existing Vault document. Use this instead of `ingest.source_documents` for user uploads — ingest keys on `dedupe_key` and would create a second row. Same bearer auth and owner binding. Body (strict, max 200 KB):
```json
{"id":"<source_document uuid>","status":"processed",
 "summary":"Cleaned summary of the document",
 "uncertain_claims":[{"claim":"Holds AWS SAA certification","confidence":40,"source_url":"https://..."}],
 "proposed_actions":[{"title":"Add certificate to Projects evidence","body":"...","priority":60}]}
```
- `status`: `processed` | `action_needed` | `failed`. `summary` ≤ 20,000 chars; ≤ 50 claims (confidence 0–100, `source_url` optional); ≤ 20 actions (`body`, `priority` optional, default 50).
- Updates only that document's `status`, `agent_summary` and `processed_at`. Title, kind, url, storage_path, the original `summary`/content and source metadata are never changed. Preferences are never touched.
- Claims upsert as `uncertain_claims` (`document_id` = the document, status `open`, dedupe `doc:<id>:claim:<md5(lowercased claim)>`); resolved claims are not reopened.
- Actions upsert as `recommendations` (`kind:"action"`, `is_inference:true`, `document_id` set, status `new`, dedupe `doc:<id>:action:<md5(lowercased title)>`); ones the user already acted on are left alone. Nothing is executed.
- Idempotent: resubmitting the same body creates no duplicates; `changed:false` when status and summary are unchanged.

Response `200 {"ok":true,"id":"<uuid>","status":"processed","changed":true,"uncertain_claims":1,"proposed_actions":1}`.
Errors: `400 invalid_json|invalid_payload`, `401 unauthorized`, `404 not_found` (missing, deleted, or not the owner's), `409 agent_owner_not_bound`, `413 payload_too_large`, `422 write_rejected`, `503`.

Intake statuses: `new`, `pending` (user uploads start here and return to it on Reprocess), `processing`, `processed`, `action_needed`, `failed`, `archived`.

## Operational preferences and briefing delivery
- `study_minutes`: integer 30–60 (default 45) — length of each daily study block the Study coach should plan.
- `research_sources`: list of preferred sources (sites/feeds/names) for research workflows; empty = worker defaults.
- `briefing_time` (`HH:MM`, default `07:00`) in `timezone` (always `Asia/Kolkata`). The worker polls preferences and sends the morning briefing when due; the web app never sends anything itself.
- Notification destination status: bot tokens and destinations live only on the worker (Hermes). The app shows "Not configured on Hermes" until the worker reports, on any run, `run.delivery.notification = {"configured":true,"channel":"telegram","destination_label":"Telegram ••1234"}` (label must be a masked, non-secret display string; never send tokens or chat IDs). Send `{"configured":false}` to revert.

## Interview practice loop
- Send an interview item as a recommendation with `"kind":"interview"`; `title` is the exact question, `body` optional guidance.
- On Today the owner can "Attempt / record answer": the app finds (by exact question text) or creates an `interview_questions` row linked via `recommendation_id`, inserts an `interview_practice` row `{question_id, answer, confidence (0–4, self-rated), weaknesses, notes, recommendation_id}`, updates the question (`practice_count`, `last_practiced`, `confidence`, status `Practiced`, or `Strong` at confidence 4), marks the recommendation `done`, and writes feedback `{target_type:"recommendation", action:"done", note:"interview attempt <practice id>"}`. Answers are never auto-graded; confidence is the owner's own rating.
- `GET /api/agent/context` sections now also include:
  - `interview_questions`: `{"id","question","answer","category","difficulty","status","confidence","skill_id","last_practiced","practice_count","recommendation_id","created_at","updated_at"}`
  - `interview_practice`: `{"id","question_id","practiced_at","confidence","answer","weaknesses","notes","recommendation_id","created_at","updated_at"}`

## Outreach responses and person/community sources
- Outreach statuses: `draft → approved → sent_manually → responded` (plus `saved`, `dismissed`). The app never sends anything; `sent_manually` and `responded` are set only by the owner. `responded` is rejected unless the item was already `sent_manually`.
- Owner "Received response" stores `response_received_at` (date, noon IST) and `response_notes`, writes feedback `{target_type:"outreach", action:"done", note:"response received YYYY-MM-DD: …"}`, and, when `contact_id` is set, adds a `network_interactions` row `{kind:"response"}` and updates the contact's `last_interaction`.
- Agent source link for the person/community: send it inside the outreach item's `provenance` as `{"source_url":"https://…","verified_at":"<ISO>"}`; it is stored in `outreach.source_url` / `verified_at` and shown on each card. Without it the app falls back to the linked contact's LinkedIn URL, otherwise shows "No source link".
- `GET /api/agent/context` → `outreach` items now include `source_url, verified_at, sent_at, response_received_at, response_notes`.

---

## Learning manager (Hermes daily AI learning)

Same auth as every `/api/agent/*` route: `Authorization: Bearer <raw token>` verified against the server-only
`AGENT_TOKEN_SHA256` digest (constant time); data is scoped to the bound `agent_owner`. Every response is
`Cache-Control: no-store`. All dates are Asia/Kolkata real calendar dates (`YYYY-MM-DD`; `2026-02-30` is rejected).

Every side effect runs inside one PostgreSQL transaction (serialized per learner with an advisory lock), so retries,
focus-timer saves and Telegram replies cannot race or half-apply. Error bodies are `{ "error": "<code>", "detail": [..] | null }`
and never contain database messages.

Common errors: 401 `unauthorized`, 503 `agent_endpoint_not_activated`, 409 `agent_owner_not_bound`,
429 `rate_limited` (persisted per action and hour across instances: `sync` 6/h, others 120/h), 400 `invalid_request`
(`issues[]`), `invalid_json`, `invalid_idempotency_key`, `idempotency_key_mismatch`, 413 `payload_too_large`
(64 KB, measured on the actual body stream; `Content-Length` is optional and not trusted), 404 `not_found`,
500 `learning_request_failed`.

Idempotency: keys match `[A-Za-z0-9:._-]{8,200}`. Send them in the body field `idempotency_key` **or** the
`Idempotency-Key` header (both present and different → 400 `idempotency_key_mismatch`). A replay with the identical
payload returns the original result with `"replayed": true`; the same key with a different payload → 409
`idempotency_conflict`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/agent/learning/pulse` | Cheap poll: `config_version`, schedule, `due_jobs`, today's runs |
| GET | `/api/agent/learning/context` | Prefs, `due_jobs`, `blocked`, curriculum status, today, carry-over, top-10 candidates, recent assignments/feedback, `week_planned_minutes`, `app_url` |
| GET | `/api/agent/learning/progress` | Context plus per-topic `state` |
| GET | `/api/agent/learning/curriculum?after_sequence=0&limit=100` | Topics (≤200/page) + prerequisites (`basis: sequence_inferred` = inferred from guide order) |
| POST | `/api/agent/learning/sync` | Server fetches + imports the configured guide |
| POST | `/api/agent/learning/run-claim` | Lease a daily job slot |
| POST | `/api/agent/learning/run-finish` | Close the slot with the attempt token |
| POST | `/api/agent/learning/recommendation` | Validated daily plan → one Learn task |
| POST | `/api/agent/learning/check-in` `{}` | Evening: reads real task state first |
| POST | `/api/agent/learning/delivery-begin` | Reserve a Telegram send BEFORE sending |
| POST | `/api/agent/learning/delivery-finish` | Compare-and-set the reservation outcome after sending |
| POST | `/api/agent/learning/command-ack` | Acknowledge a pending Settings test command |
| POST | `/api/agent/learning/delivery-status` | **Removed (410 `deprecated_use_delivery_begin_finish`)** |
| POST | `/api/agent/learning/completion` | Apply a learner reply |

`job` ∈ `curriculum_sync | morning_plan | evening_check`.

### pulse (settings reconfigure the worker automatically)
```json
{ "generated_at": "...", "timezone": "Asia/Kolkata", "ist_date": "2026-10-09",
  "config_version": "<learning_preferences.updated_at>",
  "schedule": { "sync_time": "10:30", "morning_time": "11:00", "evening_time": "20:30", "paused": false },
  "daily_minutes": 90, "weekly_minutes": 600, "baseline_completed": true,
  "due_jobs": [{ "job": "morning_plan", "run_date": "2026-10-09", "catch_up": false }],
  "runs_today": [{ "job": "curriculum_sync", "status": "succeeded", "attempt": 1, "lease_until": null, "finished_at": "..." }] }
```
Run one local Hermes cron job every 5–10 minutes that calls `pulse` and acts only on `due_jobs`. Because due jobs are
computed from the persisted Settings on every call, changing times/pause in the app reconfigures the runtime without
editing cron. A job is due when its IST window is open and its slot is not occupied (occupied = succeeded/skipped,
claimed with a live lease, or 3 attempts used). Failed runs and expired leases become due again (bounded to 3 attempts).

### sync → `POST {}`
```json
{ "outcome": "applied | applied_incomplete | unchanged | incomplete_kept_previous | failed_kept_previous",
  "notice": "Initial limited import ... | null",
  "report": { "title": "", "topic_count": 30, "declared_volumes": [], "parsed_volumes": [], "missing_volumes": [],
              "missing_topics": [], "complete": false, "errors": [], "content_hash": "" },
  "changes": { "added": [], "edited": [], "restored": [], "removed": [], "created_skills": [] } | null }
```
Fetch errors (502): `document_not_accessible`, `document_not_machine_readable`, `document_fetch_failed`,
`document_fetch_timeout`, `redirect_not_allowed`, `too_many_redirects`; 413 `document_too_large`; 400 `url_not_allowed`;
409 `curriculum_changed_concurrently`.

### run-claim
Request `{ "job": "morning_plan", "run_date": "2026-10-09", "catch_up": false, "lease_seconds": 900 }` (60–3600).
201 `{ "claimed": true, "attempt": 1, "attempt_token": "<uuid>", "lease_until": "...", "recovered"?: true }`.
409 `{ "claimed": false, "reason": "already_finished | lease_active | attempts_exhausted", ... }`.
Keep the `attempt_token` in memory for this run only.

### run-finish
Request `{ "job": "morning_plan", "run_date": "2026-10-09", "attempt_token": "<uuid>", "status": "succeeded|failed|skipped", "detail": {} }`.
200 `{ "ok": true, "status": "...", "attempt": 1 }`; 409 `run_not_claimed` when the token is not the current attempt
(e.g. a stale worker whose lease was recovered).

### recommendation
```json
{ "idempotency_key": "hermes:morning:2026-10-09", "assignment_date": "2026-10-09",
  "topic_id": "<curriculum_topics.id from context.carry_over or candidates>",
  "rationale": "Required for FastAPI structured outputs", "practical_outcome": "Working Pydantic example",
  "completion_criteria": "Example validates good and bad input",
  "plan": [{ "step": "Learn type hints", "minutes": 20 }, { "step": "Write validation examples", "minutes": 35 }] }
```
422 `recommendation_rejected` with `detail` list: `topic_not_in_curriculum`, `topic_not_eligible`, `carry_over_required`,
`assignment_exists_for_date`, `invalid_plan`, `exceeds_daily_minutes`, `weekly_budget_exceeded`,
`missing_completion_criteria`, `learning_paused`, `baseline_required`. The transaction re-checks the same rules
(codes returned directly, e.g. 409 `baseline_required`). If neither the request nor the guide supplies a completion
criterion, the server uses a suggested criterion that starts with `Inference (the guide gives no completion criterion)`.
`assignment_date` must be today in IST. A carried-over topic reuses its task. A goal is linked only when the skill's
existing tasks already belong to an active goal. 201/200 → `{ assignment, task_url, replayed }`.

### delivery-status (idempotent)
```json
{ "idempotency_key": "tg:out:2026-10-09:morning", "kind": "morning_plan", "assignment_id": "<uuid>",
  "status": "sent", "chat_ref": "<opaque chat label>", "message_id": "811", "error": "" }
```
`status: sent` requires `chat_ref` + `message_id`. 201 `{ ok, id, replayed: false }`, 200 on replay;
409 `idempotency_conflict` / `message_already_recorded`; 404 `assignment_not_found`. The stored outbound
`(chat_ref, message_id)` is what replies are mapped against. Never send bot tokens or raw secrets.

### completion (Telegram reply)
```json
{ "idempotency_key": "tg:in:<chat_ref>:812", "text": "Done, studied 45 minutes",
  "telegram": { "sender_id": "<numeric Telegram user id>", "chat_ref": "<same opaque label>",
                "message_id": "812", "reply_to_message_id": "811" } }
```
Both checks are required: (1) SHA-256 of `sender_id` equals server-only secret `TELEGRAM_OWNER_ID_SHA256`
(412 `telegram_sender_not_configured`, 403 `telegram_sender_rejected`); (2) `chat_ref` + `reply_to_message_id`
match a stored outbound `sent` message, which decides the assignment (422 `telegram_reply_not_mapped`,
`telegram_assignment_mismatch`). Non-Telegram agent feedback may pass `assignment_id` or `date` instead.

Optional: resolved `kind` (`completed|partial|not_started|reschedule|help|minutes`), `minutes` (1–600),
`minutes_mode` (`total` default = total time on this task including timer minutes already recorded, so only the
difference is added; `additional` = add as stated), `notes`, `new_date`. Ambiguous text → 422 `needs_clarification`
(`detail` = options; nothing written). Other codes: 404 `assignment_not_found`, 409 `task_already_completed`,
`assignment_exists_for_date`, 422 `invalid_reschedule_date`, `reported_total_below_recorded`, `unexpected_minutes`.
Response `{ assignment_id, task_id, kind, reported_minutes, minutes_recorded, status, help, replayed }`.

Time accounting (single ledger): recorded minutes create one `focus_sessions` row and add to `tasks.actual_minutes`.
A `learning_sessions` row mirrors it via `focus_session_id`; mirrors are never summed again (weekly totals read
`focus_sessions` only). The app focus timer uses the same transaction (`learning_record_focus`) with a stable session
UUID, so a retried save adds nothing. No skill readiness score is raised automatically.

### check-in → `{ date, assignment_id, topic, needs_check_in, reason, options }`
Send the Telegram check-in only when `needs_check_in` is true.

### Curriculum import rules
Only `https://docs.google.com/document/d/<id>` links without username/password or custom port. Redirects are
followed manually (max 5): every hop must be https to `docs.google.com` or `*.googleusercontent.com` and is validated
before it is requested. 15 s timeout, 5 MB cap enforced on the streamed bytes, `text/plain` only. Stable topic ID =
the guide's chapter code. The apply step (`learning_apply_curriculum`) is one transaction: a midway failure changes no
topics; the version is marked `applied=true` only after all writes succeed. An incomplete parse is applied only as the
initial limited import (with a notice); once a curriculum is active, later incomplete or failed parses keep it.
Topic `body` keeps the raw chapter text (including code). Prerequisites are `sequence_inferred`.

### Local Hermes runtime steps (not verified by this app)
1. Generate the bearer token locally; set only its SHA-256 hex digest as `AGENT_TOKEN_SHA256`. Store the raw token
   as `CAREER_OS_AGENT_TOKEN` in the worker's private env; never paste it into the app.
2. Sign in as the owner and use Settings → Link agent (binds `agent_owner`).
3. Create a valid Telegram bot token (BotFather), confirm `getMe` returns 200 locally, set the owner's numeric id
   SHA-256 as `TELEGRAM_OWNER_ID_SHA256` (server secret).
4. Create one paused Hermes cron job (e.g. every 10 min) with your learning-manager skill that calls `pulse`, then
   `run-claim` → work → `run-finish`; reserve each send with `delivery-begin` (send only when `send_allowed:true`), then `delivery-finish`; ack `pending_commands` via `command-ack`; forward replies to `completion`.
5. Start the Hermes gateway, unpause the job, and verify one morning message + one reply round trip.


## Learning manager — review 2 additions (migration `0004_learning_timezone_delivery_reservations`)

### Timezone
`learning_preferences.timezone` is any valid IANA zone (default `Asia/Kolkata`). Validated in the app
(`Intl`) and in SQL (trigger `learning_preferences_tz_guard` → `pg_timezone_names`; error `invalid_timezone`).
`pulse`/`context`/`progress` return `timezone`, `local_date` (and deprecated alias `ist_date`) and
`schedule.timezone`. Times (`sync_time`, `morning_time`, `evening_time`) are local wall-clock times in that zone.
Daily slot = one `scheduler_runs` row per (job, local date); leases, 3-attempt limit and daily/weekly budgets
are unchanged. DST: a skipped wall time is due once the clock passes it; a repeated hour cannot run twice.

### Telegram delivery: reserve → send → finish
Never send without a reservation. Never resend a `pending`/`unknown` delivery.

`POST /api/agent/learning/delivery-begin`
```json
{ "idempotency_key": "tg:morning:2026-10-09", "kind": "morning_plan|evening_check|test|help",
  "assignment_id": "<uuid, optional>", "chat_ref": "<optional, ≤80>" }
```
- `201 { "send_allowed": true, "delivery_id": "<uuid>", "reservation_token": "<uuid>", "status": "pending" }` → send now.
- `409 { "send_allowed": false, "delivery_id", "status", "reason" }` → do NOT send. `reason`:
  `reservation_pending` (a previous attempt crashed before finishing — treat as unknown),
  `outcome_unknown_reconcile`, `already_sent`, `previous_attempt_failed` (use a NEW key to deliberately retry),
  `assignment_already_reserved` (another key already holds this assignment+kind).
- Same key with a different kind/assignment → `409 idempotency_conflict`.

`POST /api/agent/learning/delivery-finish`
```json
{ "delivery_id": "<uuid>", "reservation_token": "<uuid>", "status": "sent|failed|unknown",
  "chat_ref": "<required for sent>", "message_id": "<required for sent>", "error": "", "reconcile": false }
```
Transitions (compare-and-set under row lock): `pending → sent|failed|unknown`; `unknown → sent|failed` only with
`"reconcile": true` (operator checked Telegram). Identical replay → `200 { replayed: true }`. Anything else →
`409 delivery_state_conflict`; wrong token → `409 reservation_token_mismatch`; reused (chat_ref, message_id) →
`409 message_already_recorded`. Response: `{ delivery_id, status, replayed, reply_mappable }`. Only `sent` rows
(with chat_ref + message_id) can be matched by `completion.telegram.reply_to_message_id`; the sender digest check
(`TELEGRAM_OWNER_ID_SHA256`) is still required.
`pulse` and `context` list `deliveries_needing_reconciliation` (pending/unknown) for the operator.

### Settings test commands
`ping_learning_manager` and `send_test_telegram` (queued from Settings) are no longer claimed by
`GET /api/agent/commands`; they appear in `pulse.pending_commands` and `context.pending_commands`:
`[{ id, command, workflow, payload, status, created_at }]`.
`POST /api/agent/learning/command-ack` `{ "id": "<uuid>", "status": "completed|failed", "result": {} }` →
`{ id, status, replayed }`; repeated identical ack is a replay; a different final status → `409 command_state_conflict`;
unknown/other-owner id → `404 command_not_found`. A `send_test_telegram` must still use delivery-begin/finish (kind `test`).

### Guide sources
- Shared/editable Doc `https://docs.google.com/document/d/<id>/edit` → txt export (unchanged).
- Published Doc `https://docs.google.com/document/d/e/2PACX-…/pub` → server fetches `/pub` (HTML only, same
  redirect/size/credential checks), strips script/style, converts to text. Its source id is `pub:<id>`, so switching
  between the two URL forms creates a separate curriculum source.
- DOCX fallback (owner signed in only): `POST /api/learning/upload-docx` with the raw file body,
  `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`, bearer session.
  Limits: 10 MB upload (streamed), ≤1000 ZIP entries, `word/document.xml` ≤20 MB measured on actual inflated bytes,
  macro packages rejected, no code execution (regex text extraction). Text goes through the same `parseGuide` and
  `learning_apply_curriculum` transaction on the configured guide's source; incomplete guides keep the active
  version; missing content is never invented. `?dry_run=1` returns a parse summary only. Errors: `unauthorized`,
  `unsupported_type`, `file_too_large`, `not_a_docx`, `corrupt_docx`, `too_many_entries`, `macro_content_rejected`,
  `document_xml_too_large`, plus normal sync errors. Version reports carry `origin: fetch|docx_upload`.

