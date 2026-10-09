<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Agent worker writes only via `/api/agent/*` routes → service-role-only DB functions (`agent_ingest`, `agent_poll`, `agent_complete_command`); why: one transaction, one bound owner (`agent_owner`), no client write path.
- Agent token is verified by SHA-256 digest in secret `AGENT_TOKEN_SHA256` (constant-time); why: raw token never stored. Contract: `docs/AGENT_API.md`.
- Agent UI reads/writes agent tables through the browser client under RLS and never in demo mode; why: demo data must never mix with real agent records.
- Learning manager logic lives in pure modules (`src/lib/learning/parse.ts`, `engine.ts`) shared by `/api/learning/*` (owner, RLS) and `/api/agent/learning/*` (agent token, owner-bound) via `service.server.ts`; why: one deterministic, unit-tested rule set for app, agent and tests.
- Learning time is ledgered only in `focus_sessions` (+ `tasks.actual_minutes` total); `learning_sessions` rows with `focus_session_id` are mirrors and are never summed; why: prevents double counting in weeklyTime().
- Learning side effects (assignment, feedback, focus save, curriculum apply, run claims, Telegram delivery) go only through `learning_*` SQL functions, one transaction each with a per-user advisory lock; why: retries and concurrent focus/Telegram writes cannot half-apply or double count.
- Legacy `study_tasks` with `consolidated_task_id` use the linked task as their only progress record; why: one progress system.
- Telegram sends use reserve-before-send (`learning_begin_delivery`) and CAS finish (`learning_finish_delivery`); pending/unknown are never auto-resent; why: a crash between send and receipt must not duplicate messages.
- Learning-manager commands (`ping_learning_manager`, `send_test_telegram`) are excluded from `agent_poll` and served by learning pulse/context + `learning_ack_command`; why: the learning worker, not the general worker, executes them.
- Learning schedule dates use `learning_preferences.timezone` (IANA, validated in Intl and SQL) via `zonedParts`; why: one DST-correct local-day rule for app, API and SQL.
- Guide text from Google Doc export, published HTML or DOCX upload all go through the same `parseGuide` + `learning_apply_curriculum`; why: identical validation and rollback regardless of source.

