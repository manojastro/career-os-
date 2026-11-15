# Career OS + Hermes → one VM: migration runbook

Written 15 November 2026 for **Claude Code running on the new VM**. Read this file, `CLAUDE.md`
and `AGENTS.md` first. This repository is **public**: never commit secrets, the Lovable database
export, the Hermes profile, or anything under `docs/claude-handoff-evidence/`.

Goal: run the Career OS web app **and** the Hermes Telegram agent on one always-on VM, using a
managed Supabase database and the owner's own OpenRouter key, so Telegram works when the laptop
is off and the app no longer depends on Lovable hosting.

## 0. Ground rules for whoever executes this

- **Owner approval gates.** Stop and get the owner's explicit "yes" before each of: creating or
  paying for any cloud resource (VM, Supabase project, domain), any state-changing `gcloud`/cloud
  command (state the account and project first), restoring or migrating a real database,
  stopping the laptop gateway, starting the VM gateway, running a paid OpenRouter call, and
  unpublishing the old Lovable app.
- **Secrets.** Never print, echo, paste into chat, or commit a secret. Move them only between the
  owner's machines over SSH (`scp`) into `chmod 600` files. Derive the two hashes on the VM (§8.3).
- **One Telegram consumer.** Never run the laptop gateway and the VM gateway at the same time on
  the same bot.
- **Evidence over claims.** Report the real output of every check. Fixture tests are not
  production proof. Mark anything unverified as unverified.
- **Do not change** the Hermes provider/model (OpenRouter, `meta/muse-spark-1.3-contributor`),
  and keep the learning job `46a628bb9ae9` **disabled**.

## 1. What has been done so far

| Area | State (15 Nov 2026) |
|---|---|
| Source | Branch `codex/career-os-agent-v2` pushed to `github.com/manojastro/career-os-`, HEAD `3b99106` + this runbook commit. Draft PR #3 → `codex/full-telegram-control`. `main` is an unrelated Next.js history: never merge into it. |
| V2 Tasks 1–5 | Done locally: audit, HTTP/dependency hardening, shared Focus (`0006`), memory/document registry (`0007`), durable workflows with `confirm v2` (`0008`). Task 5 independently reviewed; two SQL findings fixed (commit `3f42c0d`). |
| Extra work committed | Worker check-in (`0009`), Telegram activity panel, interview prep/search health, `career_job_intake` Hermes tool (17 tools), `CLAUDE.md`. |
| Local gates | tsc 0; Vitest 35 files/199 tests; Hermes plugin 15 + HTTP 6 tests; changed-file lint (3 pre-existing `AgentPanels.tsx` items). |
| Migration rehearsal | `scripts/migration-rehearsal/`: replayed production's real history (11 Supabase migrations + `0000`–`0004`) on PostgreSQL 17.11; schema fingerprint **matches production 9/9**; `0005`–`0009` apply, roll back cleanly, and pass post-checks (58 registry / 43 writable, service-only grants, no private helper exposed, anon denied, workflow smoke creates exactly one task). |
| Live checks (read-only) | Telegram `getMe` 200; Hermes→app authenticated read 200 (agent token matches); new control route 406 (not deployed); OpenRouter key present in Hermes env (no paid call run); learning job disabled. |
| Not done | Nothing applied to production. Old app still live at `career-os-manoj.lovable.app` (commit `4473f37`, 9 Oct). Lovable not connected to GitHub. No database export taken yet. Hermes plugin not installed. Tasks 6–8 not started. |

## 2. Verified facts the plan relies on

