# Hermes and Career OS security review

## Enforced controls

- Existing constant-time bearer fingerprint verification; no raw bearer in source or frontend configuration.
- Trusted adapter sender/chat/message provenance plus a server-bound owner. Context is not accepted from model arguments.
- Reviewed entity/field/enum registry, parameterized values, quoted allowlisted SQL identifiers, owned FK/polymorphic links and service-only privileged RPCs.
- Transactional writes, stable receipts, exact request-payload conflict rejection, owner locks and durable history.
- Ten-minute single-use approvals, raw human confirmation and stale-related-row validation.
- Conflict-aware undo and browser expected-revision saves. Browser pending-write storage contains request IDs keyed by hashes. Separately, note content/title recovery copies contain private career text in tab-scoped sessionStorage for up to 24 hours; they are scoped to the owner/note and cleared after successful save or explicit discard. This is local recovery, not encrypted backup or full offline synchronization.
- Private owner storage prefixes, reviewed MIME/signature checks, bounded DOCX expansion, 6 MB uploads, no arbitrary local file paths, short-lived download links and bounded exports.
- CSV formula-like string cells are prefixed as literal text; quoting alone is not treated as spreadsheet execution protection.
- Prompt instructions label retrieved data as untrusted; the real security boundary is enforced tool/API permission, not a claim of perfect model obedience.
- Telegram sessions deny unrelated terminal/files/cron/provider tools. HTTPS origin configuration is protected; redirects are refused; request/response sizes and timeouts are bounded.
- Core AI endpoints authenticate, use persistent server-selected hourly/daily budgets, bound body/output sizes, time out and return safe provider errors. Existing providers are retained.

## Evidence and limits

Local protocol, PostgreSQL, service, file-byte, CSV, client retry and installed Hermes SDK fixture tests provide executable evidence. Live two-user RLS/auth lifecycle and private upload/download tests remain **BLOCKED** by the unavailable approved isolated account/environment. No complete production security clearance is asserted.

Historical credentials were pasted in chat. Replacement OpenRouter setup was verified; Telegram token rotation is not established by getMe. Never copy those values into a report. Keep `.env`, backups and runtime configuration outside Git; use the secure configuration interface for rotation. No new key is required merely to run local tests.

Uploads are not malware scanning, full content validation or guaranteed document processing. Literal rich-text fragment operations preserve existing markup but do not make all stored business text trustworthy. Signed URLs remain usable by a holder until expiry. An upload may leave an orphan private object if metadata persistence fails; re-read metadata and clean only the exact unreferenced owner object after review.

Exports are private sensitive account data. Audit/receipt retention and expired export-object cleanup need an explicit operational retention policy before any destructive cleanup job is enabled. Permanent seen-message IDs protect replay across plugin restarts; no unsanctioned cleanup or cron job is created.

Deployment, migrations, plugin activation, real external actions and learning activation are not performed by this review branch. Production backup verification and recovery tests are required before rollout.

## Learning feedback provenance

Ingress persists the actual Telegram reply-to ID alongside the raw owner text. Mapped replies require exactly one owned, sent outbound assignment mapping; ambiguous or absent mappings are rejected. General commands require an explicit assignment reference or an owner-stated date and use agent provenance. The model cannot invent completion, additional time, minutes or replacement dates; unclear language requires clarification. Existing learning SQL remains the only mutation path. Evidence-required tasks still require actual linked evidence.

## Dependency review

Targeted lock updates patched brace-expansion (both supported major lines), js-yaml, nanoid, source-map-js, shell-quote and seroval. Vitest moved to 4.1.11, removing the vulnerable older test-worker path. A scoped esbuild override updates the older Drizzle loader dependency without changing the application framework. Clean frozen installation, CLI load, tests and build are verified independently. References: [Seroval advisory](https://github.com/advisories/GHSA-p6vx-979v-rg4c), [test-worker advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [shell-quote advisory](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). Bun audit reported no advisories after repair. The live app still needs this reviewed dependency release.
