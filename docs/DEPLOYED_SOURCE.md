# Production source export

This branch preserves the text source of Lovable project `79875339-208c-46e9-9a92-43b90bb04184` at reviewed commit `4473f3723dc547bd6c15708948257f0e13c033a7` (October 9, 2026), published to https://career-os-manoj.lovable.app.

This app uses TanStack Start. GitHub main and codex/daily-learning-manager use Next.js. Keep these framework source histories separate. This branch is not an instruction to migrate or rebuild the deployed app.

All 183 text files were exported using the Lovable connector. `.env` was deliberately excluded; one binary favicon was omitted. Added files are the Hermes adapter/skill/precheck, safe environment template and deployment documentation. Existing private credentials, customer records and personal guide text were not exported. Restore binary assets from the Lovable project if recreating hosting independently.

The Supabase migrations preserve the original application schema. Drizzle migrations 0000–0004 add the learning extension and transactional RPCs; they have already been applied on the current production database. Do not reapply them to it. Follow docs/AGENT_API.md for the exact worker contract.

Verification reported on the source: 55 learning tests, typecheck and production build passed. Production login, demo navigation/settings and unauthorized API behavior were checked separately. A successful outbound Telegram message plus mapped learner reply remains unverified until secure setup and baseline are completed.