**Production database (Lovable Cloud / Supabase, PostgreSQL 17.6)**
- Applied: Lovable's 11 `supabase/migrations/*` and Drizzle `0000`–`0004`. Missing: `0005`–`0009`.
- 59 public tables; **1 auth user**, email/password only; agent owner bound.
- Extensions: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault` (no `pg_cron`, no `pg_net`, no scheduled DB jobs). Storage is **empty** (no uploaded files).
- Daily automatic backups exist (newest at the time of writing: 15 Nov 2026 03:18 UTC).

**Application**
- TanStack Start + Nitro via `@lovable.dev/vite-tanstack-config`; default build target is Cloudflare, overridable with `NITRO_PRESET`.
- Auth: Supabase `signInWithPassword`/`signUp` only. `src/integrations/supabase/previewAuthStorage.ts` only acts inside the Lovable editor iframe; verify it is inert elsewhere.
- AI features use Lovable's gateway (`src/lib/ai-gateway.server.ts`, `LOVABLE_API_KEY`, model `openai/gpt-6-astra`, OpenAI Responses-style reasoning options). Callers: `src/routes/api/ai/analyze-jd.ts`, `src/routes/api/ai/command.ts`, `src/lib/control/service.server.ts` (job intake).
- Server secrets read: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AGENT_TOKEN_SHA256`, `TELEGRAM_OWNER_ID_SHA256`, `LOVABLE_API_KEY`, `CAREER_OS_BUILD_REVISION`. `src/integrations/supabase/cron-auth.ts` (`LOVABLE_CRON_SECRET`) is generated and unused. Re-run `grep -rhoE "(process\.env|import\.meta\.env)(\.|\[\")[A-Z_]+" src | sort -u` to confirm the full list, including build-time `VITE_*` names.
- `AGENT_TOKEN_SHA256` = SHA-256 hex of Hermes `CAREER_OS_AGENT_TOKEN`. `TELEGRAM_OWNER_ID_SHA256` = SHA-256 hex of the numeric owner ID in Hermes `TELEGRAM_ALLOWED_USERS`.
- Runtime: Node 24, Bun 1.4.3 (`packageManager`), `bun.lock` format 3.

**Hermes (laptop today)**
- Hermes Agent **0.21.3**, profile `C:/Users/manoj/AppData/Local/hermes`, gateway long-polls Telegram.
- `.env` key names: `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, `TELEGRAM_HOME_CHANNEL`, `CAREER_OS_BASE_URL`, `CAREER_OS_AGENT_TOKEN`, `CAREER_OS_TELEGRAM_CHAT_REF`, plus tool/debug settings and old `OPENCODE_ZEN_*`/`HERMESONE_API_KEY`/`API_SERVER_KEY` entries.
- `scripts/install_career_control.py` is **Windows-specific** (`bin/hermes.exe`); it must be adapted for Linux (§5 P4).

## 3. Target architecture

```
                 Internet (HTTPS 443)
                        │
              ┌─────────▼──────────┐   Ubuntu 24.04 LTS VM (always on)
              │ Caddy (auto TLS)   │
              │  └─► 127.0.0.1:3000 career-os (Node, Nitro node-server, systemd)
              │                     │
              │ hermes-gateway (systemd) ──► Telegram Bot API (long polling, outbound only)
              │        │            └────► OpenRouter (Hermes model)
              │        └─► https://<app domain>/api/agent/* (agent token)
              └────────┬───────────┘
                       │ HTTPS
              ┌────────▼───────────┐
              │ Supabase (managed) │  Postgres + Auth + Storage, daily backups
              └────────────────────┘
