# Owner permissions

## Two authorization boundaries

Telegram uses the protected agent bearer digest, the existing bound `agent_owner`, a positive numeric private sender equal to its chat, the saved SHA-256 sender fingerprint and a real recent message ID. A model cannot supply an alternative identity. Group, bot, internal and non-owner messages are rejected before tools run. Message context expires after 30 minutes.

Website writes authenticate through Supabase. `workspace_write` derives `auth.uid()` on the server, looks up only reviewed entities, applies exact owner predicates and reuses the domain executor. It does not accept an arbitrary user ID, SQL statement or unrestricted function name. Anonymous and service-role execution of this browser facade are revoked; the privileged inner executor remains service-only. Direct historical settings panels remain protected by their existing RLS.

## Permitted data and restrictions

The generated [matrix](HERMES-API-COVERAGE.md) enumerates 58 entities and every field. Forty-three have some permitted write operation; that does not mean unrestricted CRUD. Profiles are update-only. Commands can be created/cancelled only under their restricted workflow/payload contract. Curriculum, focus/learning ledgers, run history and delivery maps are read-only through generic controls. Baselines require explicit manual ratings; evidence-derived baseline rows are protected. Canonical consolidated task progress must use the canonical task/learning path.

IDs, owner fields, source/provenance, computed counters and internal timestamps are not model-editable. Foreign keys and polymorphic links must reference the same owner. Dependency cycles and missing prerequisites/evidence prevent unsupported completion. No automatically inferred mastery is written.

## Confirmation

Server approval is required for Telegram deletes, multiple operations, protected preference changes and substantial text replacement. Approvals bind owner, chat, exact operations and expected row snapshots, expire in ten minutes, and are single-use. A model-suggested confirmation or text embedded in a file cannot authorize it. Related changes are previewed and stale/new effects reject confirmation. Undo has its own confirmation and conflict preflight.

Website delete/restore controls require an explicit confirmation dialog. Restore affects one owned record and validates current relationships; it is not equivalent to undoing a whole cascade. Demo deletion deliberately refuses required children until they are removed first; private hosted cascades use the reviewed SQL rules. Focus history is retained.

These permissions never authorize shell execution, secret reads, provider changes, arbitrary external contacts, job submissions, production publishing, migration execution or learning activation. Those retain separate owner approval gates.
