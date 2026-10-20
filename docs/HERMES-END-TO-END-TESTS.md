# Telegram control end-to-end verification

## Scope and execution

Production scenarios below are **BLOCKED** until approved deployment/plugin activation and an owner-assisted disposable test scope or isolated account exist. Local simulations are not successful live Telegram tests. Never use real career records for destructive tests, invent feedback, send external outreach, or enable the learning job as a test shortcut.

Local commands (run from this TanStack worktree):

```text
bun run test
node node_modules/typescript/bin/tsc --noEmit
bun run build
<Hermes venv python> scripts/test_hermes_career_control.py
node scripts/test_career_control_browser.mjs
node scripts/test_career_control_browser_hosted.mjs
node scripts/test_career_repairs_browser.mjs
node scripts/test_career_lifecycle_browser.mjs
```

Browser scripts accept only a localhost origin. Start Vite on port 4175 with dummy Supabase settings for fixture tests; never supply a production session to them. Windows browser tests use installed Edge via Playwright. The hosted simulation intercepts the dummy Supabase origin and uses a synthetic session. Artifacts go to ignored `test-artifacts/`; keep only nonprivate summarized evidence in the PR.

## Preconditions for live testing

Reviewed commit and migration installed, expected revision stamped, existing bot/plugin loaded, scheduler disabled, protected credentials configured, genuine owner authorization, explicit disposable record prefix, cleanup plan and no real external contacts. For cross-owner tests use a second isolated account. Record actual message IDs/record IDs privately, not in a public PR.

| # | Scenario | Actions / expected result | Local evidence / result | Live actual result |
| --- | --- | --- | --- | --- |
| 1 | Owner access | Actual private owner message reads owned data | Plugin provenance + service boundary fixtures: VERIFIED WORKING | BLOCKED |
| 2 | Unauthorized access | Other sender/group/internal/bot denied; no DB write | Plugin and protocol fixtures: VERIFIED WORKING | BLOCKED |
| 3 | Search/pagination | Seed >200 records, traverse next_offset; stable order | PostgreSQL 205-row test and query tests: VERIFIED WORKING | BLOCKED |
| 4 | Create task | Create prefixed task; read returned row then reload UI | PostgreSQL create plus browser create: VERIFIED WORKING locally | BLOCKED |
| 5 | Update task | Edit real ID, verify actual returned enum/fields | PostgreSQL mutations and browser editor fixtures | BLOCKED |
| 6 | Complete task | Timestamp set; dependencies/evidence obeyed | Task invariant SQL/browser unit tests | BLOCKED |
| 7 | Confirm delete | Preview, exact confirm, active row removed | SQL preview/confirmation tests | BLOCKED |
| 8 | References | Display numbered page then edit second actual ID | Query saved-list/ordinal fixtures | BLOCKED |
| 9 | Ambiguity | Same-name matches require clarification | Query and local Copilot ambiguity fixtures | BLOCKED |
| 10 | Compound success | Project + linked tasks/milestones persist atomically | SQL generated-alias and bulk tests | BLOCKED |
| 11 | Compound rollback | Invalid FK in later operation leaves no partial rows | Real PostgreSQL rollback tests | BLOCKED |
| 12 | Replay | Redeliver same transport ID and request; one mutation | Persistent plugin replay + SQL receipt/client lost-response tests | BLOCKED |
| 13 | Approvals | Expired/wrong-chat/stale/reused token rejected | SQL confirmation tests, raw human hook fixtures | BLOCKED |
| 14 | Planner | Create 08:30; move/edit/unschedule/delete; UI/DB agree | SQL bidirectional sync; local calendar and browser fixtures | BLOCKED |
| 15 | Focus | Running/paused reload, frozen save retry, one ledger; correct date totals | Recovery unit/browser and learning RPC tests | BLOCKED |
| 16 | Skills/learning | Explicit rating/feedback only; no inferred mastery | Duplicate identity, baseline/learning fixture tests | BLOCKED for real baseline |
| 17 | Projects | Create/edit milestones/tasks; actual progress from canonical tasks | Every-entity SQL smoke + alias test; browser record manager | BLOCKED |
| 18 | Contacts | Save contact/interaction/followup; no external send | SQL effects/relink tests and record manager | BLOCKED |
| 19 | Applications | Update each allowed stage; date/counts agree | SQL date side effects; canonical shared stage list | BLOCKED |
| 20 | Practice | Insert/relink/delete real practice; counts recompute | SQL both-parent practice tests + demo mutation fixture | BLOCKED |
| 21 | Notes | Remote update, stale save rejected, draft retained, explicit reload | Hosted UI simulation: VERIFIED WORKING; no real hosted write | BLOCKED |
| 22 | Attachments | Trusted file → owned metadata/object → expiring authorized download; wrong owner denied | MIME/path/storage-boundary fixtures; IMPLEMENTED BUT NOT LIVE TESTED | BLOCKED |
| 23 | Exports | Complete JSON/entity CSV; owner bounds, signed expiry, literal formulas | SQL full/scoped export, CSV unit and actual demo download | BLOCKED for live private links |
| 24 | History/undo | Before/after survives; undo restores linked note; later edits conflict | Complete linked-note SQL scenario and conflict tests | BLOCKED |
| 25 | Bidirectional sync | Telegram mutation appears on open website/reload; website edit appears in Telegram | Revision polling/optimistic concurrency browser simulation + shared SQL rules | BLOCKED for real transport/database/browser chain |

For each live run append: preconditions, exact actions, expected result, actual result, evidence location, status and cleanup result. A passing local fixture in the evidence column never changes the live column.

## Learning loop

Local parser/engine/service and real PostgreSQL learning RPC tests preserve canonical tasks and nonduplicated ledgers. The real acceptance flow requires owner baseline review, a genuine eligible assignment, reserve-before-send receipt, actual learner reply, saved feedback/progress, Daily Log agreement, identical-reply retry and next recommendation. It remains **BLOCKED** by genuine baseline and live approval/testing prerequisites. Do not create a false completion to unblock it.

## Recovery and reliability

Test pending Focus save after reload and connection loss, plugin SQLite replay after module reload, stale undo and browser revision conflict. Windows gateway process/startup entry checks are not proof of reboot or crash recovery. Real reboot testing is not performed by this suite.
