# Career OS / Career Compass

The published application uses TanStack Start, Vite, React and Supabase, with a separate Windows Hermes Telegram gateway. Production: [Career OS](https://career-os-manoj.lovable.app).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- Git synchronization depends on the actual project/branch connection. A push to this review branch does not confirm publication.

## Development

Use Node.js 24 and Bun 1.4.3, the version pinned in package.json. Keep bun.lock as the dependency lock. Configure local environment values securely; never commit .env files.

```sh
git clone --branch codex/full-telegram-control https://github.com/manojastro/career-os-.git
cd career-os-
bun install --frozen-lockfile --ignore-scripts
bun run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Review and deployment

This branch extends the existing TanStack source from `codex/lovable-learning-manager`. Other repository branches contain a separate Next.js application; do not combine their migrations or deployments.

Run `bun run test`, `bunx tsc --noEmit` and `bun run build`. Local browser regression scripts under scripts/test_career_* use disposable localhost fixtures. Hermes plugin tests require the existing Hermes Python SDK environment.

Start with [production readiness](docs/CAREER-OS-PRODUCTION-READINESS.md), [functional repair report](docs/CAREER-OS-FUNCTIONAL-REPAIR-REPORT.md), [deployment runbook](docs/CAREER-OS-DEPLOYMENT-RUNBOOK.md) and [rollback plan](docs/CAREER-OS-ROLLBACK-PLAN.md). Review [Telegram coverage](docs/HERMES-API-COVERAGE.md) and [security](docs/HERMES-SECURITY.md).

Production migration, publication and plugin activation need explicit owner approval. Scheduled learning remains disabled until separately approved after a genuine baseline and live feedback-loop verification.

