// Opt-in, independent PostgreSQL sessions. Requires a NEW disposable local fixture database.
// Never point this script at an application database. PGlite is deliberately not used here.
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const url = new URL(process.env.FOCUS_TEST_DATABASE_URL ?? "http://unconfigured.invalid");
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !/^\/career_focus_test_[a-z0-9_]+$/.test(url.pathname)
)
  throw new Error("A new disposable local career_focus_test_* database is required");
const sql = postgres(url.toString(), { max: 1 }),
  actor = postgres(url.toString(), { max: 1 }),
  locker = postgres(url.toString(), { max: 1 });
const uid = "00000000-0000-4000-8000-000000000001";
const read = (p) => readFile(new URL(p, import.meta.url), "utf8");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let seq = 0;
const call = (input) =>
  actor`SELECT agent_v2_focus(${uid},${"web:contention:" + ++seq},${actor.json(input)}) r`;
try {
  await sql.unsafe(
    (await read("../src/lib/control/__tests__/schema-fixture.sql")).replace(
      /CREATE ROLE (anon|authenticated|service_role);/g,
      (_, role) =>
        `DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    ),
  );
  await sql.unsafe(
    `CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid'; CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql AS 'SELECT nullif(current_setting(''request.jwt.claim.role'',true),'''')';`,
  );
  for (const connection of [sql, actor, locker])
    await connection`SELECT set_config('request.jwt.claim.sub',${uid},false),set_config('request.jwt.claim.role','service_role',false)`;
  await sql`INSERT INTO auth.users VALUES(${uid})`;
  await sql.unsafe(
    "CREATE UNIQUE INDEX learning_session_focus_unique ON learning_sessions(focus_session_id) WHERE focus_session_id IS NOT NULL; CREATE UNIQUE INDEX telegram_message_map_unique ON telegram_message_map(user_id,chat_ref,message_id,direction) WHERE message_id <> '';",
  );
  for (const fn of (await read("../drizzle/migrations/0003_learning_transactions_rpc.sql")).match(
    /create or replace function[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await sql.unsafe(fn);
  for (const fn of (
    await read("../drizzle/migrations/0004_learning_timezone_delivery_reservations.sql")
  ).match(
    /create or replace function public\.learning_(?:begin|finish)_delivery[\s\S]*?end \$\$;/gi,
  ) ?? [])
    await sql.unsafe(fn);
  await sql.unsafe(await read("../drizzle/migrations/0005_telegram_control.sql"));
  await sql.unsafe(
    process.argv.includes("--baseline")
      ? execFileSync("git", ["show", "ff2db21:drizzle/migrations/0006_agent_v2_focus.sql"], {
          encoding: "utf8",
        })
      : await read("../drizzle/migrations/0006_agent_v2_focus.sql"),
  );
  const task = (
    await sql`INSERT INTO tasks(user_id,title) VALUES(${uid},'Independent lock fixture') RETURNING id`
  )[0].id;
  const pid = (await actor`SELECT pg_backend_pid() pid`)[0].pid;
  assert.equal(
    new Set([
      pid,
      (await sql`SELECT pg_backend_pid() pid`)[0].pid,
      (await locker`SELECT pg_backend_pid() pid`)[0].pid,
    ]).size,
    3,
    "independent PostgreSQL backends are required",
  );
  const interval = (await call({ action: "start", task_id: task }))[0].r.session.id;
  await call({ action: "pause", session_id: interval });
  async function blocked(lock, input, delay = 250) {
    let operation, released;
    await locker.begin(async (tx) => {
      await lock(tx);
      operation = call(input).execute();
      // Observe an actual independently blocked backend, not merely a scheduled JS promise.
      let blocked = false;
      for (let n = 0; n < 100; n++) {
        if (
          (await sql`SELECT wait_event_type FROM pg_stat_activity WHERE pid=${pid}`)[0]
            ?.wait_event_type === "Lock"
        ) {
          blocked = true;
          break;
        }
        await wait(20);
      }
      assert.ok(blocked, "actor must actually block on a PostgreSQL lock");
      await wait(delay);
      released = (await tx`SELECT clock_timestamp() t`)[0].t;
    });
    return { result: (await operation)[0].r, released };
  }
  const owner = await blocked(
    (tx) => tx`SELECT pg_advisory_xact_lock(hashtextextended(${uid} || ':learning',0))`,
    { action: "resume", session_id: interval },
  );
  assert.ok(
    Date.parse(owner.result.session.running_since) >= owner.released.getTime(),
    "resume must exclude owner-lock wait",
  );
  const taskLock = await blocked((tx) => tx`SELECT id FROM tasks WHERE id=${task} FOR UPDATE`, {
    action: "pause",
    session_id: interval,
  });
  assert.ok(
    Date.parse(taskLock.result.session.paused_at) >= taskLock.released.getTime(),
    "pause must include running task-row-lock wait",
  );
  assert.ok(taskLock.result.session.elapsed_ms >= 250);
  const rowLock = await blocked(
    (tx) => tx`SELECT id FROM agent_v2_focus_intervals WHERE id=${interval} FOR UPDATE`,
    { action: "resume", session_id: interval },
  );
  assert.ok(
    Date.parse(rowLock.result.session.running_since) >= rowLock.released.getTime(),
    "resume must exclude interval-row-lock wait",
  );
  await call({ action: "pause", session_id: interval });
  await sql`UPDATE agent_v2_focus_intervals SET elapsed_ms=120000,started_at=clock_timestamp()-interval '2 minutes' WHERE id=${interval}`;
  const finished = await blocked(
    (tx) => tx`SELECT id FROM tasks WHERE id=${task} FOR UPDATE`,
    { action: "finish", session_id: interval, complete: false },
    process.argv.includes("--long-wait") ? 61_200 : 250,
  );
  assert.ok(Date.parse(finished.result.session.finished_at) >= finished.released.getTime());
  assert.equal(
    (await sql`SELECT duration_minutes FROM focus_sessions WHERE id=${interval}`)[0]
      .duration_minutes,
    2,
  );
  console.log(
    "PASS: independent owner/interval/task locks; paused waits excluded, running waits counted, one canonical ledger" +
      (process.argv.includes("--long-wait")
        ? "; >60s transaction wait accepted"
        : "; >60s validation requires --long-wait"),
  );
} finally {
  await Promise.all([sql.end(), actor.end(), locker.end()]);
}
