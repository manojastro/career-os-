# Career OS specification

## Objective

Build a private, information-first web app for daily career execution. The morning dashboard must show priorities, schedules, progress, follow-ups, and application status. Completing work should feed the daily log and weekly review without another entry.

## Stack

Next.js App Router, TypeScript, React, Tailwind CSS, Supabase Auth/PostgreSQL/Storage, Lucide, Zod, Vitest, Playwright. AI calls stay on the server behind a provider interface.

## Commands

`npm run dev`; `npm run lint`; `npm run typecheck`; `npm run test`; `npm run build`; `npm run test:e2e`.

## Structure

`src/app` routes and API; `src/components` shell and primitives; `src/features` workflows; `src/lib` persistence and domain logic; `src/ai` provider adapters; `supabase/migrations` schema and policies; `tests` domain and browser tests.

## Code style

Use strict TypeScript, named domain types, small React components, input validation at write boundaries, and explicit error states. Example: `const remaining = Math.max(0, task.estimated_minutes - task.actual_minutes);`

## Test strategy

Unit test derived progress, review metrics, and capture classification. Browser test critical create/update flows. Run lint, typecheck, tests, and build at phase checkpoints.

## Boundaries

- Always: validate input, scope hosted rows to the signed-in user, log important changes, and keep secrets server-side.
- Ask first: external deployment or actions that require user-owned credentials.
- Never: commit credentials, scrape LinkedIn, let AI perform bulk/destructive writes without confirmation.

## Success criteria

- User can create and complete tasks, schedule them, and record focus time.
- User can manage goals, milestones, skills, projects, contacts, interview practice, and job stages.
- Dashboard, log, search, and weekly review derive from the same records.
- Supabase data is isolated by auth user; demo data is separate and local.
- Core pages work at desktop and mobile widths, with keyboard access.

## Architecture decisions

- A typed client repository gives responsive single-user interactions; Supabase RLS remains the authorization boundary.
- The demo repository uses browser storage and never syncs into a production account automatically.
- Domain calculations are pure functions so dashboard and review share one definition.
- AI returns proposals; the user confirms writes in the UI.
