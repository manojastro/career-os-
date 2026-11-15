// Full-chain migration rehearsal on a disposable loopback database. Never point at a real database.
// Usage: node scripts/migration-rehearsal/rehearse.mjs <repo-root> scripts/migration-rehearsal
// Optional REHEARSAL_ADMIN_URL=postgres://postgres@127.0.0.1:<port>/postgres (loopback only).
import { createRequire } from "node:module";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
const [repo, here] = process.argv.slice(2);
const postgres = createRequire(path.join(repo, "package.json"))("postgres");
const admin_url = process.env.REHEARSAL_ADMIN_URL ?? "postgres://postgres@127.0.0.1:54329/postgres";
const parsed = new URL(admin_url);
if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !["127.0.0.1", "localhost"].includes(parsed.hostname) || parsed.pathname !== "/postgres")
  throw new Error("Loopback admin postgres database only");
const name = "career_rehearsal_" + randomUUID().replaceAll("-", "");
// Apply exactly the Git blob (LF), as production received it; a Windows checkout may hold CRLF.
const read = async (p) => (await readFile(p, "utf8")).replace(/\r\n/g, "\n");
const log = [];
const say = (s) => { log.push(s); console.log(s); };
const admin = postgres(admin_url, { max: 1, onnotice: () => {} });
let db;
const digestSql = await read(path.join(here, "digest.sql"));
const digest = async () =>
  Object.fromEntries((await db.unsafe(digestSql)).map((r) => [r.k, r.n + " " + r.digest]));
