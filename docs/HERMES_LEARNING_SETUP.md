# Hermes learning setup

## What runs where

The deployed Career OS application runs on Lovable and stores signed-in data in PostgreSQL. Hermes is a separate installed gateway process. An agent API in Lovable does not install or run Hermes.

The repository's Next.js app and the deployed TanStack Start port have separate source histories. Deployment artifacts and route contracts are recorded alongside the shared Hermes adapter; do not assume `npm run build` for Next.js verifies the Lovable build.

## Secure configuration

This Windows computer has Hermes v0.21.3 under `C:/Users/manoj/AppData/Local/hermes`. Its version, supported cron flags and gateway status were checked. The gateway was stopped and no scheduled jobs existed before setup. Job `46a628bb9ae9` now exists, paused, with the installed `career-os-learning` skill and five-minute precheck.

Use the Lovable editor's secure secrets form to configure the app's agent bearer-token hash. Configure the matching raw token only on the Hermes host. Preserve the app's existing owner binding. Never put the raw token in frontend env variables, a source file, a cron prompt or a URL.

Node 22+ can load a protected environment file:

```
node --env-file=/private/career-os/runtime.env /path/to/client.mjs context
```

The environment file contains `CAREER_OS_BASE_URL=https://career-os-manoj.lovable.app` and `CAREER_OS_AGENT_TOKEN` set by the operator. Keep it outside the repository with owner-only permissions. The adapter accepts HTTPS origins, refuses redirects, bounds payloads, and prints no credentials on failure.

Install `scripts/hermes-learning/SKILL.md` and `client.mjs` in the gateway profile's skill directory. Copy the deployed learning API contract into that directory. Ensure normal CLI calls work before scheduling.

## Supported durable scheduling

Hermes supports persisted recurring cron jobs, attached skills, pre-check scripts, a gateway service and execution history. See the [official cron documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron/).

The integration should use one recurring pulse plus a pre-check that reads the app's persisted schedule and wakes Hermes only for due work. This lets changed settings take effect without manually recreating three jobs. Preserve one durable job name and record its ID; list/edit existing jobs before creating one. Use a server-local occurrence key so IST midnight and host timezone cannot change retry identities.

The installed precheck is a Python script under this profile's `scripts/`. It invokes Node with the protected `.env` file without printing credentials. A last line `{"wakeAgent": false}` skips the model invocation. The pulse reads persisted settings for the default 10:30 sync, 11:00 plan, 20:30 check-in in Asia/Kolkata, or the configured IANA timezone. Bound catch-up to today's accepted window and use the app's unique constraints for side effects.

Create the job paused until the initial app/Telegram tests succeed. Inspect installed support for `--script`, `--skill`, `--paused` and `--workdir` before using those flags. Use `hermes gateway install` for a user service or the documented boot service for the actual host. Verify restart behavior and execution history; do not rely on a terminal session remaining open.

## Telegram activation

Connect Telegram through Hermes's secure provider setup. Establish the real Telegram sender and destination using a received gateway message, bind it through the app's authenticated mapping controls, and test outbound delivery and replies. Do not collect bot tokens in chat. Do not run a second getUpdates consumer alongside the existing gateway.

Keep automation paused until one real roundtrip passes: eligible topic → persisted task → Telegram receipt → reply from the mapped sender → persisted completion/partial result → Daily Log/progress → next recommendation. Test a retry of the same reply and a gateway restart. A delivery-only test does not verify replies.

## Current external blockers

- Runtime installed; gateway remains stopped and job paused pending activation. A Windows reboot/logon supervisor is not yet configured or verified.
- Telegram bot getMe succeeded for `manoj_career_compass_bot`; one recent private /start established the local sender/destination. Server fingerprint and actual learning roundtrip remain activation checks. The token pasted in chat should be rotated afterward using secure configuration.
- Local bearer token is stored privately. The existing server AGENT_TOKEN_SHA256 secret requires updating in Lovable's Secrets UI; the connector cannot overwrite it. Set TELEGRAM_OWNER_ID_SHA256 after the real owner sender ID is established.
- Complete guide: linked document currently ends at V-6, despite listing later volumes.

These are operational checks, independent of mocked adapter tests. Keep the UI status truthful until they pass.
