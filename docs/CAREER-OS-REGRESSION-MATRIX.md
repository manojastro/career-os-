# Career OS regression matrix

The complete 25-scenario actions, expected outcomes, evidence and blocked live results are in [Hermes end-to-end tests](HERMES-END-TO-END-TESTS.md). The issue inventory is in [functional repair report](CAREER-OS-FUNCTIONAL-REPAIR-REPORT.md). Do not combine counts from the older Next.js audit with TanStack test results.

| Feature / defect | Preconditions | Action | Expected persisted result | Executable evidence | Scope |
| --- | --- | --- | --- | --- | --- |
| F1, F9 Planner | Demo or SQL fixture; linked task | Save 08:30, reschedule/unschedule, undo | Task/block agreement; standalone blocks retained | control transaction tests; browser smoke; planner calendar tests | Local only |
| F2 completion | Unfinished task | Complete through editor then reopen | Set/clear completed_at consistently | domain mutations + SQL task rules; Focus browser | Local only |
| F3 Focus | One owned active task | Advance clock, refresh running/paused, complete | Recovery and one immutable session ID | recovery.test.ts; repair browser script | Local only; accelerated clock |
| F4 time | Completed task + saved ledger | Complete task then read Today/week | Recorded time remains; orphaned history included | calendar/mutation/recovery tests; hosted browser simulation | Local fixtures |
| F5 responsive | Sample workspace | Navigate 14 routes at 360/760/768/820/1024/1440px | No document horizontal overflow | repair browser script | Local browser |
| F6 dialogs | Open actual editor | Reverse/forward Tab, Escape, reopen | Trap, close and restore focus | repair browser script + existing Radix primitive | Local browser; full screen-reader audit not claimed |
| F7 duplicates | Existing skill | Exact/case/whitespace duplicate | Reject; preserve old IDs/history | SQL and domain mutation tests | Local PostgreSQL/demo |
| F8/F11 Copilot | Demo; no provider credentials | High-priority create, confirm | Local source label; High persisted; no API inference request | local.test.ts; repair browser script | Local demo |
| F10 pipeline | Applications in every allowed stage | Count and list stages | One shared full stage list | APPLICATION_STAGES source; browser route and record tests | UI integration still subject to live verification |
| F12 search | Matching record outside current module/filter | Select unique result | Exact record opens in owner editor | repair browser script | Local demo |
| F13 large data | Owner fixture > one page | Read/export all pages | Stable complete result; no silent 1000 cap | query/SQL tests; browser download | Local fixtures |
| F14 persistence | Simulated response loss/activity failure | Retry same request; reject stale version | One record; atomic activity; no false save | workspace-write.test.ts; SQL workspace transaction; hosted stale-save simulation | Local fixtures |
| F15 AI budget | Authenticated fixture before inference | Exhaust fixed quota; simulate failed quota DB | 429 or fail-closed 503; no raw provider secrets | ai-quota.test.ts | Mocked boundary; no paid inference |
| F16 gateway | Existing Windows runtime | Status and read-only API/bot checks | Running process/authenticated endpoint | health script (without --inference), Hermes status | Actual health only; reboot unverified |
| Private files | Fixture bytes and owned metadata | Validate type/path, upload/download | Reject untrusted paths; private 300s links | files.test.ts and SQL attachment tests | Boundary fixtures, live storage blocked |
| Note conflicts | Mock hosted owner session | Remote update during local content draft | Stale write rejected; draft retained | hosted browser script | Intercepted backend |
| Migration | Existing disposable data, including legacy duplicate identities | BEGIN migration ROLLBACK; repeat COMMIT | Atomic reversal; existing records unchanged | migration.test.ts | Real embedded PostgreSQL |

Current command results and dates belong in [production readiness](CAREER-OS-PRODUCTION-READINESS.md). Any new failure must remain visible until repaired and rerun; test count alone is not production evidence.

Completion-based recurrence is tested in recurrence.test.ts, the real SQL transaction test (monthly clamp, retry and undo), and the lifecycle browser script. The learning loop transaction fixture uses only synthetic curriculum, baseline and evidence, then rolls back the entire test. No actual owner mastery or Telegram delivery is inferred.
