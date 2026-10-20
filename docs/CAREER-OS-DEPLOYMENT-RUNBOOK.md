# Career OS deployment runbook

## Approval and target

**No production deployment is performed by preparing this branch.** Target is existing Lovable project `79875339-208c-46e9-9a92-43b90bb04184`, Career Compass, at `https://career-os-manoj.lovable.app`, and the existing Windows Hermes profile `C:\Users\manoj\AppData\Local\hermes`. Preserve OpenRouter / `meta/muse-spark-1.3-contributor` and disabled job `46a628bb9ae9`.

Release review branch: `codex/full-telegram-control`, based on `codex/lovable-learning-manager`. Do not merge the TanStack source into the unrelated Next.js `main` or `codex/daily-learning-manager` tree. A GitHub push is not a Lovable publication.

## 1. Review package before approval

Use Node 24 and Bun 1.4.3 (packageManager pin). The scoped security override uses Bun lock format 3, which older Bun versions cannot read. Verify the actual Lovable build runtime supports this version before publishing; if not, resolve its supported dependency-install mechanism before rollout. Run frozen install, audit, tests/types/build/plugin tests and targeted lint. Review registry/SQL parity, the migration rehearsal, lockfile diff, owner isolation, attachments, confirmations and all changed source. Verify the remote branch points to the intended commit. Read the complete repair, regression, security, permissions, coverage and rollback documents. Retain a reviewed source archive/diff and exact release SHA; exclude `.env`, runtime backups, test output and account contents.

## 2. Verify recovery prerequisites

Record existing editor revision and the recoverable published source. Verify the actual Supabase backup mechanism, snapshot age and storage-object recovery separately; do not assume JSON export is a database/file backup. Restore a backup in an isolated scratch environment and verify row ownership, IDs, key counts and representative files before relying on it. Production backup access and an isolated restoration target are currently **BLOCKED**; the local migration rollback rehearsal does not satisfy this production backup gate.

Confirm that the existing bot can be stopped/restarted without creating a second consumer, and preserve the protected current profile/configuration. No tokens belong in the review package.

## 3. Obtain explicit approval

Present exact commit, migration hash, source-delivery mechanism, protected backup/recovery evidence, plugin change and live disposable-test scope. Request approval for migration 0005, application publication, plugin install/toolset restriction and gateway restart. This approval does **not** enable scheduled learning or authorize outreach/job submissions.

## 4. Verify schema and apply migration once

Preflight read-only SQL:

```sql
SELECT to_regclass('public.control_registry') AS new_schema;
SELECT EXISTS(SELECT 1 FROM public.agent_owner WHERE singleton=true) AS owner_bound;
SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id='career-evidence' AND public=false) AS private_bucket;
```

Verify existing production schema matches the reviewed fixture columns/defaults/constraints. Migrations 0000–0004 were already applied; do not reapply them or the separate Next.js migrations. Do not use `drizzle push` against the export's partial schema.

After approved backup verification, run the **exact reviewed file** `drizzle/migrations/0005_telegram_control.sql` inside one explicit `BEGIN`/`COMMIT` transaction, stop on the first error and roll back on failure. This is a one-time CREATE migration, not an idempotent retry script. If the new schema already exists, inspect migration receipt/history before taking any action. Do not partially rerun it.

Verify registry count 58, writable count 43, functions/triggers, owner RLS and service/browser grants. Confirm existing business records were not re-keyed or merged. Migration only constrains future skill identity writes; legacy case/whitespace variants are preserved.

## 5. Publish reviewed application source

Confirm the real Lovable repository/branch connection in its project settings. Current connector metadata does not establish automatic synchronization from this review branch. Do not switch Lovable to this repository's Next.js main branch.

If Git synchronization can target the reviewed TanStack branch safely, compare the resulting editor files with the exact reviewed commit before publishing. Otherwise transfer the reviewed source through the project's authorized file/agent workflow, then compare every changed file. If exact source transfer or branch configuration is unavailable, this step is **BLOCKED** and requires the owner to perform the explicit source-import step in Lovable; do not pretend a push deployed it.

Set server-only `CAREER_OS_BUILD_REVISION` to the reviewed 40-character Git SHA. Publish the existing project only after source/diff verification. Check `/api/version`: revision must match; a null stamp is not verified deployment parity. Check authenticated malformed POST `{}` to `/api/agent/control`: expected HTTP 400 `invalid_request`, not the old HTTP 406 response. Anonymous calls must fail closed. Do not log authorization headers.

## 6. Activate reviewed plugin, only after approval

Use the installed Hermes venv Python. First run `scripts/install_career_control.py` with no flags: dry run only. It validates the existing profile, owner, disabled job and deployed control handler. After explicit owner approval, run with `--apply --owner-approved`. The installer backs up protected profile files, stops the existing gateway, copies only the reviewed plugin, enables `career-os-control`, restricts the Telegram toolset, verifies the cron file was not written, and restarts the existing gateway. On failure it restores prior configuration and attempts the previous gateway start.

Verify process status, loaded fifteen tools/two hooks and actual owner messages. Gateway startup alone is not successful end-to-end testing. Never run a competing getUpdates consumer. Keep the existing startup entry; reboot/crash recovery remains separately unverified unless safely tested.

## 7. Verify and monitor

Run the 25 approved disposable-record scenarios from [end-to-end tests](HERMES-END-TO-END-TESTS.md), including database reads, website reload, cross-owner denial, file expiry and conflict recovery. Stop on unexpected mutations, duplicated time or authorization failure. Re-read and clean only exact disposable IDs; record cleanup outcomes.

Check actual audit history, error/rate-limit behavior, client errors and gateway logs without credentials. Observe real traffic before expanding use. Do not create background monitoring/cleanup jobs without authorization.

Learning remains disabled until genuine baseline review, the actual assignment/delivery/reply/progress loop and its own activation approval are complete.

## Reviewed migration identity

SHA-256 of the Git blob (LF line endings) for migration 0005: `7311e04ffc935595d8c7642a594cc30f6d9f4c98ff5626e36663027836e5c602`. Compare after normalizing CRLF to LF only; never alter statement contents. This identifies the locally rehearsed migration, not approval to execute it. The default installer dry run exited 0 with control_api_auth_preflight false, confirming production activation remains gated.