App AI features (job analysis, commands) ──► OpenRouter (owner's key)
```

- The database is **not** self-hosted on the VM: Supabase keeps auth, RLS, storage and backups working unchanged.
- No inbound port for Telegram (polling is outbound). Open only 80/443 publicly; SSH restricted.

## 4. Decisions to confirm with the owner before starting

| ID | Decision | Recommendation |
|---|---|---|
| D1 | VM provider, region, size | Google Compute Engine `e2-medium` (2 vCPU, 4 GB; builds need RAM), Ubuntu 24.04, 30 GB balanced disk, region `asia-south1`. Any equivalent VPS is fine. |
| D2 | Supabase plan and region | Region `ap-south-1` (Mumbai). Free tier works technically, but check current terms on backups and pausing inactive projects; Pro gives daily backups and no pausing. |
| D3 | Address | Own domain (A record → VM IP), or free `<ip-with-dashes>.sslip.io` with Caddy TLS to start. |
| D4 | Data | **Carry over** (Lovable export → restore into Supabase; the owner keeps the same login) or **start fresh** (empty database, sign up again). Carry-over requires the owner to download the Lovable export first. |
| D5 | Model for app AI features | Via OpenRouter; pick a model with structured output/tool support. Make it configurable (`CAREER_OS_AI_MODEL`). |
| D6 | Old Lovable app | Keep published as rollback until the VM is verified for a few days; then the owner unpublishes it. |

## 5. Phases

Each phase ends with its checks. Do not start the next phase until they pass.

### P0. Prerequisites (owner)
1. Accounts: VM provider (billing on), Supabase, optionally a domain.
2. If D4 = carry over: Lovable → More → Database → Manage → Settings → Export data → Start export; download the archive from More → Storage when emailed. Storage has no files to download (verified empty).
3. Private files to move to the VM over SSH (never via git or chat):
   - the Lovable export (if any);
   - the Hermes profile subset (§8.2), taken **after** stopping the laptop gateway in P7;
   - optional private evidence: `docs/claude-handoff-evidence/`, `docs/CLAUDE-CODE-HANDOFF.md` (owner requirements and history; not in git).

### P1. Provision and harden the VM (approval: create resources)
- GCP per the owner's defaults: dedicated service account with no roles (no key files), OS Login, SSH via IAP only (`35.235.240.0/20` on port 22), firewall 80/443 open, deletion protection on, a scheduled disk snapshot policy (daily, keep 7).
- On the VM: create users `careeros` and `hermes` (no sudo), `unattended-upgrades` on, `ufw` allow 22 (IAP), 80, 443; time zone UTC (the app uses the owner's saved IANA zone).
- Checks: SSH works only via the intended path; `sudo ufw status` shows exactly those ports; snapshot policy attached.

### P2. Tooling
- Node 24 LTS, Bun 1.4.3, git, Caddy (official apt repo), PostgreSQL 17 server + client (local rehearsal only, bound to 127.0.0.1), Python 3.12 + venv for Hermes, `sqlite3`.
- Checks: `node -v` (v24), `bun -v` (1.4.3), `caddy version`, `psql --version` (17.x).

### P3. Source and baseline gates
```bash
git clone --branch codex/career-os-agent-v2 https://github.com/manojastro/career-os-.git /srv/career-os
cd /srv/career-os && bun install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run --maxWorkers=2
```
Then rerun the migration rehearsal on the VM's local PostgreSQL (loopback only):
```bash
REHEARSAL_ADMIN_URL=postgres://postgres@127.0.0.1:5432/postgres \
  node scripts/migration-rehearsal/rehearse.mjs "$PWD" scripts/migration-rehearsal
```
Expect `base parity with production = true` and every post-check as in §1. Python plugin tests run after Hermes is installed (P7).

### P4. Code changes to run off Lovable (new branch, tests first, then review)
Create `codex/vm-hosting` from `codex/career-os-agent-v2`. Each change gets a failing test first where testable.
1. **AI provider → OpenRouter.** Replace `lovableGateway` with an OpenRouter client (`baseURL https://openrouter.ai/api/v1`, `OPENROUTER_API_KEY`, model from `CAREER_OS_AI_MODEL`). Use chat-completions calls; drop or guard the OpenAI-only Responses reasoning options. Update every caller and `checkAiQuota`. Keep the existing "AI unavailable → local fallback" paths (job intake already falls back to local analysis).
2. **Build target.** Build with `NITRO_PRESET=node-server`; confirm `.output/server/index.mjs` starts with `PORT=3000 HOST=127.0.0.1`. If the Lovable config package fights this, replace it with an explicit TanStack Start + Nitro config reproducing its plugin list.
3. **Lovable-only code.** Confirm `previewAuthStorage.ts` is inert outside the Lovable iframe; leave `cron-auth.ts` unused. Remove `LOVABLE_API_KEY` from required config.
4. **Hermes installer and health check for Linux.** Find the Hermes binary from `HERMES_HOME/bin/hermes(.exe)` or `PATH`; keep every safety check (provider/model, disabled job digest, single owner, origin/token validation, no cron write, backup + restore on failure). Extend `scripts/test_hermes_career_control.py` to cover the Linux path.
5. **Docs.** Update `CLAUDE.md` (VM commands) and add `docs/CAREER-OS-VM-OPERATIONS.md` (start/stop, logs, deploy, backup, rollback).
6. Gates: tsc, full Vitest, Python tests, node-server build, changed-file lint. Run `/code-review` on the branch. Commit, push, open a draft PR into `codex/career-os-agent-v2`.

### P5. Database (approval: create Supabase project; restore/migrate)
1. Create the Supabase project (D2). Record its URL, publishable key and service-role key **directly into** the VM secret file (§8.1), never in chat.
2. **D4 = carry over:** restore the Lovable export following Supabase's guide for restoring a `pg_restore` archive into a Supabase project (Lovable's docs confirm users keep their passwords). Then run the fingerprint query in `scripts/migration-rehearsal/digest.sql` against the new project and compare with `prod-digest.txt`; investigate any mismatch before continuing.
   **D4 = start fresh:** apply the 11 `supabase/migrations/*.sql` in name order, then `drizzle/migrations/0000`–`0004`.
