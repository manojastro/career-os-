# Hermes Career OS commands and tools

Natural language is primary. Entity and field names come from `career_catalog`, not guesses. Tool arguments cannot override sender/chat/message identity. Actual tool schemas are in `scripts/hermes-career-control/__init__.py`.

| Tool | Purpose | Example owner intent |
| --- | --- | --- |
| `career_catalog` | Supported entities, fields, enums, policy | What can you edit? |
| `career_context` | Persisted selection and operating context | Which project are we discussing? |
| `career_query` | One entity; typed filters, sort, offset | List all active applications, newest first |
| `career_search` | Search supported entities | Find everything about FastAPI |
| `career_resolve` | Resolve a name, selected ID or displayed ordinal | Open the second milestone |
| `career_execute` | Permitted transactional creates/updates/deletes/text edits/time | Create a project and its tasks |
| `career_learning` | Existing completion/partial/reschedule/help feedback | I spent 45 minutes on this assignment |
| `career_learning_manage` | Status, plan, confirmed guide sync/baseline finish | Show today's learning assignment |
| `career_report` | Real date-bounded operational summaries | Summarize this week's recorded work |
| `career_export` | Owner JSON, entity CSV, supported project scope | Export this project's supported records |
| `career_upload` | Trusted incoming attachment index | Save this attached PDF as a resource |
| `career_download` | Owned private record download | Download my saved certificate |
| `career_history` | Actual mutations and request keys | Show today's changes |
| `career_undo` | Prepare confirmation-bound restoration | Undo the change with this request key |
| `career_development_request` | Persist a pending code/UI request | Request a new dashboard filter |

Examples: tasks use `high` / `completed`; project status can be `Building`; application status can be `Applied`. Full enums are in the [coverage matrix](HERMES-API-COVERAGE.md). Application stages are not interchangeable with task stages.

An atomic operation looks like `{"entity":"projects","action":"create","ref":"p","values":{"name":"AI Evaluation Platform"}}`; a later task may use `"project_id":"$p"`. A later time operation can use `"id":"$task"` for an actual new task alias. At most 50 operations per transaction. Never claim all larger batches completed after one succeeds.

Text edits use `action: edit_text`, values `field`, `mode: append|replace_fragment`, `text`, and `find` for replacement. Replacement must match exactly once. Known task work uses `record_time` with explicit `minutes`, optional `complete` and offset-aware `ended_at`. Learning assignments use the dedicated learning tool so mirrored ledger minutes are not recorded twice.

Subtasks, project milestones and followups use `action: set_completed` with `values: {completed: true|false}`. The server sets or clears the real completion timestamp; the model cannot supply a fabricated date.

Tasks use `action: set_recurrence`, `values: {cadence: "daily"|"weekly"|"monthly"|null}`. This always requires Telegram confirmation. Only versioned owner opt-in enables a single successor on completion; legacy strings do not activate. The successor has zero actual minutes and no completion or mastery. Dates advance from the later of the task's schedule/due date and the owner timezone's current date; monthly dates clamp to month end. Already-created successors retain their own settings. No background or learning job is enabled.

Query supports `eq`, `ne`, `gte`, `lte`, `contains`, `is_null` where accepted by the SQL filter contract; check the actual catalog/schema before constructing an operator. Use each response's `next_offset` and `first_ordinal`. Saved references expire after 24 hours and are revalidated against owned active records. Multiple matching names require clarification.

`confirm <UUID>` is an exact human response handled outside model inference. It is not a general model-accessible command for bypassing approvals. All new tools remain **IMPLEMENTED BUT NOT LIVE TESTED** until approved activation and real owner verification.

Learning feedback must match the actual owner text. Reply directly to a delivered assignment, or resolve an explicit assignment first. For example, `Completed it in 45 minutes` records 45 minutes; `done` supplies no duration. An ambiguous message is not permission to invent completion.
