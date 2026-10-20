# Hermes API coverage

Generated from `src/lib/control/registry.json`. Run `python scripts/generate_career_control_coverage.py` after reviewed schema changes. This file documents permissions, not a successful production deployment.

**58 entities; 43 with permitted writes; 15 read-only.** All new production capabilities: **IMPLEMENTED BUT NOT LIVE TESTED**.

Every entity supports owner-scoped query/search/export. SQL fixture tests read all entities and exercise each permitted business create/update/delete/undo; domain workflows have additional named tests. Registry coverage does not certify every UI or live Telegram journey.

## Operation / UI / intent matrix

| Entity | Owner field | UI / feature | Telegram intent | Permitted operations | Confirmation | Local evidence | Live status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `activity_log` | `user_id` | Dedicated screen or agent/history read | Read/search activity log; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `agent_commands` | `user_id` | Dedicated screen or agent/history read | Read/search agent commands; supported writes below | create, update | all writes | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `agent_notifications` | `user_id` | Dedicated screen or agent/history read | Read/search agent notifications; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `agent_runs` | `user_id` | Dedicated screen or agent/history read | Read/search agent runs; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `audit_events` | `user_id` | Dedicated screen or agent/history read | Read/search audit events; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `career_preferences` | `user_id` | Dedicated screen or agent/history read | Read/search career preferences; supported writes below | create, update, delete, edit_text | all writes | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `companies` | `user_id` | Manage records / dedicated screen | Read/search companies; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `contacts` | `user_id` | Manage records / dedicated screen | Read/search contacts; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `curriculum_prerequisites` | `user_id` | Dedicated screen or agent/history read | Read/search curriculum prerequisites; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `curriculum_sources` | `user_id` | Dedicated screen or agent/history read | Read/search curriculum sources; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `curriculum_topics` | `user_id` | Dedicated screen or agent/history read | Read/search curriculum topics; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `curriculum_versions` | `user_id` | Dedicated screen or agent/history read | Read/search curriculum versions; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `daily_logs` | `user_id` | Manage records / dedicated screen | Read/search daily logs; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `events` | `user_id` | Manage records / dedicated screen | Read/search events; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `evidence` | `user_id` | Manage records / dedicated screen | Read/search evidence; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `feedback` | `user_id` | Dedicated screen or agent/history read | Read/search feedback; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `focus_sessions` | `user_id` | Dedicated screen or agent/history read | Read/search focus sessions; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `followups` | `user_id` | Manage records / dedicated screen | Read/search followups; supported writes below | create, update, delete, edit_text, set_completed | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `goals` | `user_id` | Manage records / dedicated screen | Read/search goals; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `inbox_items` | `user_id` | Manage records / dedicated screen | Read/search inbox items; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `interview_practice` | `user_id` | Manage records / dedicated screen | Read/search interview practice; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `interview_questions` | `user_id` | Manage records / dedicated screen | Read/search interview questions; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `interview_stories` | `user_id` | Manage records / dedicated screen | Read/search interview stories; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `job_applications` | `user_id` | Manage records / dedicated screen | Read/search job applications; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `job_interviews` | `user_id` | Manage records / dedicated screen | Read/search job interviews; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `job_leads` | `user_id` | Manage records / dedicated screen | Read/search job leads; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `job_skill_requirements` | `user_id` | Manage records / dedicated screen | Read/search job skill requirements; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `learning_assignments` | `user_id` | Dedicated screen or agent/history read | Read/search learning assignments; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `learning_baselines` | `user_id` | Dedicated screen or agent/history read | Read/search learning baselines; supported writes below | create, update, delete | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `learning_feedback` | `user_id` | Dedicated screen or agent/history read | Read/search learning feedback; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `learning_preferences` | `user_id` | Dedicated screen or agent/history read | Read/search learning preferences; supported writes below | create, update, delete | all writes | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `learning_sessions` | `user_id` | Dedicated screen or agent/history read | Read/search learning sessions; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `milestones` | `user_id` | Manage records / dedicated screen | Read/search milestones; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `mock_interviews` | `user_id` | Manage records / dedicated screen | Read/search mock interviews; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `network_interactions` | `user_id` | Manage records / dedicated screen | Read/search network interactions; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `notes` | `user_id` | Manage records / dedicated screen | Read/search notes; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `notifications` | `user_id` | Manage records / dedicated screen | Read/search notifications; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `outreach` | `user_id` | Manage records / dedicated screen | Read/search outreach; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `planner_blocks` | `user_id` | Manage records / dedicated screen | Read/search planner blocks; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `profiles` | `id` | Dedicated screen or agent/history read | Read/search profiles; supported writes below | update, edit_text | all writes | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `project_decisions` | `user_id` | Manage records / dedicated screen | Read/search project decisions; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `project_milestones` | `user_id` | Manage records / dedicated screen | Read/search project milestones; supported writes below | create, update, delete, edit_text, set_completed | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `project_tasks` | `user_id` | Manage records / dedicated screen | Read/search project tasks; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `projects` | `user_id` | Manage records / dedicated screen | Read/search projects; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `recommendations` | `user_id` | Dedicated screen or agent/history read | Read/search recommendations; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `resources` | `user_id` | Manage records / dedicated screen | Read/search resources; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `scheduler_runs` | `user_id` | Dedicated screen or agent/history read | Read/search scheduler runs; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `skill_topics` | `user_id` | Manage records / dedicated screen | Read/search skill topics; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `skills` | `user_id` | Manage records / dedicated screen | Read/search skills; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `source_documents` | `user_id` | Dedicated screen or agent/history read | Read/search source documents; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `study_history` | `user_id` | Dedicated screen or agent/history read | Read/search study history; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `study_tasks` | `user_id` | Dedicated screen or agent/history read | Read/search study tasks; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `task_dependencies` | `user_id` | Manage records / dedicated screen | Read/search task dependencies; supported writes below | create, update, delete | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `task_subtasks` | `user_id` | Manage records / dedicated screen | Read/search task subtasks; supported writes below | create, update, delete, edit_text, set_completed | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `tasks` | `user_id` | Manage records / dedicated screen | Read/search tasks; supported writes below | create, update, delete, record_time, edit_text, set_recurrence | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `telegram_message_map` | `user_id` | Dedicated screen or agent/history read | Read/search telegram message map; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `uncertain_claims` | `user_id` | Dedicated screen or agent/history read | Read/search uncertain claims; supported writes below | create, update, delete, edit_text | delete; bulk; substantial text; flagged settings | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |
| `control_dev_requests` | `user_id` | Dedicated screen or agent/history read | Read/search control dev requests; supported writes below | read only / dedicated workflow | dedicated workflow only | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |

## Validation and boundaries

`POST /api/agent/control` uses bearer authentication plus trusted Telegram owner/private-chat/message provenance. Ordinary browser mutations use authenticated `workspace_write` with server-derived `auth.uid()`, durable request identity, expected revision and the same domain executor. Browser restore is separate from Telegram undo; it restores one owned soft-deleted record, and does not replay an entire deleted parent graph. Internal learning rows remain read-only.

Telegram compound writes: 1–50 operations, at most 500 journaled preview effects; list pages 1–200; stable ID tie ordering; message trust 30 minutes; saved list references 24 hours; approvals 10 minutes; attachment 6,000,000 bytes; export 20,000,000 bytes; signed URLs 300 seconds; persisted control quota 240/hour. Explicit task time is 1–600 minutes per control operation.

Dates are actual YYYY-MM-DD calendar dates; timestamps require offsets; settings times are HH:mm; timezone names are validated through Intl/PostgreSQL. Numeric ranges and enums are enforced by protocol plus actual database constraints. URLs permit http/https without userinfo, or authorized `storage:` references for supported private records. Text-edit commands accept append or a unique literal fragment, up to 20,000 characters.

Fields below list **all** registry fields. Only columns explicitly marked editable are accepted as write values. Required means required on create when no server default exists; owner IDs are always server-bound. Read-only fields include provenance, inferred counters, IDs and source metadata. Required owner fields are not caller-supplied.

## `activity_log`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `entity_type` | `text` | False | False | False |  |
| `entity_id` | `uuid` | False | False | False |  |
| `action` | `text` | False | False | False |  |
| `summary` | `text` | False | False | False |  |
| `occurred_at` | `timestamptz` | False | False | False |  |
| `metadata` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `agent_commands`