3. Apply `drizzle/migrations/0005`–`0009` in order, **one transaction each**, from the LF Git blob (`git show HEAD:<file>`; never the CRLF working copy). Expected reviewed hash of `0005` (LF): `7311e04ffc935595d8c7642a594cc30f6d9f4c98ff5626e36663027836e5c602`. Stop on the first error.
4. Post-checks (same as the rehearsal, step 5): registry 58/43; `agent_v2_kind_policy` has no anon/authenticated grants; service-only functions; no private helper exposed; `0008` rewrites present.
5. Owner binding: if fresh, the owner signs up in the new app (P6), confirms their email, then clicks **Settings → Agent → Link agent to my account** (calls `claim_agent_owner()`, see `docs/AGENT_API.md`). Until then agent calls return `409 agent_owner_not_bound`. If carried over, verify `agent_owner` still points at the owner's user ID.

### P6. Deploy the app on the VM
1. `/etc/career-os/app.env` (`root:careeros`, `0640`) with the §8.1 variables. Build-time `VITE_*` values are needed during `bun run build`.
2. Build as `careeros`: `NITRO_PRESET=node-server bun run build`. Set `CAREER_OS_BUILD_REVISION` to the deployed 40-character commit SHA.
3. systemd unit `career-os.service`: `User=careeros`, `EnvironmentFile=/etc/career-os/app.env`, `ExecStart=/usr/bin/node /srv/career-os/.output/server/index.mjs`, `Environment=PORT=3000 HOST=127.0.0.1`, `Restart=always`, `NoNewPrivileges=true`, `ProtectSystem=strict`, `ReadWritePaths=` only what is needed.
4. Caddyfile: `<domain> { reverse_proxy 127.0.0.1:3000 }` (Caddy obtains TLS).
5. Checks: `GET /api/version` returns the deployed SHA; anonymous calls to `/api/agent/*` fail closed; authenticated `POST {}` to `/api/agent/control` returns **400 `invalid_request`** (not 406); the owner can sign in and Dashboard/Today/Focus/Jobs/Agent Activity load; an AI feature works through OpenRouter (owner-approved paid call).

### P7. Move Hermes (approval: stop laptop gateway, start VM gateway)
1. On the laptop: stop the gateway (`hermes gateway stop` with the laptop profile), disable its auto-start (Windows startup entry / `gateway-service`), confirm no Hermes Python process remains. Laptop profile stays untouched as rollback.
2. Copy the profile subset (§8.2) to the VM over SSH into `/srv/hermes` (`hermes:hermes`, `0700`; `.env` `0600`).
3. Install Hermes Agent **0.21.3** on Linux following the official docs; set `HERMES_HOME=/srv/hermes`. Confirm `config.yaml` still has provider `openrouter` and model `meta/muse-spark-1.3-contributor`, and job `46a628bb9ae9` is still disabled (compare the schedule digest `e0b0675e…f189d`).
4. Edit only `CAREER_OS_BASE_URL` in `.env` to the new app origin (HTTPS, no path).
5. Run `scripts/check_career_control_health.py` (read-only): expect Telegram `getMe` OK, existing API 200, new control API 400.
6. Run the adapted installer: dry run, then `--apply --owner-approved`. It backs up config, installs the plugin, sets the Telegram toolset to `career-os-control`.
7. systemd unit `hermes-gateway.service`: `User=hermes`, `Environment=HERMES_HOME=/srv/hermes`, run the gateway in the foreground mode the Hermes docs specify, `Restart=always`. Start it; verify exactly one gateway process and the plugin loads 17 tools and both hooks.

### P8. End-to-end verification (real owner, disposable records only)
From the owner's Telegram: a read ("what's on today?"); a single task create; a compound request that returns a `confirm v2 <UUID>` preview, then the exact confirm; Focus start/pause/finish (minutes floored, single ledger entry); a V1 `confirm <UUID>`; a job-post intake preview. In the browser: the same records appear; a second test account cannot see them. Run the health script with `--inference` once (paid; owner approves). Record results; clean up only the exact disposable IDs created.

### P9. Cutover and decommission
- Keep the Lovable app published but unused for a few days as rollback. The owner then unpublishes it (Lovable → Project settings → Unpublish). Do not delete the Lovable project or its backups until the owner decides.
- Update `docs/` (deployment runbook, rollback plan, deployed source) to the VM reality.

### P10. Operations
- Backups: Supabase daily backups (per plan) **plus** a nightly `pg_dump` from the VM to an off-VM bucket (encrypted, 14-day retention); a weekly restore test into the local PostgreSQL. VM disk snapshots daily.
- Hermes state: nightly `sqlite3 .backup` of the profile databases + `tar` of the profile, kept off-VM.
- Logs: `journalctl -u career-os -u hermes-gateway -u caddy`; enable log rotation.
- Updates: monthly OS patching, dependency audit, and Hermes upgrades only after reading release notes and re-running plugin tests.
- Monitoring: an uptime check on `/api/version` and an alert if the gateway restarts repeatedly.

