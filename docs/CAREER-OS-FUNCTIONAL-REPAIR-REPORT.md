# Career OS functional repair report

Started 20 October 2026. Target: existing TanStack/Lovable source, branch `codex/full-telegram-control`. This inventory reconciles the complete earlier audit, including source-only gaps. All statuses refer to the scope stated; none certifies deployed repairs. No P0 authentication bypass was established; live multi-user verification remains blocked.

## Initial findings (historical)

| ID / severity | Module / existing behavior and root cause | Correction and files | Required regression / initial status |
| --- | --- | --- | --- |
| F1 P1 | Planner hides arbitrary times; exact fixed-slot comparisons | Dynamic normalized times, PlannerPage | 08:30 and DB seconds; local browser evidence exists; IMPLEMENTED BUT NOT LIVE TESTED |
| F2 P1 | Editor completion/reopen misses timestamps | Shared task lifecycle, store and SQL guard | Create completed, reopen, log/dashboard counts; IMPLEMENTED BUT NOT LIVE TESTED (SQL only) |
| F3 P1 | Focus state is memory-only and interval-based | Persist clock anchors/save intent; FocusProvider and recovery module | Running/paused refresh, pending retry, duplicate completion; FAILED in earlier audit |
| F4 P2 | Today totals use pending task list | Sum real ledger independently, TodayPage | Completed minutes retained; local fixture verified; IMPLEMENTED BUT NOT LIVE TESTED |
| F5 P2 | Tablet retains wide desktop shell | Responsive shell/table containment, styles | 360/760/768/820/1024/1440 widths; FAILED in earlier audit |
| F6 P2 | Dialog lacks complete focus lifecycle | Focus trap/Escape/return focus, ui.tsx | Forward/reverse Tab and focus restoration; FAILED in earlier audit |
| F7 P2 | Demo accepts duplicate skill identities | Consistent normalized validation, store/domain plus SQL | Exact/case/whitespace variants preserve existing rows; FAILED in earlier audit |
| F8 P2 | Sample Copilot calls authenticated endpoint | Explicit demo local parser, CopilotPage | No provider request in demo; anonymous endpoint stays denied; FAILED in earlier audit |
| F9 P1 | Task/block schedules written separately | Shared scheduling rules and DB triggers | Move/unschedule/delete/undo plus standalone blocks; IMPLEMENTED BUT NOT LIVE TESTED (SQL) |
| F10 P2 | Dashboard hardcodes incomplete stages | Shared full pipeline stages | All stages counted, terminal states visible; NOT IMPLEMENTED |
| F11 P2 | Proposal lacks priority; apply hardcodes medium | Validated priority and real selected record IDs, ai types/local/Copilot | High create, unknown/stale IDs, explicit confirmation; FAILED in earlier audit |
| F12 P2 | Search ignores selected record ID | Exact-record panel/navigation, SearchDialog | Note/task/filtered/archived result opens correct record; NOT IMPLEMENTED |
| F13 P2 | Hosted reads/export silently cap at 1000 | Stable all-page queries, store/export | 1001+ fixture and export; IMPLEMENTED BUT NOT LIVE TESTED |
| F14 P2 | Zero-row saves accepted; split activity failure misreports success | Returned rows, atomic write or distinct warning outcome | Stale/deleted row and activity failure injection; IMPLEMENTED BUT NOT LIVE TESTED (partial) |
| F15 P2 | AI routes lack per-user request budget | Persisted server-side quota before provider call | Bounded mocked requests reject excess; NOT IMPLEMENTED |
| F16 P1 | Gateway stopped with stale state | Supported gateway restart/startup and isolated runtime checks | Currently running; crash/reboot remains BLOCKED |
| T1 P1 | New undo regression stops at incorrect status assertion | Confirm API completed contract then execute full scenario | Feedback, parent deletion, notes, undo, conflict, history; FAILED |
| G1 P2 | Missing general edit/archive/restore paths across modules | Review actual TanStack panels and expose validated supported lifecycle | CRUD/relationships/confirmations; NOT IMPLEMENTED for uncovered paths |
| G2 P2 | Planner existing-block lifecycle and true month incomplete | Edit/delete and calendar boundaries | Move/delete, February/month edges; NOT IMPLEMENTED |
| G3 P2 | Backup restore, recurrence and notification execution absent | Implement safe supported portions; retain truthful limitations | Never infer external delivery from dates; NOT IMPLEMENTED |
| G4 P2 | Auth recovery and hosted lifecycle unverified | Inspect auth; implement recovery if absent, fixture validation | Real isolated account unavailable; BLOCKED live tests |
| G5 P2 | Skill identity, goal visibility, project progress and accessible labels incomplete | Reconcile original matrix with actual production extra panels | Explicit manual mastery, canonical task progress; IMPLEMENTED BUT NOT LIVE TESTED where source exists |
| D1 P2 | README/framework and Linux-worker wording stale | Update deployment/platform docs and expose safe build revision | Accurate production branch and Windows host instructions; NOT IMPLEMENTED |
| L1 P1 | Learning baseline unconfirmed; scheduler disabled | Preserve state; test real service locally and document owner gates | No invented baseline/delivery/progress; BLOCKED live loop |
| S1 P1 | New plugin/schema not deployed | Review approvals, provenance, migration, storage and tool isolation | Local fixtures first; BLOCKED production by explicit approval |