Owner: `user_id`. Soft delete: True. Operations: create, update.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `command` | `text` | False | True | True | enum: `run_now`, `pause`, `refresh_preferences`, `reprocess_document`, `ping_learning_manager`, `send_test_telegram` |
| `workflow` | `text` | False | False | True | enum: `all`, `orchestrator`, `study_coach`, `project_builder`, `job_hunter`, `networking_advisor`, `interview_coach`, `certification_event_scout`, `vault_intake` |
| `payload` | `jsonb` | False | False | True |  |
| `status` | `text` | False | False | True | enum: `cancelled` |
| `idempotency_key` | `text` | True | False | False |  |
| `claimed_at` | `timestamptz` | True | False | False |  |
| `completed_at` | `timestamptz` | True | False | False |  |
| `result` | `jsonb` | False | False | False |  |
| `source` | `text` | False | False | False |  |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `agent_notifications`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `body` | `text` | False | False | True |  |
| `channel` | `text` | False | False | True | enum: `in_app`, `email`, `telegram`, `other` |
| `delivery_status` | `text` | False | False | True | enum: `pending`, `delivered`, `failed` |
| `delivered_at` | `timestamptz` | True | False | True |  |
| `read_at` | `timestamptz` | True | False | True |  |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False |  |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `agent_runs`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `workflow` | `text` | False | False | False |  |
| `idempotency_key` | `text` | False | False | False |  |
| `status` | `text` | False | False | False | enum: `running`, `succeeded`, `failed`, `skipped` |
| `started_at` | `timestamptz` | False | False | False |  |
| `finished_at` | `timestamptz` | True | False | False |  |
| `next_run_at` | `timestamptz` | True | False | False |  |
| `error` | `text` | False | False | False |  |
| `usage` | `jsonb` | False | False | False |  |
| `delivery` | `jsonb` | False | False | False |  |
| `source` | `text` | False | False | False |  |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `audit_events`

Owner: `user_id`. Soft delete: False. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `actor` | `text` | False | False | False | enum: `user`, `agent`, `system` |
| `action` | `text` | False | False | False |  |
| `entity_type` | `text` | False | False | False |  |
| `entity_id` | `uuid` | True | False | False |  |
| `detail` | `jsonb` | False | False | False |  |
| `source` | `text` | False | False | False |  |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |

## `career_preferences`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `target_roles` | `_text` | False | False | True |  |
| `locations` | `_text` | False | False | True |  |
| `work_types` | `_text` | False | False | True |  |
| `min_salary` | `text` | False | False | True |  |
| `avoid_companies` | `_text` | False | False | True |  |
| `focus_skills` | `_text` | False | False | True |  |
| `briefing_time` | `text` | False | False | True | confirmation required |
| `timezone` | `text` | False | False | True | confirmation required |
| `agent_paused` | `bool` | False | False | True | confirmation required |
| `paused_workflows` | `_text` | False | False | True | confirmation required |
| `notes` | `text` | False | False | True |  |
| `source` | `text` | False | False | False | enum: `user`, `agent` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `study_minutes` | `int4` | False | False | True |  |
| `research_sources` | `_text` | False | False | True | confirmation required |