const apply = async (label, file) => {
  const sql = await read(file);
  const t = Date.now();
  await db.begin((tx) => tx.unsafe(sql));
  say(`  ok  ${label} (${Date.now() - t} ms)`);
};
try {
  await admin.unsafe(`CREATE DATABASE ${name}`);
  db = postgres(admin_url.replace(/\/postgres$/, "/" + name), { max: 1, onnotice: () => {} });
  say(`database ${name} on 127.0.0.1:54329`);
  await db.unsafe(await read(path.join(here, "shim.sql")));
  await db.unsafe(`ALTER DATABASE ${name} SET search_path = "$user", public, extensions`);
  await db.end();
  db = postgres(admin_url.replace(/\/postgres$/, "/" + name), { max: 1, onnotice: () => {} });

  say("1. replay production history");
  const supa = (await readdir(path.join(repo, "supabase/migrations"))).filter((f) => f.endsWith(".sql")).sort();
  for (const f of supa) await apply("supabase/" + f, path.join(repo, "supabase/migrations", f));
  const drizzle = (n) => path.join(repo, "drizzle/migrations", n);
  const base = ["0000_learning_manager", "0001_learning_manager_commands", "0002_learning_transactions", "0003_learning_transactions_rpc", "0004_learning_timezone_delivery_reservations"];
  for (const f of base) await apply(f, drizzle(f + ".sql"));

  say("2. compare replayed schema with the production catalog fingerprint");
  const prod = Object.fromEntries(
    (await read(path.join(here, "prod-digest.txt"))).trim().split("\n").map((l) => { const [k, ...v] = l.trim().split(" "); return [k, v.join(" ")]; }),
  );
  const local = await digest();
  let parity = true;
  for (const k of Object.keys(prod)) {
    const same = prod[k] === local[k];
    parity &&= same;
    say(`  ${same ? "match   " : "MISMATCH"} ${k.padEnd(13)} prod ${prod[k].split(" ")[0].padStart(4)}  local ${(local[k] ?? "0").split(" ")[0].padStart(4)}`);
  }
  // Detailed per-object rows so any mismatch can be drilled into against production.
  const detail = digestSql.replace(/SELECT k, count\(\*\)::int n[\s\S]*$/, "SELECT k, n, h FROM objs ORDER BY k, n;");
  await writeFile(path.join(here, "local-base-objects.json"), JSON.stringify(await db.unsafe(detail), null, 0));

  const next = ["0005_telegram_control", "0006_agent_v2_focus", "0007_agent_v2_memory_documents", "0008_agent_v2_workflows", "0009_agent_worker_heartbeat"];
  say("3. rollback rehearsal: 0005-0009 in one transaction, then ROLLBACK");
  const before = JSON.stringify(local);
  await db.begin(async (tx) => {
    for (const f of next) await tx.unsafe(await read(drizzle(f + ".sql")));
    await tx.unsafe("SELECT 1");
    throw Object.assign(new Error("intentional_rollback"), { intentional: true });
  }).catch((e) => { if (!e.intentional) throw e; });
  say(`  schema after ROLLBACK identical to before: ${JSON.stringify(await digest()) === before}`);

  say("4. apply 0005-0009, one transaction each, stop on first error");
  for (const f of next) await apply(f, drizzle(f + ".sql"));

  say("5. post-checks");
  const [reg] = await db`SELECT count(*)::int total, count(*) FILTER (WHERE definition->>'writable'='true')::int writable FROM control_registry`;
  say(`  control_registry: ${reg.total} entities, ${reg.writable} writable (runbook expects 58 / 43)`);
  const rlsOff = await db`SELECT c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND NOT c.relrowsecurity ORDER BY 1`;
  const exposed = await db`SELECT c.relname, string_agg(DISTINCT g.grantee, ',') roles FROM pg_class c JOIN information_schema.role_table_grants g ON g.table_schema='public' AND g.table_name=c.relname
    WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND NOT c.relrowsecurity AND g.grantee IN ('anon','authenticated') GROUP BY 1 ORDER BY 1`;
  say(`  tables without RLS: ${rlsOff.map((r) => r.relname).join(", ") || "none"}`);
  say(`  ...of those, granted to anon/authenticated: ${exposed.map((r) => r.relname + "(" + r.roles + ")").join(", ") || "none"}`);
  const anonFns = await db`SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' f, p.prosecdef def FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND has_function_privilege('anon', p.oid, 'EXECUTE') ORDER BY 1`;
  say(`  functions anon can EXECUTE: ${anonFns.length} (${anonFns.filter((r) => r.def).length} SECURITY DEFINER)`);
  for (const r of anonFns.filter((r) => r.def)) say(`    anon -> SECURITY DEFINER ${r.f}`);
  const svcOnly = ["agent_v2_workflow_provider_finish", "agent_v2_confirm_telegram", "agent_v2_mark_source_exposure", "agent_v2_control_guard"];
  for (const f of svcOnly) {
    const [g] = await db`SELECT bool_or(has_function_privilege('authenticated', oid, 'EXECUTE')) auth, bool_or(has_function_privilege('service_role', oid, 'EXECUTE')) svc FROM pg_proc WHERE proname=${f} AND pronamespace='public'::regnamespace`;
    say(`  ${f}: authenticated=${g.auth} service_role=${g.svc}`);
  }
  const privateFns = ["agent_v2_memory_core", "agent_v2_documents_core", "agent_v2_focus_core", "agent_v2_instruction_core", "agent_v2_workflow_view", "agent_v2_block_dependents", "agent_v2_validate_step", "agent_v2_source_guard", "agent_v2_preference_valid"];
  const leaked = await db`SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname = ANY(${privateFns})
    AND (has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE') OR has_function_privilege('service_role', oid, 'EXECUTE'))`;
  say(`  private helpers callable by an API role: ${leaked.map((r) => r.proname).join(", ") || "none"}`);
  const [rw] = await db`SELECT strpos(pg_get_functiondef('public.agent_v2_workflow_finish(uuid,uuid,text,uuid)'::regprocedure),'agent_v2_memory_core(p_uid')>0 core,
    strpos(pg_get_functiondef('public.control_execute(uuid,text,text,text,jsonb,uuid)'::regprocedure),'agent_v2_source_exposures')>0 exposure`;
  say(`  0008 rewrites present: finish->*_core=${rw.core}, control_execute exposure predicate=${rw.exposure}`);

  say("6. functional smoke as a synthetic signed-in owner");
  const uid = randomUUID();
  await db`INSERT INTO auth.users(id) VALUES(${uid})`;
  await db`INSERT INTO agent_owner(singleton,user_id) VALUES(true,${uid})`;
  const r = await db.begin(async (tx) => {
    await tx`SELECT set_config('request.jwt.claim.sub',${uid},true), set_config('request.jwt.claim.role','authenticated',true)`;
    await tx.unsafe("SET LOCAL ROLE authenticated");
    const steps = [{ id: "a", kind: "task.create", depends_on: [], input: { title: "Rehearsal task" } }];
    const [p] = await tx`SELECT agent_v2_workflow(${uid}::uuid,'web:rehearsal:1',${{ action: "prepare", steps }}::jsonb,'Rehearsal',NULL,NULL) r`;
    const [c] = await tx`SELECT agent_v2_workflow_claim(${uid}::uuid,${p.r.id}::uuid) r`;
    const [f] = await tx`SELECT agent_v2_workflow_finish(${uid}::uuid,${p.r.id}::uuid,${c.r.step_id},${c.r.token}::uuid) r`;
    const [t] = await tx`SELECT count(*)::int n FROM tasks WHERE id=${f.r.steps[0].result.id}::uuid AND user_id=${uid}::uuid`;
    const [other] = await tx`SELECT count(*)::int n FROM agent_v2_workflows WHERE user_id<>${uid}::uuid`;
    return { prep: p.r.state, final: f.r.state, task: t.n, other: other.n };
  });
  say(`  single-step workflow: prepare=${r.prep} -> finish=${r.final}, canonical task rows=${r.task}`);
  for (const table of ["tasks", "agent_v2_workflows", "agent_v2_memories", "control_registry"]) {
    const seen = await db
      .begin(async (tx) => {
        await tx.unsafe("SET LOCAL ROLE anon");
        return `${(await tx.unsafe(`SELECT count(*)::int n FROM ${table}`))[0].n} rows`;
      })
      .catch((e) => (/permission denied/.test(e.message) ? "permission denied" : "ERROR " + e.message));
    say(`  anon reading ${table}: ${seen}`);
  }
  const fns = await db`SELECT p.proname FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND has_function_privilege('anon', p.oid, 'EXECUTE') ORDER BY 1`;
  say(`  anon-executable functions: ${fns.map((r) => r.proname).join(", ")}`);
  say(`RESULT: chain applied cleanly; base parity with production = ${parity}`);
} catch (e) {
  say("FAILED: " + (e.message ?? e) + (e.where ? " | " + e.where.split("\n")[0] : "") + (e.query ? "" : ""));
  process.exitCode = 1;
} finally {
  await db?.end();
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name}`).catch(() => {});
  say(`dropped ${name}`);
  await admin.end();
  await writeFile(path.join(here, "rehearsal-log.txt"), log.join("\n") + "\n");
}