The table above preserves the initial investigation state. The resolution table below supersedes those initial statuses. Production verification remains separate.


## Resolution matrix — current review source

All verification below is local unless explicitly stated. Final gate commands/results are recorded in production readiness after the last source change.

| Issue | Repair / modified files | Evidence | Current status |
| --- | --- | --- | --- |
| F1 | PlannerPage: normalize DB time values and expose arbitrary saved times | Planner 08:30 persistence and 08:45 edit/reload | IMPLEMENTED BUT NOT LIVE TESTED |
| F2 | domain/mutations, store, SQL 0005: set/clear completion timestamps consistently | Task complete/reopen unit, SQL and browser scenarios | IMPLEMENTED BUT NOT LIVE TESTED |
| F3 | domain/focus, FocusProvider: elapsed clock anchors, persisted pause/save intent, same-ID retry | Running/paused reload and exactly-once ledger browser + unit tests | IMPLEMENTED BUT NOT LIVE TESTED |
| F4 | insights, TodayPage: sum canonical ledger independently of pending task list | Hosted fixture keeps completed task 45m | IMPLEMENTED BUT NOT LIVE TESTED |
| F5 | styles, Workspace: tablet shell containment, wrapping and small-screen grid | 14 routes × six widths, no horizontal page overflow | IMPLEMENTED BUT NOT LIVE TESTED |
| F6 | ui.tsx: existing Radix modal primitives with focus lifecycle | Forward/reverse tab, Escape, focus restoration | IMPLEMENTED BUT NOT LIVE TESTED |
| F7 | mutations, SQL 0005: normalized future skill identities | Exact/case/whitespace rejection; legacy IDs/ratings preserved during migration rehearsal | IMPLEMENTED BUT NOT LIVE TESTED |
| F8 | CopilotPage, ai/local: explicit deterministic demo parser | Demo command makes no authenticated provider request | IMPLEMENTED BUT NOT LIVE TESTED |
| F9 | mutations, store, SQL: one task/block schedule mutation with shared triggers | Move, unschedule, delete, undo; standalone block accounting | IMPLEMENTED BUT NOT LIVE TESTED |
| F10 | domain/types, DashboardPage, JobsPage: one full application-stage catalog | Every supported stage included; Kanban drag/drop fixture | IMPLEMENTED BUT NOT LIVE TESTED |
| F11 | ai/types/local, CopilotPage, API: validated priority and actual owned references | High-priority create; invalid IDs rejected; real focus save intent | IMPLEMENTED BUT NOT LIVE TESTED |
| F12 | SearchDialog, RecordManager: open exact selected record | Browser exact-note lookup and editable record panel | IMPLEMENTED BUT NOT LIVE TESTED |
| F13 | store, agentData, control queries/export: stable complete pages | 205 SQL rows plus hosted read pagination; full owner export semantics | IMPLEMENTED BUT NOT LIVE TESTED |
| F14 | workspace-write, store, SQL: atomic browser writes/activity, returned rows, expected revisions | Lost response replays once; injected log failure rolls back; stale note preserved | IMPLEMENTED BUT NOT LIVE TESTED |
| F15 | ai-quota and AI routes: authenticated persistent hourly/daily limits, bounded input/output, timeout | Mocked quota/body/auth/provider failure checks | IMPLEMENTED BUT NOT LIVE TESTED |
| F16 | Existing gateway/startup profile retained; read-only runtime health | Gateway running and getMe/API 200 on 20 October; actual reboot/crash recovery unavailable | BLOCKED |
| T1 | transactions.test and SQL parent/note undo behavior; canonical completed assertion | Full former failing regression reaches delete/undo/conflict/history assertions | VERIFIED WORKING |
| G1 | RecordManager + store/workspace_write: validated general create/edit/delete/restore, linked entities, safe completion setters | Goal lifecycle, original ID restoration, subtask complete/reopen, all writable SQL entities | IMPLEMENTED BUT NOT LIVE TESTED |
| G2 | PlannerPage + calendar: edit/delete existing blocks and real padded month navigation | Browser block edit/delete, final month day; February/leap boundary unit tests | IMPLEMENTED BUT NOT LIVE TESTED |
| G3a | recurrence, store, SQL, RecordManager: explicit owner opt-in completion-based task repeats | Monthly clamp, one zero-progress successor, retry, undo, browser opt-in | IMPLEMENTED BUT NOT LIVE TESTED |
| G3b | Full JSON/binary backup restoration, scheduled followup delivery and full offline synchronization | Export is explicitly not a backup/restore system; no delivery inferred from dates | NOT IMPLEMENTED |
| G4 | login: password recovery/reset UI and safe login/profile lifecycle; Notes: stale-draft recovery | Intercepted hosted note conflicts/reload; no actual recovery email or second live account | IMPLEMENTED BUT NOT LIVE TESTED |
| G5 | Shared goal/project progress, all completed goals accessible, manual ratings preserved, accessible Focus/record labels | Shared calculation tests, lifecycle/browser checks | IMPLEMENTED BUT NOT LIVE TESTED |
| D1 | README, agent panels/API docs, api/version and runbooks | TanStack/Windows source distinction and safe optional revision stamp | IMPLEMENTED BUT NOT LIVE TESTED |
| L1 | control learning ingress/intent repair; original transactional learning functions retained | Synthetic assignment → reservation → delivery map → real SQL reply → one ledger, all rolled back | BLOCKED |
| S1 | Control schema, registry, owner/private context, approvals, safe undo, private attachments, 15-tool plugin | Real PostgreSQL/service/protocol/SDK fixtures; no production schema or plugin activation | IMPLEMENTED BUT NOT LIVE TESTED |
| S2 | package.json/bun.lock: targeted vulnerable transitive upgrades and patched Vitest | Clean frozen install, audit, types/tests/build and build-tool compatibility gates | IMPLEMENTED BUT NOT LIVE TESTED |

L1 is blocked for the actual owner because a genuine baseline, complete guide confirmation where needed, approved activation and live delivery/reply verification are still absent. Its local SQL accounting repair does not assert real learning progress.

## Other deliberate boundaries

Development requests persist pending records; an automatic coding/deployment bridge is BLOCKED without a reviewed external executor and approval. Actual outreach, applications, messages and account recovery emails were not sent by these tests. Full screen-reader coverage and actual host crash/reboot recovery remain BLOCKED for production verification.
