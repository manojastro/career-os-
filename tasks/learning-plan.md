# Daily AI Learning Manager integration

## Target and reuse

The user confirmed the deployed Lovable project is the deployment target. GitHub main currently contains the separate Next.js source; the deployed application uses TanStack Start. Keep both histories, preserve the existing frontend and Copilot, and record the deployed extension's source and migration artifacts in this repository. Do not claim the Next.js application is what Lovable serves.

Reuse Skills/skill_topics, tasks, FocusProvider/TaskRow, learning_sessions, daily_logs, notifications and existing agent_owner authentication. Reconcile legacy study_tasks through explicit links rather than copying demo data or deleting user progress. Add only curriculum, prerequisites, recommendations, feedback, execution, Telegram mapping and preference data.

## Ordered slices and acceptance criteria

1. **Curriculum import:** bounded Google Docs reads or validated DOCX; stable chapter/topic keys; version hash; repeat import creates no duplicates; failed/partial updates retain the last good version. Validate the supplied guide through actual document access.
2. **Learning APIs:** existing owner-bound agent bearer auth, rate limits and strict bodies; persisted idempotency; eligibility and prerequisite validation; transactional completion and time accounting. Test unauthorized/cross-user and retry behavior.
3. **Existing UI integration:** compact Dashboard/Today learning section, Skills baseline and source metadata, Settings controls; background refresh; existing focus and daily log use the same ledger. Test existing user flows.
4. **Hermes adapter:** narrow API CLI and installable skill; use supported durable Hermes cron with bounded catch-up; secrets outside browser/repository; replies and delivery receipts explicitly recorded. Test adapter URL/auth/redaction/restart identities.
5. **Review/deploy:** read code and migration diff; run lint/types/unit/E2E/build; deploy reviewed app; verify public endpoint behavior; preserve source artifacts on GitHub. Record real external checks separately from mocked tests.

## Known constraints

- Google Docs API and text export both end at V-6 although the table of contents lists I–XVI. Import only present content, display incomplete-source status, and never invent missing chapters. User supplied the same link again on October 9.
- Local Hermes v0.21.3 was found; a paused cron job and skill are installed. Gateway startup and reboot supervision remain pending secure activation.
- Telegram bot token validates; owner destination, app fingerprint configuration and roundtrip remain pending. A successful scheduled plan, delivery, authenticated reply and persisted completion are mandatory before marking the autonomous loop verified.
- Source code can be deployed while automation remains explicitly inactive pending secure runtime configuration.

## Verification record

Update docs/LEARNING_DEPLOYMENT.md with commands, results, app commit, database migration and external checks. Never store tokens or private guide content in Git.