## `companies`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `name` | `text` | False | True | True |  |
| `website` | `text` | False | False | True |  |
| `industry` | `text` | False | False | True |  |
| `notes` | `text` | False | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |
| `status` | `text` | False | False | True | enum: `tracking`, `target`, `avoid`, `archived` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `contacts`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `name` | `text` | False | True | True |  |
| `company` | `text` | False | False | True |  |
| `role` | `text` | False | False | True |  |
| `linkedin_url` | `text` | False | False | True |  |
| `email` | `text` | False | False | True |  |
| `location` | `text` | False | False | True |  |
| `relationship_stage` | `text` | False | False | True | enum: `New`, `Connected`, `Conversation Started`, `Active`, `Warm`, `Recruiter`, `Mentor`, `Archived` |
| `topics` | `_text` | False | False | True |  |
| `notes` | `text` | False | False | True |  |
| `date_connected` | `date` | True | False | True |  |
| `last_interaction` | `date` | True | False | False |  |
| `next_followup` | `date` | True | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `curriculum_prerequisites`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `topic_id` | `uuid` | False | False | False | owned curriculum_topics |
| `prerequisite_topic_id` | `uuid` | False | False | False | owned curriculum_topics |
| `basis` | `text` | False | False | False | enum: `sequence_inferred`, `guide_explicit`, `manual` |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `curriculum_sources`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `url` | `text` | False | False | False |  |
| `document_id` | `text` | False | False | False |  |
| `title` | `text` | False | False | False |  |
| `status` | `text` | False | False | False | enum: `never_synced`, `ok`, `incomplete`, `failed` |
| `active_version_id` | `uuid` | True | False | False | owned curriculum_versions |
| `last_checked_at` | `timestamptz` | True | False | False |  |
| `last_synced_at` | `timestamptz` | True | False | False |  |
| `last_error` | `text` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `curriculum_topics`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `source_id` | `uuid` | False | False | False | owned curriculum_sources |
| `stable_topic_id` | `text` | False | False | False |  |
| `volume` | `text` | False | False | False |  |
| `volume_title` | `text` | False | False | False |  |
| `title` | `text` | False | False | False |  |
| `description` | `text` | False | False | False |  |
| `parent_topic_id` | `uuid` | True | False | False | owned curriculum_topics |
| `priority` | `text` | False | False | False | enum: `MUST`, `SHOULD`, `OPTIONAL` |
| `priority_source` | `text` | False | False | False | enum: `guide_label`, `inferred` |
| `sequence` | `int4` | False | False | False |  |
| `recommended_minutes` | `int4` | False | False | False |  |
| `practical_exercise` | `text` | False | False | False |  |
| `completion_criteria` | `text` | False | False | False |  |
| `interview_notes` | `text` | False | False | False |  |
| `body` | `text` | False | False | False |  |
| `source_reference` | `text` | False | False | False |  |
| `content_hash` | `text` | False | False | False |  |
| `first_version_id` | `uuid` | True | False | False | owned curriculum_versions |
| `last_version_id` | `uuid` | True | False | False | owned curriculum_versions |
| `skill_id` | `uuid` | True | False | False | owned skills |
| `skill_topic_id` | `uuid` | True | False | False | owned skill_topics |
| `removed_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `curriculum_versions`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `source_id` | `uuid` | False | False | False | owned curriculum_sources |
| `content_hash` | `text` | False | False | False |  |
| `status` | `text` | False | False | False | enum: `validated`, `incomplete`, `failed`, `unchanged` |
| `applied` | `bool` | False | False | False |  |
| `topic_count` | `int4` | False | False | False |  |
| `report` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `daily_logs`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `log_date` | `date` | False | True | True |  |
| `journal` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `events`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `organizer` | `text` | False | False | True |  |
| `starts_at` | `timestamptz` | True | False | True |  |
| `location` | `text` | False | False | True |  |
| `url` | `text` | False | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |
| `summary` | `text` | False | False | True |  |
| `status` | `text` | False | False | True | enum: `suggested`, `saved`, `registered_manually`, `attended`, `dismissed` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `evidence`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `kind` | `text` | False | True | True |  |
| `url` | `text` | False | False | True |  |
| `description` | `text` | False | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `project_id` | `uuid` | True | False | True | owned projects |
| `goal_id` | `uuid` | True | False | True | owned goals |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `feedback`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `target_type` | `text` | False | True | True | enum: `recommendation`, `job_lead`, `study_task`, `project_task`, `outreach`, `event`, `uncertain_claim`, `source_document`, `notification`, `general` |
| `target_id` | `uuid` | True | False | True |  |
| `action` | `text` | False | True | True | enum: `done`, `save`, `dismiss`, `useful`, `not_useful`, `note` |
| `note` | `text` | False | False | True |  |
| `source` | `text` | False | False | False |  |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `focus_sessions`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `task_id` | `uuid` | False | False | False | owned tasks |
| `started_at` | `timestamptz` | False | False | False |  |
| `ended_at` | `timestamptz` | True | False | False |  |
| `duration_minutes` | `int4` | False | False | False |  |
| `note` | `text` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `followups`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text, set_completed.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `contact_id` | `uuid` | False | True | True | owned contacts |
| `due_date` | `date` | False | True | True |  |
| `completed_at` | `timestamptz` | True | False | False |  |
| `note` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `goals`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `description` | `text` | False | False | True |  |
| `goal_type` | `text` | False | False | True | enum: `career`, `quarter`, `monthly` |
| `parent_goal_id` | `uuid` | True | False | True | owned goals |
| `target_date` | `date` | True | False | True |  |
| `status` | `text` | False | False | True | enum: `active`, `completed`, `paused` |
| `reason` | `text` | False | False | True |  |
| `success_criteria` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `inbox_items`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `content` | `text` | False | True | True |  |
| `kind` | `text` | False | False | True | enum: `unprocessed`, `task`, `note`, `resource`, `idea` |
| `archived` | `bool` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `interview_practice`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `question_id` | `uuid` | False | True | True | owned interview_questions |
| `practiced_at` | `timestamptz` | False | False | True |  |
| `confidence` | `int2` | False | False | True |  |
| `notes` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `answer` | `text` | False | False | True |  |
| `weaknesses` | `text` | False | False | True |  |
| `recommendation_id` | `uuid` | True | False | True | owned recommendations |

## `interview_questions`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `question` | `text` | False | True | True |  |
| `answer` | `text` | False | False | True |  |
| `category` | `text` | False | False | True |  |
| `difficulty` | `text` | False | False | True | enum: `Easy`, `Medium`, `Hard` |
| `status` | `text` | False | False | True | enum: `New`, `Learning`, `Practiced`, `Strong` |
| `confidence` | `int2` | False | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `last_practiced` | `date` | True | False | False |  |
| `practice_count` | `int4` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `recommendation_id` | `uuid` | True | False | True | owned recommendations |

## `interview_stories`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `situation` | `text` | False | False | True |  |
| `task` | `text` | False | False | True |  |
| `action` | `text` | False | False | True |  |
| `result` | `text` | False | False | True |  |
| `lessons` | `text` | False | False | True |  |
| `project_id` | `uuid` | True | False | True | owned projects |
| `tags` | `_text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `job_applications`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `company` | `text` | False | True | True |  |
| `role` | `text` | False | True | True |  |
| `location` | `text` | False | False | True |  |
| `work_type` | `text` | False | False | True |  |
| `job_url` | `text` | False | False | True |  |
| `job_description` | `text` | False | False | True |  |
| `salary_range` | `text` | False | False | True |  |
| `date_found` | `date` | True | False | True |  |
| `date_applied` | `date` | True | False | False |  |
| `status` | `text` | False | False | True | enum: `Saved`, `Planning to Apply`, `Applied`, `Recruiter Contact`, `Screening`, `Technical Interview`, `Hiring Manager`, `Final Round`, `Offer`, `Rejected`, `Withdrawn` |
| `recruiter` | `text` | False | False | True |  |
| `recruiter_linkedin` | `text` | False | False | True |  |
| `resume_version` | `text` | False | False | True |  |
| `notes` | `text` | False | False | True |  |
| `followup_date` | `date` | True | False | True |  |
| `priority` | `text` | False | False | True | enum: `low`, `medium`, `high` |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `job_interviews`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `application_id` | `uuid` | False | True | True | owned job_applications |
| `stage` | `text` | False | True | True |  |
| `scheduled_at` | `timestamptz` | True | False | True |  |
| `notes` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `job_leads`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `company_id` | `uuid` | True | False | True | owned companies |
| `company` | `text` | False | True | True |  |
| `title` | `text` | False | True | True |  |
| `location` | `text` | False | False | True |  |
| `work_type` | `text` | False | False | True |  |
| `salary_range` | `text` | False | False | True |  |
| `official_url` | `text` | False | True | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |
| `posted_at` | `timestamptz` | True | False | True |  |
| `summary` | `text` | False | False | True |  |
| `fit_notes` | `text` | False | False | True |  |
| `fit_is_inference` | `bool` | False | False | True |  |
| `application_id` | `uuid` | True | False | True | owned job_applications |
| `status` | `text` | False | False | True | enum: `new`, `verified`, `saved`, `applied`, `dismissed`, `expired` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `job_skill_requirements`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `application_id` | `uuid` | False | True | True | owned job_applications |
| `skill_name` | `text` | False | True | True |  |
| `requirement_type` | `text` | False | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `assessment` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `learning_assignments`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `topic_id` | `uuid` | False | False | False | owned curriculum_topics |
| `task_id` | `uuid` | True | False | False | owned tasks |
| `assignment_date` | `date` | False | False | False |  |
| `status` | `text` | False | False | False | enum: `planned`, `delivered`, `completed`, `partial`, `not_started`, `rescheduled`, `cancelled` |
| `help_requested` | `bool` | False | False | False |  |
| `planned_minutes` | `int4` | False | False | False |  |
| `recorded_minutes` | `int4` | False | False | False |  |
| `plan` | `jsonb` | False | False | False |  |
| `rationale` | `text` | False | False | False |  |
| `practical_outcome` | `text` | False | False | False |  |
| `completion_criteria` | `text` | False | False | False |  |
| `progress_notes` | `text` | False | False | False |  |
| `is_inference` | `bool` | False | False | False |  |
| `source` | `text` | False | False | False | enum: `app`, `agent` |
| `idempotency_key` | `text` | False | False | False |  |
| `completed_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `request_payload` | `jsonb` | True | False | False |  |

## `learning_baselines`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `topic_id` | `uuid` | False | True | True | owned curriculum_topics |
| `level` | `text` | False | True | True | enum: `Not Started`, `Familiar`, `Learning`, `Practiced`, `Applied` |
| `basis` | `text` | False | False | True | enum: `manual` |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `learning_feedback`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `assignment_id` | `uuid` | False | False | False | owned learning_assignments |
| `kind` | `text` | False | False | False | enum: `completed`, `partial`, `not_started`, `reschedule`, `help`, `minutes` |
| `channel` | `text` | False | False | False | enum: `app`, `telegram`, `agent` |
| `raw_text` | `text` | False | False | False |  |
| `minutes` | `int4` | True | False | False |  |
| `notes` | `text` | False | False | False |  |
| `new_date` | `date` | True | False | False |  |
| `idempotency_key` | `text` | False | False | False |  |
| `result` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `request_payload` | `jsonb` | True | False | False |  |

## `learning_preferences`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `guide_url` | `text` | False | False | True | confirmation required |
| `sync_time` | `text` | False | False | True | confirmation required |
| `morning_time` | `text` | False | False | True | confirmation required |
| `evening_time` | `text` | False | False | True | confirmation required |
| `timezone` | `text` | False | False | True | confirmation required |
| `daily_minutes` | `int4` | False | False | True |  |
| `weekly_minutes` | `int4` | False | False | True |  |
| `paused` | `bool` | False | False | True | confirmation required |
| `baseline_completed_at` | `timestamptz` | True | False | False |  |
| `hermes_last_seen_at` | `timestamptz` | True | False | False |  |
| `telegram_status` | `text` | False | False | False | enum: `unknown`, `sent_ok`, `send_failed`, `reply_ok` |
| `telegram_status_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `learning_sessions`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `skill_id` | `uuid` | True | False | False | owned skills |
| `task_id` | `uuid` | True | False | False | owned tasks |
| `minutes` | `int4` | False | False | False |  |
| `learned` | `text` | False | False | False |  |
| `occurred_at` | `timestamptz` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `focus_session_id` | `uuid` | True | False | False | owned focus_sessions |

