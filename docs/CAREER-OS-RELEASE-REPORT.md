# Career OS release report — 20 October 2026

## A. Executive summary

**READY FOR REVIEW. Production is NOT READY for an unverified rollout.**

The existing TanStack/Lovable application was repaired in place. Work covers canonical task/Planner completion and scheduling, Focus recovery and time accounting, missing record lifecycle controls, note conflict recovery, demo Copilot behavior, application stages, responsive/accessibility defects, authenticated AI budgets and the new owner-scoped Telegram control system. Existing architecture and owner data were preserved. Dependency advisories found during verification were patched.

No production migration, publication, plugin activation, real automation activation, outreach, job submission or account-recovery email was performed. Unsupported product workflows remain explicitly listed below.

## B. Issue resolution matrix

The [complete repair matrix](CAREER-OS-FUNCTIONAL-REPAIR-REPORT.md#resolution-matrix--current-review-source) records every earlier finding F1–F16, T1, G1–G5, D1, L1 and S1, plus the new dependency finding S2. It includes root causes, modified modules, regression evidence and current status. Its initial table is historical; its resolution table is authoritative for this release source.

All locally actionable critical/high-priority findings investigated in this task have a repair and passing local evidence. Real host recovery, real learning activation and deployed integration verification remain BLOCKED. No live production guarantee is inferred from fixtures.

## C. Application health

| Module | Current local capability / verification | Status |
| --- | --- | --- |
| Dashboard / Today / Daily Log | Real ledger totals retain completed-task time; complete application stages; owner-calendar date rules | IMPLEMENTED BUT NOT LIVE TESTED |
| Goals / milestones | Create/edit/complete/delete/restore; completed goals accessible; shared real progress calculation | IMPLEMENTED BUT NOT LIVE TESTED |
| Tasks / subtasks / dependencies | Typed owned links, complete/reopen timestamps, prerequisite/evidence checks, opt-in completion-based recurrence, no invented time | IMPLEMENTED BUT NOT LIVE TESTED |
| Planner | Arbitrary times, linked task/block synchronization, block edit/delete, true month boundaries/navigation | IMPLEMENTED BUT NOT LIVE TESTED |
| Focus | Running/paused reload, elapsed clock anchors, stable pending save identity, exactly-once canonical ledger | IMPLEMENTED BUT NOT LIVE TESTED |
| Skills / evidence | Manual ratings, normalized future identities, existing variant data preserved, real linked evidence requirements | IMPLEMENTED BUT NOT LIVE TESTED |
| Projects / decisions / project milestones | General editing and owned links; canonical task progress; safe deletion/undo | IMPLEMENTED BUT NOT LIVE TESTED |
| Jobs / applications / companies | Full stage catalog, actual Kanban updates and keyboard-select alternative; no external submission | IMPLEMENTED BUT NOT LIVE TESTED |
| Networking / contacts / interactions / followups | General editing and completion setters, interaction-derived contact dates; no external sending | IMPLEMENTED BUT NOT LIVE TESTED |
| Interviews / practice | Practice relinking/deletion recomputes both affected parents; persisted edits | IMPLEMENTED BUT NOT LIVE TESTED |
| Notes / resources / library | Exact-record navigation, optimistic save conflicts, owner/note-scoped tab recovery drafts, private short-lived links | IMPLEMENTED BUT NOT LIVE TESTED |
| Copilot | Explicit demo rules, validated priority/actual references, canonical time saves, authenticated quota/body/output controls | IMPLEMENTED BUT NOT LIVE TESTED |
| Settings / login / recovery | Affected-row checks, profile preservation, IANA learning timezone, recovery/reset UI | IMPLEMENTED BUT NOT LIVE TESTED |
| Reports / exports | Complete stable pagination, canonical/non-mirror accounting, supported JSON/CSV/project exports; not a backup restore system | IMPLEMENTED BUT NOT LIVE TESTED |
| Responsive / dialogs / search | 84 route/viewport checks, modal Tab/Escape/focus lifecycle, actual selected record opens | IMPLEMENTED BUT NOT LIVE TESTED |
| Actual host reboot/crash recovery and assistive-technology audit | Not established by local tests or gateway health | BLOCKED |

## D. Telegram integration health

The review source contains all **15 tools** and **two gateway hooks**. The field matrix documents **58 entities, 43 with permitted writes, 15 read-only, 786 fields**, including owned relationships, enum values, protected fields and confirmation requirements.

| Tools | Local evidence / scope | Status |
| --- | --- | --- |
| career_catalog, career_context | Typed registry, current actual context and protected identity | IMPLEMENTED BUT NOT LIVE TESTED |
| career_query, career_search, career_resolve | Complete stable pages, bounded parallel reads, stored per-module ordinals, ambiguity handling | IMPLEMENTED BUT NOT LIVE TESTED |
| career_execute | Owned transactional writes, aliases, atomic activity, idempotent receipts, actual returned rows | IMPLEMENTED BUT NOT LIVE TESTED |
| career_learning, career_learning_manage | Existing learning RPCs; genuine raw outcome/minutes; actual reply mapping; confirmed guide/baseline workflows | IMPLEMENTED BUT NOT LIVE TESTED |
| career_report, career_export | Real date ranges and persisted records; safe CSV; expiring private export links | IMPLEMENTED BUT NOT LIVE TESTED |
| career_upload, career_download | Trusted ingress attachment index, private owner paths, MIME/signature and size checks, 300-second links | IMPLEMENTED BUT NOT LIVE TESTED |
| career_history, career_undo | Durable actual changes; preview/confirmation and conflict-aware restoration | IMPLEMENTED BUT NOT LIVE TESTED |
| career_development_request | Persists a pending request; no autonomous coding or publishing executor | IMPLEMENTED BUT NOT LIVE TESTED |

The existing bot getMe and old authenticated API return HTTP 200. The new route still returns HTTP 406 and its schema is absent. The plugin is not activated. All 25 actual live owner scenarios are therefore BLOCKED. See [test procedures](HERMES-END-TO-END-TESTS.md), [commands](HERMES-ALL-COMMANDS.md), [permissions](HERMES-OWNER-PERMISSIONS.md) and [field coverage](HERMES-API-COVERAGE.md).

## E. Learning automation health

- Production has 30 active topic rows. Complete guide coverage was not re-certified; missing content was not invented.
- Genuine owner baseline: unconfirmed. No ratings or completed learning were fabricated.
- Existing Hermes job `46a628bb9ae9`: disabled; schedule preserved. The separate database preference being unpaused does not mean the gateway job is enabled.
- Hermes provider/default remain OpenRouter / `meta/muse-spark-1.3-contributor`. App Copilot provider remains separate and unchanged.
- Local synthetic fixture verifies assignment → reserve-before-send → CAS delivery receipt → mapped actual-reply metadata → completion → one canonical focus ledger and one excluded mirror. Retry adds no second duration; wrong reply mapping is rejected. The entire fixture rolls back.
- A general learning command uses agent provenance and requires an explicit assignment reference or owner-stated date. Actual Telegram replies must resolve uniquely to an owned sent lesson. Suggested outcome/minutes must agree with raw owner text.
- Evidence-required learning tasks still require actual linked evidence. The bot cannot manufacture it from a completion claim.
- Real daily generation/delivery/reply/progress and restart recovery remain BLOCKED until genuine baseline review, approved disposable tests and separate learning activation approval.

## F. Security review

Implemented boundaries include constant-time bearer verification, server-bound owner/private transport identity, captured real reply metadata, reviewed field/enum allowlists, same-owner links, SQL transactions, expected revisions, explicit approvals, replay receipts and conflict-aware undo. Anonymous/service roles cannot use the authenticated website facade; browser sessions cannot execute privileged control functions. Telegram tool isolation denies terminal/files/cron/provider tools outside the fifteen reviewed API tools.

Attachments are bounded/private with short-lived links; CSV formula-like values are emitted as literals. AI requests have persistent per-user budgets and bounded I/O. Targeted dependency repairs passed a clean frozen install and Bun audit returned no advisories. [Security details and advisory links](HERMES-SECURITY.md) include remaining limits.

Unresolved production risks: no isolated two-user hosted test, no verified production backup restoration, no live private attachment round trip, no complete host crash/reboot test, no independent security clearance. Historical credential exposure exists; Telegram token rotation remains unverified. Use secure provider settings for any needed rotation, never chat or Git.

Note/title recovery copies contain private career text in tab-scoped sessionStorage. They are local recovery copies, not encrypted backup or full offline synchronization. The basic source scan found no matching credential/private-key paths or tracked .env files; it is not a claim of exhaustive secret detection.

## G. Test results

| Actual command / check | Result |
| --- | --- |
| Bun 1.4.3 install --frozen-lockfile --ignore-scripts, clean node_modules | VERIFIED WORKING — 522 packages installed |
| node node_modules/typescript/bin/tsc --noEmit | VERIFIED WORKING — exit 0 |
| node node_modules/vitest/vitest.mjs run | VERIFIED WORKING — 18 files, 131 tests |
| Existing Hermes venv Python scripts/test_hermes_career_control.py | VERIFIED WORKING — 11 tests |
| node node_modules/vite/bin/vite.js build | VERIFIED WORKING — client, SSR and Nitro output, exit 0 |
| Bun 1.4.3 audit --json | VERIFIED WORKING — no advisories reported |
| node scripts/test_career_control_browser.mjs | VERIFIED WORKING — 19 checks, no page errors |
| node scripts/test_career_control_browser_hosted.mjs | VERIFIED WORKING — 7 checks, expected stale rejection, no page errors |
| node scripts/test_career_lifecycle_browser.mjs | VERIFIED WORKING — 8 scenarios, no page errors |
| node scripts/test_career_repairs_browser.mjs | VERIFIED WORKING — 11 groups, including 84 route/viewport combinations, no page errors |
| Targeted ESLint, 62 TS/config files | VERIFIED WORKING for zero introduced violations; 4 inherited explicit-any errors and 16 inherited Fast Refresh warnings remain |
| Four new browser-script ESLint and syntax checks | VERIFIED WORKING — no findings |
| Real PostgreSQL migration rehearsal | VERIFIED WORKING — whole migration rollback, commit, existing IDs/ratings preserved |
| Basic tracked/new-file secret scan | VERIFIED WORKING within its documented pattern scope; no matching paths |
| Default installer read-only dry run | VERIFIED WORKING — preserved provider/model/disabled schedule; production control preflight false, no install |
| All 25 actual live Telegram scenarios and two-user hosted tests | BLOCKED |

Earlier failures were retained during investigation and repaired/rerun. One Windows npx tsc invocation selected an unrelated npm package; the actual installed compiler was subsequently run directly. The first cold browser run timed out while Vite scanned a retained test dependency backup; source-scoped optimizer entries and an ignored test-artifact watcher fixed startup before the passing rerun. A formatter file-open error was retried successfully. None of these failed attempts is counted as a passing result.

Artifacts are local and ignored under test-artifacts. They contain synthetic fixtures, not real career data. Automatic approval review rejected deletion of the temporary dependency backup; it remains ignored and is excluded from tests and Vite scanning. Existing build warnings include the large Workspace bundle and plugin timing/path-resolution notice. Whole-repository lint is not claimed to pass.

## H. GitHub status

Review branch: `codex/full-telegram-control`. PR base: `codex/lovable-learning-manager`. Do not target the unrelated Next.js main branch.

Application source commit: `105e05ed638fe4b357a2c3e62b878999097dd740`; initial control implementation commit: `2a161ee`. Final documentation commits and remote/PR outcome are appended after successful delivery. A Git push does not prove Lovable publication.

## I. Deployment readiness

**No production deployment has occurred.** Existing Lovable editor revision remains `4473f3723dc547bd6c15708948257f0e13c033a7` from 9 October. New control schema/route/plugin are not active.

Migration 0005 SHA-256 of the Git blob with LF line endings: `7311e04ffc935595d8c7642a594cc30f6d9f4c98ff5626e36663027836e5c602`. Normalize only line endings before comparing an extracted Windows file; do not edit SQL contents. The exact final branch/commit must be reviewed before execution.

Use the [deployment runbook](CAREER-OS-DEPLOYMENT-RUNBOOK.md) and [rollback plan](CAREER-OS-ROLLBACK-PLAN.md). Bun 1.4.3 / lock format 3 must be supported by the actual Lovable build mechanism. Source transfer/branch connection and provider backup restoration still require verification. The local migration rollback rehearsal is not a production backup.

## J. Blockers and owner actions

1. Establish the existing Lovable project's exact source-transfer/branch connection and compatible Bun build runtime. Do not switch it to this repository's unrelated Next.js main branch.
2. Provide/verify a recoverable production database plus storage backup and isolated restoration target. An export alone is insufficient.
3. Review the final commit and explicitly approve the concrete scope: migration 0005, existing-app publication, reviewed Hermes plugin installation/toolset restriction/gateway restart, and disposable live verification. The user's specification explicitly requires this approval.
4. Provide an isolated account/environment or owner-assisted disposable record scope, including a second account for actual cross-user denial tests. No password should be pasted into chat.
5. Confirm a genuine learning baseline and guide completeness where needed, then separately approve learning activation only after a real assignment/delivery/reply/progress loop passes. The existing job stays disabled until then.
6. Confirm secure Telegram token rotation if the earlier exposed token is still in use. No additional key is needed for local tests.

Not implemented product boundaries: full offline sync, JSON/database/binary backup restoration UI, guaranteed external followup delivery, automatic job submission/outreach, background task recurrence execution and an autonomous coding/deployment bridge. Supported recurrence is owner-opted-in and completion-based. Dates, drafts and queued requests are not evidence of external execution.

## K. Final verdict

**READY FOR REVIEW.** The local engineering package has passing tests, types, build, dependency audit, browser regressions and a documented lint baseline. Production remains NOT READY until reviewed source, backup/runtime prerequisites, explicit approval and actual live verification satisfy the rollout gates. This report does not approve or perform deployment.
