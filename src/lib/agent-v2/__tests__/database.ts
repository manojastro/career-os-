import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const uid = "00000000-0000-4000-8000-000000000001";
export const other = "00000000-0000-4000-8000-000000000002";
export async function createV2Database(
  migrations = [
    "0006_agent_v2_focus.sql",
    "0007_agent_v2_memory_documents.sql",
    "0008_agent_v2_workflows.sql",
  ],
) {
  const db = new PGlite();
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  await db.exec(read("../../control/__tests__/schema-fixture.sql"));
  await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
    'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS
    'SELECT nullif(current_setting(''request.jwt.claim.role'',true),'''')';
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    CREATE UNIQUE INDEX learning_session_focus_unique ON learning_sessions(focus_session_id) WHERE focus_session_id IS NOT NULL;
    CREATE UNIQUE INDEX telegram_message_map_unique ON telegram_message_map(user_id,chat_ref,message_id,direction) WHERE message_id <> '';`);
  await db.query("INSERT INTO auth.users VALUES($1),($2)", [uid, other]);
  await db.query("INSERT INTO agent_owner(singleton,user_id) VALUES(true,$1)", [uid]);
  for (const fn of read("../../../../drizzle/migrations/0003_learning_transactions_rpc.sql").match(
    /create or replace function[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await db.exec(fn);
  for (const fn of read(
    "../../../../drizzle/migrations/0004_learning_timezone_delivery_reservations.sql",
  ).match(
    /create or replace function public\.learning_(?:begin|finish)_delivery[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await db.exec(fn);
  await db.exec(read("../../../../drizzle/migrations/0005_telegram_control.sql"));
  for (const migration of migrations)
    await db.exec(read("../../../../drizzle/migrations/" + migration));
  return db;
}
export async function asRole(
  db: PGlite,
  role: "authenticated" | "anon" | "service_role",
  owner = uid,
) {
  await db.exec("RESET ROLE");
  await db.query(
    "SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [role === "anon" ? "" : owner, role],
  );
  await db.exec(`SET ROLE ${role}`);
}