## 6. Rollback

| Failure | Action |
|---|---|
| VM app broken | Old Lovable app is still live; point users (the owner) back to `career-os-manoj.lovable.app`. |
| Hermes on VM broken | Stop `hermes-gateway` on the VM **first**, then restart the laptop gateway (its profile was never modified). |
| Migration error | Each migration runs in its own transaction: roll back and stop. For a fresh project, drop and recreate it. Never resume mid-file. |
| Data problem after cutover | Supabase restore (daily backup) or the nightly `pg_dump`, after an isolated restore test and owner approval. |

## 7. Still open after the move

- V2 Tasks 6–8: reminders (`0010`+), Google/research adapters, Agent Activity V2 UI, final docs and whole-branch review (see `docs/superpowers/plans/2026-10-29-career-os-v2.md`).
- Task 5 review notes 3–5: never redefine `agent_v2_workflow_finish`/`control_execute` from pre-`0008` text; `agent_v2_instruction` guards even read-only paths under exposure; the approval preview is relayed by the model.
- Guide source content stops at section V-6; do not invent the missing sections.

## 8. Appendix

### 8.1 VM app secrets (`/etc/career-os/app.env`)
| Variable | Source |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | New Supabase project settings (service key server-only). |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (verified in `src/integrations/supabase/client.ts`; server falls back to the non-`VITE_` names) | Same project; needed at build time. |
| `AGENT_TOKEN_SHA256` | Derived from Hermes `CAREER_OS_AGENT_TOKEN` (§8.3). |
| `TELEGRAM_OWNER_ID_SHA256` | Derived from Hermes `TELEGRAM_ALLOWED_USERS` (§8.3). |
| `OPENROUTER_API_KEY`, `CAREER_OS_AI_MODEL` | Owner's OpenRouter key (same key Hermes uses, or a separate one with a spend limit). |
| `CAREER_OS_BUILD_REVISION` | Deployed commit SHA. |

### 8.2 Hermes profile: copy vs skip
- **Copy:** `.env`, `config.yaml`, `SOUL.md`, `memories/`, `skills/`, `cron/`, `sessions/`, `platforms/`, `pairing/`, `pending_messages/`, `hooks/`, `scripts/`, `state/`, `state.db*`, `kanban.db*`, `response_store.db*`, `runs_idempotency.db*`, `shared-state.db`, `channel_directory.json`, `auth.json`, `account.json`, `models.json`.
- **Skip (Windows/runtime-specific or regenerated):** `hermes-agent/` (Windows venv), `bin/`, `node/`, `desktop*`, `gateway-service/`, `runtime/`, `sandboxes/`, `*cache*`, `logs` and `*.log`, `*.lock`, `gateway.pid`, `gateway_state.json`, `hermes-setup.exe`, `.curator_backups/`, `backups/` (archive separately if wanted).
- Copy SQLite files only with the gateway **stopped**, including `-wal`/`-shm`. Check this list against the Hermes 0.21.3 profile documentation; if unsure, copy everything except the skip list.

### 8.3 Deriving the two hashes on the VM without printing secrets
```bash
sudo -u hermes bash -c 'set -a; . /srv/hermes/.env; set +a;
  printf "AGENT_TOKEN_SHA256=%s\n" "$(printf %s "$CAREER_OS_AGENT_TOKEN" | sha256sum | cut -d" " -f1)";
  printf "TELEGRAM_OWNER_ID_SHA256=%s\n" "$(printf %s "${TELEGRAM_ALLOWED_USERS%%,*}" | tr -d " " | sha256sum | cut -d" " -f1)"' \
  | sudo tee -a /etc/career-os/app.env >/dev/null
```
Hashes are not secrets in themselves, but keep the file `0640` anyway.

### 8.4 Key files
- Migrations: `supabase/migrations/` (Lovable track), `drizzle/migrations/0000`–`0009` (hand-written track).
- Rehearsal kit: `scripts/migration-rehearsal/` (`rehearse.mjs`, `shim.sql`, `digest.sql`, `prod-digest.txt`).
- Hermes plugin: `scripts/hermes-career-control/`; installer `scripts/install_career_control.py`; health `scripts/check_career_control_health.py`; HTTP boundary `scripts/career_http.py`.
- Previous runbooks (Lovable era): `docs/CAREER-OS-DEPLOYMENT-RUNBOOK.md`, `docs/CAREER-OS-ROLLBACK-PLAN.md`, `docs/AGENT_API.md`, `docs/HERMES-SECURITY.md`.
