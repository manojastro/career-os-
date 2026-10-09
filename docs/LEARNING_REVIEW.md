# Daily learning extension review

## Deployment and source histories

Production is the TanStack Start app at https://career-os-manoj.lovable.app, Lovable project `79875339-208c-46e9-9a92-43b90bb04184`. Reviewed and published source: `4473f3723dc547bd6c15708948257f0e13c033a7`.

GitHub branch `codex/lovable-learning-manager` contains the exported production source, its additive Drizzle migrations and the production API contract. Environment files and binary assets are excluded. This is a separate source tree from the Next.js application on `codex/daily-learning-manager`; merging the two framework trees together is inappropriate. Connect Lovable to the production branch if automatic GitHub synchronization is desired.

The Next.js branch implements the matching learning UI, parser, transaction tests and additive Supabase migrations. Its agent owner binding is configured through `AGENT_OWNER_USER_ID`; production uses its existing `agent_owner` binding. The installed Hermes adapter targets the production contract (delivery-begin/finish and command-ack); use production docs when configuring the worker. Next.js migrations must not be reapplied to the production database, which already received the separate Drizzle migrations.

## Five-axis review

- Correctness: real PostgreSQL rollback/idempotency/ownership/time-accounting tests; scheduler stale-lease recovery; incomplete-source preservation; tests reproduced budget rounding and missing-criterion bugs before repairs.
- Readability: parsing, selection, HTTP validation, authorization, persistence and runtime client are separate modules. Existing TaskRow and focus timer are reused.
- Architecture: existing Tasks, Skills, Focus and Daily Log remain canonical. Learning sessions mirror timer rows by focus_session_id, with standalone historical sessions counted separately. Legacy deployed study tasks link to canonical tasks.
- Security: bearer digest comparison, confirmed owner scope, RLS, validated Telegram sender plus stored reply mapping; stream limits, redirect allowlist, published-document sanitization and bounded DOCX inflation. Export excludes `.env`; credentials stay outside Git.
- Performance: curriculum pagination and bounded selection; persisted rate limits; foreground/realtime refresh and a five-minute gated worker pulse. No browser timer drives scheduled work.

## Verification

Next.js: lint, typecheck, production build, 60 automated tests and 7 browser regression flows passed before dependency patch updates. Repeat verification after those updates is recorded in the final deployment report.

Lovable: 55 learning tests, typecheck and build reported passing by the build agent. Database safeguards were exercised against the real schema using disposable test data, which was removed. These checks are distinct from an actual Telegram roundtrip.

## Remaining operational requirements

The guide has 30 available chapters and ends at V-6 despite listing I–XVI. Initial limited import is clearly marked; later incomplete imports preserve the active version.

Hermes v0.21.3 is installed locally. Skill and paused job `46a628bb9ae9` are installed. Telegram getMe succeeded; owner destination and reply verification still require the owner's private /start message. Production's existing AGENT_TOKEN_SHA256 must be updated in Lovable's secure Secrets UI. A running gateway and restart/reboot supervisor remain activation steps. No complete automation claim is justified until a real saved task → outbound receipt → mapped reply → persisted progress roundtrip passes.
