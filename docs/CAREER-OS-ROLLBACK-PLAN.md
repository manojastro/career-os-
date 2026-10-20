# Rollback and recovery plan

## Principle

Keep user records, ledger identities and audit history. Do not reverse this release with blanket DROP statements, destructive reset, force-push or the unrelated Next.js source tree. A JSON records export is not a verified database/storage recovery plan.

## Before rollout

Record the old published/editor revision, verified recoverable source, actual database backup identity and restoration proof, object-storage backup and protected Hermes configuration backup. Production backup and scratch-restore evidence remain **BLOCKED** until access is available. The embedded PostgreSQL migration test proves transactional migration rollback and existing-row preservation, not restoration of an actual production backup.

## Failed migration before commit

With the exact migration inside one transaction, issue ROLLBACK on the first failure. Local `migration.test.ts` executes migration then ROLLBACK and confirms the new table is absent and old IDs/names/ratings unchanged; a second COMMIT rehearsal preserves legacy rows. Never resume at a middle statement. Inspect current state before retrying.

## Application or plugin fault after rollout

1. Stop the new Telegram control gateway path to prevent further changes; keep scheduled learning disabled.
2. Preserve logs, receipts, request IDs and private backups. Re-read uncertain outcomes before any resend.
3. Restore the previous known application source through Lovable's actual version/publish mechanism; verify the restored revision and anonymous/authenticated read behavior. The source rollback must be verified in that project, not inferred from a Git branch reset.
4. Restore the protected pre-install Hermes config/plugin files from the installer's backup and restart the existing gateway. Verify process and prior toolset. The installer's failure path is implemented; a real production rollback has not been executed.
5. Retain additive control tables/history while investigating. Prefer a reviewed forward repair. If a new trigger must be disabled, first stop writes, identify its exact table/name from the reviewed migration, rehearse the change in a restored scratch database and obtain approval. No untested trigger-removal script is authorized here.

## Data correction

For isolated supported mutations, confirmation-bound undo checks current snapshots and restores only if no intervening edits conflict. It is not a global database rollback. Single-record restore validates parents and does not restore an entire cascade automatically. For corruption outside undo's supported boundary, use the separately verified provider backup/point-in-time recovery plus storage restoration; obtain owner approval and verify an isolated restore before replacing anything live.

## Verification after recovery

Confirm owner binding, record counts and IDs, canonical tasks, preserved focus/learning ledgers, private files, source revision, disabled job, gateway toolset, API authentication and actual website reads. Mark the incident **BLOCKED** or **FAILED** where evidence is missing; do not call recovery complete from a successful restart alone.
