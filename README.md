# Career OS

A private, information-first workspace for daily career progress. Career OS connects goals, skills, projects, tasks, focus time, networking, interview practice, applications, and evidence. The dashboard, Daily Log, and weekly review derive from the same records.

## What works

- A daily dashboard with priorities, scheduled work, goals, skill status, projects, follow-ups, interviews, applications, and recent activity.
- Task workflow from Backlog to Completed, drag-to-reorder Today, internal time blocking, and a focus timer that records actual minutes.
- Goals and milestones with progress derived from linked completions; skills with five readiness indicators; projects with linked tasks and proof.
- Networking contacts, interactions, and follow-ups; interview questions, practice history, and STAR stories; applications in list and Kanban views.
- Quick capture, global search, rich-text notes with autosave, resources, an evidence vault, daily journal, weekly review, analytics, and JSON export.
- A Copilot that answers selected commands locally and can use OpenAI, Anthropic, or Gemini when configured. Proposed writes require confirmation.

## Stack and architecture

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide, React Hook Form, Zod, dnd-kit, TipTap, Recharts, Vitest, and Playwright. Hosted persistence uses Supabase Auth, PostgreSQL with Row Level Security, and a private Storage bucket. The app deploys on Vercel without additional services.

`src/app` owns routes and server AI endpoints; `src/features` owns screens and workflows; `src/components` owns the shell and primitives; `src/lib/domain` contains shared types, seed records, and pure calculations; `src/lib/store.tsx` is the client repository; `src/ai` contains provider adapters and command proposals; `supabase/migrations` contains schema and security rules. See [SPEC.md](SPEC.md), [CAPABILITY-MAP.md](CAPABILITY-MAP.md), and [tasks/plan.md](tasks/plan.md).

The app has two deliberately separate modes:

1. **Local demo:** with no Supabase public variables, the app opens seeded sample records and stores edits in this browser's local storage. Settings can reset the demo.
2. **Hosted private workspace:** set both Supabase public variables. Users must sign in, complete or skip onboarding, and can only access their own rows through RLS. Demo records are never copied to their account.

## Run locally

Requires Node.js 22 or newer and npm.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

On macOS/Linux use `cp .env.example .env.local`. Leave the public Supabase values blank to explore demo mode at `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project and enable email authentication. Configure its Site URL and redirect URLs for your local and deployed domains. If email confirmation is enabled, change the **Confirm signup** email template link to `{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so the server can establish the cookie session.
2. Apply the SQL migrations in filename order from `supabase/migrations`. You may paste each file into the Supabase SQL editor, or link a Supabase CLI project and run `supabase db push`.
3. Copy the project URL and publishable/anon key to `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
4. Restart the dev server, then sign up at `/login` and complete or skip the five-step setup.

The migrations create normalized user-owned tables, indexes, owner checks on linked IDs, a profile signup trigger, RLS policies, and the private `career-evidence` Storage bucket. Do not put a Supabase service-role key in this app; it is not required.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL; with the anon key, enables hosted mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public browser key; access is still restricted by RLS |
| `AI_PROVIDER` | Optional: `openai`, `anthropic`, or `gemini` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Required if `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Required if `AI_PROVIDER=anthropic` |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL` | Required if `AI_PROVIDER=gemini` |

Use a model ID available to your own provider account. Provider keys and model configuration stay server-side; no `NEXT_PUBLIC_` prefix is used for them. The adapters use the official [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses), [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create), and [Gemini Generate Content API](https://ai.google.dev/api/generate-content).

AI routes require a signed-in hosted account. Without a configured provider, Copilot uses a smaller local command set and job descriptions use local skill recognition. The AI skill extraction button is available when hosted mode is enabled. No AI proposal is written without a separate confirmation click.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The Playwright suite uses a local demo workspace. Run `npm run build` before `npm run test:e2e`; the test server uses the production build. Hosted login, RLS, and Storage require a configured Supabase project and should be checked there before deploying.

## Deploy to Vercel

Import the repository as a Next.js project. Add the Supabase public variables and any AI provider variables to the Vercel project. Apply the migrations to the intended Supabase project before deployment, then add the deployed domain to Supabase Auth redirect URLs. Run the verification commands locally or in CI before promotion.

## Security and operational notes

- Every user-owned table has RLS policies; linked IDs are checked against the same owner. The browser only receives the Supabase anon key.
- Private evidence files use a user-ID folder in a private Storage bucket; links are opened with short-lived signed URLs.
- The Next.js proxy refreshes and verifies Supabase sessions; AI endpoints independently validate the signed-in user, limit inputs, validate structured outputs, and never execute proposals on the server.
- The local demo is for evaluation, not private data. It uses browser storage and has no account protection.
- Hosted screens currently load up to 1,000 rows per table. For larger workspaces, add paginated queries and use Supabase's native backup tools for complete exports.
- The basic service worker supports installation and deliberately does not cache private records for offline use.

## Current limits

The first release focuses on one-person daily work. Recurring-task expansion, task dependencies and subtasks, calendar sync, notification delivery, resume version files, full offline sync, and broad AI tool execution are represented in the schema or roadmap but do not yet have complete UI workflows. The job gap assessment uses qualitative categories and linked proof, not a numeric match score.