## `milestones`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `goal_id` | `uuid` | False | True | True | owned goals |
| `title` | `text` | False | True | True |  |
| `due_date` | `date` | True | False | True |  |
| `status` | `text` | False | False | True | enum: `pending`, `in_progress`, `completed` |
| `success_criteria` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `mock_interviews`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `occurred_at` | `timestamptz` | False | False | True |  |
| `feedback` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `network_interactions`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `contact_id` | `uuid` | False | True | True | owned contacts |
| `kind` | `text` | False | True | True |  |
| `occurred_at` | `timestamptz` | False | False | True |  |
| `notes` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `notes`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `content` | `text` | False | False | True |  |
| `entity_type` | `text` | True | False | True |  |
| `entity_id` | `uuid` | True | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `tags` | `_text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `notifications`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `body` | `text` | False | False | True |  |
| `read_at` | `timestamptz` | True | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `outreach`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `contact_id` | `uuid` | True | False | True | owned contacts |
| `recipient` | `text` | False | False | True |  |
| `channel` | `text` | False | False | True | enum: `linkedin`, `email`, `other` |
| `subject` | `text` | False | False | True |  |
| `draft` | `text` | False | False | True |  |
| `reason` | `text` | False | False | True |  |
| `status` | `text` | False | False | True | enum: `draft`, `approved`, `sent_manually`, `responded`, `saved`, `dismissed` |
| `is_inference` | `bool` | False | False | True |  |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `sent_at` | `timestamptz` | True | False | True |  |
| `response_received_at` | `timestamptz` | True | False | True |  |
| `response_notes` | `text` | False | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |

## `planner_blocks`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `task_id` | `uuid` | True | False | True | owned tasks |
| `title` | `text` | False | True | True |  |
| `block_date` | `date` | False | True | True |  |
| `start_time` | `time` | False | True | True |  |
| `end_time` | `time` | False | True | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `profiles`

Owner: `id`. Soft delete: False. Operations: update, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `display_name` | `text` | False | False | True |  |
| `career_target` | `text` | False | False | True |  |
| `weekly_hours` | `int4` | False | False | True |  |
| `onboarded_at` | `timestamptz` | True | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |

## `project_decisions`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `project_id` | `uuid` | False | True | True | owned projects |
| `title` | `text` | False | True | True |  |
| `context` | `text` | False | False | True |  |
| `decision` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `project_milestones`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text, set_completed.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `project_id` | `uuid` | False | True | True | owned projects |
| `title` | `text` | False | True | True |  |
| `due_date` | `date` | True | False | True |  |
| `completed_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `project_tasks`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `project_id` | `uuid` | False | True | True | owned projects |
| `title` | `text` | False | True | True |  |
| `kind` | `text` | False | False | True | enum: `milestone`, `task`, `evidence` |
| `detail` | `text` | False | False | True |  |
| `evidence_url` | `text` | False | False | True |  |
| `due_date` | `date` | True | False | True |  |
| `status` | `text` | False | False | True | enum: `todo`, `doing`, `done`, `saved`, `dismissed` |
| `is_inference` | `bool` | False | False | True |  |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `projects`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `name` | `text` | False | True | True |  |
| `description` | `text` | False | False | True |  |
| `problem` | `text` | False | False | True |  |
| `business_value` | `text` | False | False | True |  |
| `architecture` | `text` | False | False | True |  |
| `technologies` | `_text` | False | False | True |  |
| `github_url` | `text` | False | False | True |  |
| `deployment_url` | `text` | False | False | True |  |
| `status` | `text` | False | False | True | enum: `Idea`, `Planning`, `Building`, `Testing`, `Deployed`, `Archived` |
| `start_date` | `date` | True | False | True |  |
| `target_date` | `date` | True | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `recommendations`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `kind` | `text` | False | False | True | enum: `top_priority`, `briefing`, `action`, `insight`, `interview` |
| `title` | `text` | False | True | True |  |
| `body` | `text` | False | False | True |  |
| `priority` | `int2` | False | False | True |  |
| `briefing_date` | `date` | True | False | True |  |
| `is_inference` | `bool` | False | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |
| `status` | `text` | False | False | True | enum: `new`, `done`, `saved`, `dismissed` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `document_id` | `uuid` | True | False | True | owned source_documents |

