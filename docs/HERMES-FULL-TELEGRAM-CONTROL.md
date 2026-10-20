# Career OS full Telegram control

## Status and architecture

New controls are **IMPLEMENTED BUT NOT LIVE TESTED**. The existing Lovable app, owner binding, agent API and Windows Hermes profile remain the deployment target. The plugin is not installed; migration 0005 is not applied to production. Review [production readiness](CAREER-OS-PRODUCTION-READINESS.md) for current evidence.

Flow: actual owner Telegram message → Hermes trusted ingress hook → bearer-protected `/api/agent/control` → bound owner + private sender/message validation → reviewed registry and transactional SQL → actual returned record/receipt → Telegram response. Website changes use authenticated `workspace_write`; both paths share ownership/domain rules and durable history. Realtime changes plus a visible-page revision poll refresh the website. Subsequent Telegram reads query persisted state.

## Using the interface after approved activation

Use ordinary language: “Show my active projects”, “Find tasks mentioning evaluation”, “Create a project called AI Evaluation Platform”, “Add five tasks and three milestones to that project”, “Change the second milestone deadline to 2026-11-15”, “Show everything changed today”. Examples are intents, not a claim these have already run live. The model must query the catalog and real records, use exact enum values, resolve ambiguous references, and paginate when asked for all records.

Supported domain records include tasks/planner, goals/milestones, skills, projects/decisions/evidence, contacts/interactions/followups/drafts, applications/interviews/practice, notes/resources/documents and permitted preferences. See the generated [field and enum matrix](HERMES-API-COVERAGE.md). Not every entity is writable or deletable.

## Writes, confirmation and retries

A single low-risk supported write can commit immediately. Deletes, compound/bulk commands, settings changes and substantial text replacement produce a preview. Reply with the exact `confirm <approval UUID>` supplied by the server. The trusted raw incoming message, not model text or document contents, must carry confirmation. Approvals expire after ten minutes and cannot be reused after consumption or changed data.

Transactions return actual records and an audit request key. “Queued” means queued, not executed. On an uncertain timeout, retry the same request identity; never manufacture a compensating create. The gateway suppresses repeated Telegram transport message IDs across restarts. Use saved request keys for confirmed undo; intervening changes cause a conflict instead of overwriting newer work.

## Files and scope

Uploads accept only files downloaded by the trusted Telegram adapter for that actual message. Allowed types: PDF, DOCX, PNG, JPEG, plain text and CSV, maximum 6 MB. Store objects privately under the owner prefix. Links expire after 300 seconds. Upload does not imply parsing or processing succeeded. Exports contain supported database records and links, not binary storage backups or a restore system; project exports cover the implemented direct associations, not every possible transitive record.

No external outreach, application submission, shell/SQL access, credential/model changes, unrestricted development or automatic deployments are enabled. Development requests persist as pending; a coding bridge is not configured. Real baseline review, complete learning-loop verification and separate approval are required before scheduling learning.

## Installation

Follow [deployment runbook](CAREER-OS-DEPLOYMENT-RUNBOOK.md), including backup/recovery gates. `scripts/install_career_control.py` defaults to a read-only dry run; never run apply before approval and a deployed handler. Preserve OpenRouter, Muse Contributor and disabled job `46a628bb9ae9`.
