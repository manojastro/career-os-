# Learning deployment — October 9, 2026

## Published application

- URL: https://career-os-manoj.lovable.app
- Lovable project: `79875339-208c-46e9-9a92-43b90bb04184`
- Reviewed/published commit: `4473f3723dc547bd6c15708948257f0e13c033a7`
- Publication confirmed by project `is_published: true` and the live Settings learning-manager section.
- Production source saved on GitHub `codex/lovable-learning-manager`, commit `b0e2d54e042c8ba2c62b75ddc52ad5f124fb2217` (190 text files including setup additions; no `.env`).

## Actual owner data

The existing agent_owner was verified against the real owner account. Its real Google Docs guide was imported using the transactional server importer. There is one incomplete source/version and 30 linked chapters. The document ends at V-6; listed future volumes/absent chapters are not invented. No demo/fixture records were imported. Baseline remains unconfirmed, with no assignments generated.

## Features and migrations

Curriculum versioning, stable chapter IDs, inferred priorities/prerequisites, manual/evidence baseline, validated daily plans, canonical Learn tasks, transactional focus/feedback, sender/reply mapping, leased scheduler runs, durable delivery reservations, configurable timezone/budgets/schedules, Settings test commands and source status.

Production adds Drizzle migrations 0000–0004, already applied. Next.js adds Supabase migrations `202610090001`–`202610090005` for its separate schema. Do not apply Next.js migrations to the existing Lovable database. Worker routes and request examples are in the production branch's `docs/AGENT_API.md`.

Next.js changes: `src/lib/learning`, `src/app/api/learning`, `src/app/api/agent/learning`, `src/features/learning-manager`, existing Skills/Dashboard/Settings/Daily Log/TaskRow/FocusProvider, store/domain time calculations, migrations and tests. Hosted UI uses existing task rows and the existing timer; demo mode does not connect to the learning agent.

## Verification

- Next.js lint, typecheck (also performed during build), production build and 60 unit/database/adapter tests passed after updating Next.js/eslint-config-next to16.3.8 and sharp/source-map-js to available security patches.
- Browser regressions: seven flows passed before the patch update; a final repeat is recorded below when completed.
- Lovable build agent reported 55 learning tests, typecheck/build passing and ten real-database safeguards passing; disposable test data was removed.
- Live login, demo dashboard/settings navigation and privacy gate checked in the browser.
- Live authenticated worker request returned401 with the newly generated local bearer until the server fingerprint is changed. Invalid credentials do not expose owner data.
- Telegram getMe returned200 for `manoj_career_compass_bot`. No outbound message or reply roundtrip has yet been claimed as verified.

Production dependency audit for the Next.js tree is recorded separately from remaining development-only lint dependency advisories; no force downgrade of Next/eslint was performed.

## Secure activation pending

1. In Lovable Settings → Secrets update the existing `AGENT_TOKEN_SHA256` to `053afaf63b9f029c4ce10f48e9cdcda527b9fdf08acfc807eabf0e58e288362d`. The connector cannot overwrite an existing secret. This digest is public-safe; its matching raw token exists only in the private Hermes `.env`.
2. The owner sends `/start` privately to https://t.me/manoj_career_compass_bot. Verify that received sender/chat, configure private allowed-user/home-channel values, and save only the sender SHA256 as server `TELEGRAM_OWNER_ID_SHA256`. Do not infer the owner from a display name. Rotate the bot token pasted into chat and save its replacement securely.
3. Sign into Career OS and confirm starting levels in Skills. Do not mark topics learned on the owner's behalf.
4. Verify authenticated context, create a real plan, reserve/send/record a real Telegram message, process its reply, re-read progress and retry the same reply to prove no duplicate minutes.
5. Start Hermes and configure a supported Windows logon/reboot supervisor; verify restart behavior. Resume paused job `46a628bb9ae9` only after the roundtrip passes.

Installed profile: `C:/Users/manoj/AppData/Local/hermes`; Hermes v0.21.3; skill `career-os-learning`; Python gate `scripts/career_os_learning_precheck.py`; pulse every five minutes reads persisted app settings. Gateway currently stopped, cron job paused. Keep automation status inactive until the remaining checks pass.
