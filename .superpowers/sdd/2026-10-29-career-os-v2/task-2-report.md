# Task 2: authenticated HTTP and dependency security repair

Base: `a107b7c013166c5bf823f0ce85a13f1b61c4bff0`. Branch: `codex/career-os-agent-v2`. Completed local repair; no production-readiness claim.

## Scope and boundaries

Read repository AGENTS.md, Task 2 brief, plan Global Constraints and design security boundaries. Used security-best-practices, test-driven-development, incremental-implementation and verification-before-completion skills. This is the established TanStack/Vite tree; `node_modules/next/dist/docs` is absent and no Next.js code was authored. No database/schema, identity, provider/model, plugin hook, schedule, credential or production configuration changes. No subagents, messages to external services, live installer apply, migration, activation, deployment, push or PR edits. Registry metadata/audit/downloads are public read operations. Existing dependency backups and protected profiles were not removed or changed.

Transport inventory (`rg -n 'urlopen|Request\(|requests\.|fetch\(|Authorization|Bearer' scripts`):

- `install_career_control.py`: default urllib could forward authentication after a redirect. Now shared HTTPS-only helper; original false-until-400/invalid_request preflight and default dry run preserved.
- `check_career_control_health.py`: default urllib used for Career OS, Telegram token-in-path and optional provider fixture. All use bounded, no-redirect helper; failures remain unavailable/empty, with no exception details printed. Configured Career OS origin is validated before route construction. No live inference run.
- `hermes-career-control/__init__.py`: already rejects redirects and limits responses. Unchanged, including owner/private-chat identity and hooks.
- `hermes-learning/client.mjs`, `telegram-send.mjs`: already use `redirect: error` and bounded timeouts. Unchanged. `precheck.py` delegates to that client.
- Browser test scripts contain no affected authenticated production transport.

`career_http.request` requires a strict HTTPS origin (no path, trailing slash, userinfo, query/fragment, whitespace/control characters or backslash), origin-relative path and control-free bearer, timeout at most30 seconds, response at most1,048,576 bytes on both success/error. No insecure production flag. Tests exercise `NoRedirect` directly with fixture HTTP loopback servers, separately from public HTTPS validation.

## TDD evidence

1. Wrote `scripts/test_career_http.py` before helper. Ran `& 'C:/Users/manoj/AppData/Local/Programs/Python/Python313/python.exe' scripts/test_career_http.py`: exit1, ten redirect subcase failures plus two missing-module errors. Both local servers observed fixture-only bearer forwarding under default urllib for GET301/302/303/307/308, absolute and relative destinations.
2. Added helper: same initial tests passed. Expanded to GET and actual installer-style POST for every redirect code/destination; target receives zero requests/authentication, source receives one request, redirect is explicitly rejected. Local server consumes POST bytes to avoid Windows connection reset noise.
3. Separately reproduced legacy handler with the same expanded fixture by assigning `career_http.NoRedirect = urllib.request.HTTPRedirectHandler` in a standalone Python process and running `RedirectTests`: exit1,15 observed bearer-forwarding failures. The final regression additionally asserts rejection at source, including POST307/308 cases that default urllib may already refuse. No real credentials used.
4. Added invalid origins/credentials/paths/timeouts, bounded success/error bodies, status/non-JSON contracts and installer temp-profile dry-run/preflight checks. Final five Python test methods pass (redirect method contains20 combinations). Fixtures prove exact400/invalid_request preflight true,200 false,406 false, redirect false, unchanged config/cron and no state directory.
5. Added two agent wire-schema contract tests for string-key metadata/result records, strict unknown-key/owner-field rejection, existing status/priority enums,80-character workflow and1440-minute limits, verified-source requirement. They passed before the API migration (Zod4 retains runtime behavior), while installed TypeScript failed at precisely five one-argument z.record sites (`TS2554`). Migrated only those sites to explicit `z.record(z.string(), z.unknown())`; compiler then passed. Validation constraints were not loosened.

## Dependency evidence

Public registry command:

```powershell
node --input-type=module -e "for (const [name,version] of [['vite','8.1.6'],['vitest','4.1.12'],['launch-editor','2.14.2'],['undici','7.30.1'],['zod','4.6.6']]) { const r=await fetch('https://registry.npmjs.org/'+name+'/'+version); const d=await r.json(); if(!r.ok||d.version!==version)process.exitCode=1; console.log(name,d.version,r.status); }"
```

All five returned exact requested version and HTTP200. Ran `npx --yes bun@1.4.3 --version`:1.4.3. Ran `npx --yes bun@1.4.3 install --ignore-scripts` after targeted package pins/overrides: exit0,14 packages installed. Initial audit still identified nested TanStack Zod4.6.5 (`GHSA-mrhx-c7xc-m3w5`); added Zod4.6.6 override and reran the same install: exit0. Vite/Vitest root pins and launch-editor/undici/Zod overrides cover advisory copies. Lock changes are those dependencies, matching Vitest packages and resolver deduplication of existing compatible picomatch entries; no framework/provider upgrades or broad update command.

## Final verification

All commands from this worktree:

| Exact command | Outcome |
| --- | --- |
| `& 'C:/Users/manoj/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe' scripts/test_career_http.py` | exit0;5 test methods,20 redirect combinations, fixture dry-run profiles only |
| `& 'C:/Users/manoj/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe' scripts/test_hermes_career_control.py` | exit0;11 existing SDK tests |
| `node node_modules/typescript/bin/tsc --noEmit` | exit0 after five record API migrations |
| `node node_modules/vitest/vitest.mjs run` | exit0;19 files,133 tests |
| `node node_modules/vitest/vitest.mjs run src/lib/agent-schema.test.ts` | exit0;2 tests, rerun after formatting |
| `npx --yes bun@1.4.3 audit` | exit0; no vulnerabilities,577 packages |
| `node node_modules/vite/bin/vite.js build` | exit0; client,SSR,Nitro Cloudflare build; existing chunk-size,tsconfig-paths and inlineDynamicImports warnings |
| `node node_modules/eslint/bin/eslint.js src/lib/agent-schema.ts src/lib/agent-schema.test.ts src/lib/control/service.server.ts` | initial exit1; legacy schema formatting errors plus new-test formatting, fixed new-test formatting only |
| `node node_modules/eslint/bin/eslint.js src/lib/agent-schema.test.ts src/lib/control/service.server.ts` | exit0 |
| `node node_modules/eslint/bin/eslint.js src/lib/agent-schema.ts --rule 'prettier/prettier: off'` | exit0; semantic rules retained |
| `git diff --check` | exit0; Windows LF/CRLF informational warnings only |

Remaining lint limitation: unmodified legacy formatting in `src/lib/agent-schema.ts` produces13 Prettier errors. Confirmed by `ESLint.lintText(execFileSync('git',['show','a107b7c013166c5bf823f0ce85a13f1b61c4bff0:src/lib/agent-schema.ts']))`, which reports13 baseline errors, all prettier/prettier. Avoided unrelated whole-file reformat. Other targeted files are clean. No remaining known advisory in the actual Bun audit. No live preflight or provider call performed: deployed route readiness remains a rollout gate.