## `resources`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `url` | `text` | False | False | True |  |
| `source_type` | `text` | False | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `project_id` | `uuid` | True | False | True | owned projects |
| `status` | `text` | False | False | True | enum: `Inbox`, `To Review`, `Learning`, `Completed`, `Archived` |
| `priority` | `text` | False | False | True | enum: `low`, `medium`, `high` |
| `notes` | `text` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `scheduler_runs`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `job` | `text` | False | False | False | enum: `curriculum_sync`, `morning_plan`, `evening_check` |
| `run_date` | `date` | False | False | False |  |
| `status` | `text` | False | False | False | enum: `claimed`, `succeeded`, `failed`, `skipped` |
| `catch_up` | `bool` | False | False | False |  |
| `detail` | `jsonb` | False | False | False |  |
| `started_at` | `timestamptz` | False | False | False |  |
| `finished_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `lease_until` | `timestamptz` | True | False | False |  |
| `attempt` | `int4` | False | False | False |  |
| `attempt_token` | `uuid` | True | False | False |  |

## `skill_topics`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `skill_id` | `uuid` | False | True | True | owned skills |
| `parent_topic_id` | `uuid` | True | False | True | owned skill_topics |
| `title` | `text` | False | True | True |  |
| `status` | `text` | False | False | True | enum: `Not Started`, `Learning`, `Practicing`, `Applied`, `Interview Ready` |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `skills`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `name` | `text` | False | True | True |  |
| `status` | `text` | False | False | True | enum: `Not Started`, `Learning`, `Practicing`, `Applied`, `Interview Ready` |
| `category` | `text` | False | False | True |  |
| `knowledge` | `int2` | False | False | True |  |
| `hands_on` | `int2` | False | False | True |  |
| `project_proof` | `int2` | False | False | True |  |
| `production` | `int2` | False | False | True |  |
| `interview` | `int2` | False | False | True |  |
| `last_activity` | `date` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `source_documents`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `kind` | `text` | False | False | True | enum: `resume`, `job_description`, `certificate`, `article`, `note`, `transcript`, `other` |
| `url` | `text` | False | False | True |  |
| `storage_path` | `text` | False | False | False |  |
| `summary` | `text` | False | False | True |  |
| `status` | `text` | False | False | True | enum: `new`, `pending`, `processing`, `processed`, `action_needed`, `failed`, `archived` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `agent_summary` | `text` | False | False | True |  |
| `processed_at` | `timestamptz` | True | False | True |  |

## `study_history`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `study_task_id` | `uuid` | True | False | False | owned study_tasks |
| `skill_id` | `uuid` | True | False | False | owned skills |
| `minutes` | `int4` | False | False | False |  |
| `notes` | `text` | False | False | False |  |
| `occurred_at` | `timestamptz` | False | False | False |  |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `study_tasks`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `detail` | `text` | False | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `resource_url` | `text` | False | False | True |  |
| `estimated_minutes` | `int4` | False | False | True |  |
| `due_date` | `date` | True | False | True |  |
| `priority` | `text` | False | False | True | enum: `low`, `medium`, `high` |
| `status` | `text` | False | False | True | enum: `queued`, `in_progress`, `done`, `saved`, `dismissed` |
| `is_inference` | `bool` | False | False | True |  |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `consolidated_task_id` | `uuid` | True | False | False | owned tasks |

## `task_dependencies`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `task_id` | `uuid` | False | True | True | owned tasks |
| `depends_on_id` | `uuid` | False | True | True | owned tasks |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `task_subtasks`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text, set_completed.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `task_id` | `uuid` | False | True | True | owned tasks |
| `title` | `text` | False | True | True |  |
| `completed_at` | `timestamptz` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `tasks`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, record_time, edit_text, set_recurrence.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `title` | `text` | False | True | True |  |
| `description` | `text` | False | False | True |  |
| `type` | `text` | False | False | True | enum: `Learn`, `Build`, `Practice`, `Interview`, `Network`, `Apply`, `Research`, `Document`, `Admin` |
| `status` | `text` | False | False | True | enum: `backlog`, `month`, `week`, `today`, `doing`, `completed` |
| `priority` | `text` | False | False | True | enum: `low`, `medium`, `high` |
| `estimated_minutes` | `int4` | False | False | True |  |
| `actual_minutes` | `int4` | False | False | False |  |
| `due_date` | `date` | True | False | True |  |
| `scheduled_date` | `date` | True | False | True |  |
| `scheduled_start` | `time` | True | False | True |  |
| `scheduled_end` | `time` | True | False | True |  |
| `skill_id` | `uuid` | True | False | True | owned skills |
| `project_id` | `uuid` | True | False | True | owned projects |
| `goal_id` | `uuid` | True | False | True | owned goals |
| `milestone_id` | `uuid` | True | False | True | owned milestones |
| `application_id` | `uuid` | True | False | True | owned job_applications |
| `contact_id` | `uuid` | True | False | True | owned contacts |
| `completed_at` | `timestamptz` | True | False | False |  |
| `sort_order` | `int4` | False | False | True |  |
| `tags` | `_text` | False | False | True |  |
| `recurrence` | `text` | True | False | False |  |
| `evidence_required` | `bool` | False | False | True |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `skill_topic_id` | `uuid` | True | False | True | owned skill_topics |
| `repeat_child_id` | `uuid` | True | False | False | owned tasks |

## `telegram_message_map`

Owner: `user_id`. Soft delete: True. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `assignment_id` | `uuid` | True | False | False | owned learning_assignments |
| `kind` | `text` | False | False | False | enum: `morning_plan`, `evening_check`, `test`, `reply`, `help` |
| `direction` | `text` | False | False | False | enum: `outbound`, `inbound` |
| `chat_ref` | `text` | False | False | False |  |
| `message_id` | `text` | False | False | False |  |
| `delivery_status` | `text` | False | False | False | enum: `pending`, `sent`, `failed`, `unknown`, `received` |
| `error` | `text` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |
| `idempotency_key` | `text` | True | False | False |  |
| `reply_to_message_id` | `text` | False | False | False |  |
| `reservation_token` | `uuid` | True | False | False |  |
| `reserved_at` | `timestamptz` | True | False | False |  |
| `finished_at` | `timestamptz` | True | False | False |  |
| `reconciled` | `bool` | False | False | False |  |

## `uncertain_claims`

Owner: `user_id`. Soft delete: True. Operations: create, update, delete, edit_text.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `claim` | `text` | False | True | True |  |
| `context` | `text` | False | False | True |  |
| `source_url` | `text` | False | False | True |  |
| `verified_at` | `timestamptz` | True | False | True |  |
| `confidence` | `int2` | False | False | True |  |
| `document_id` | `uuid` | True | False | True | owned source_documents |
| `status` | `text` | False | False | True | enum: `open`, `confirmed`, `rejected`, `dismissed` |
| `dedupe_key` | `text` | True | False | False |  |
| `run_id` | `uuid` | True | False | False | owned agent_runs |
| `source` | `text` | False | False | False | enum: `user`, `agent`, `import` |
| `provenance` | `jsonb` | False | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
| `deleted_at` | `timestamptz` | True | False | False |  |

## `control_dev_requests`

Owner: `user_id`. Soft delete: False. Operations: read-only; use dedicated workflow.

| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | False | False | False |  |
| `user_id` | `uuid` | False | False | False |  |
| `request` | `text` | False | False | False |  |
| `status` | `text` | False | False | False |  |
| `branch` | `text` | True | False | False |  |
| `review_url` | `text` | True | False | False |  |
| `verification` | `jsonb` | True | False | False |  |
| `created_at` | `timestamptz` | False | False | False |  |
| `updated_at` | `timestamptz` | False | False | False |  |
