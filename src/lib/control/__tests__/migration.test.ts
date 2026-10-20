import { PGlite } from "@electric-sql/pglite";
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("rolls back the entire migration on a rehearsal and preserves existing data when committed", async () => {
  const db = new PGlite(),
    uid = "00000000-0000-4000-8000-000000000001";
  try {
    await db.exec(readFileSync(new URL("./schema-fixture.sql", import.meta.url), "utf8"));
    await db.query("INSERT INTO auth.users VALUES($1)", [uid]);
    await db.query(
      "INSERT INTO skills(user_id,name,knowledge) VALUES($1,'Legacy skill',3),($1,' legacy SKILL ',1)",
      [uid],
    );
    const before = (await db.query("SELECT id,name,knowledge FROM skills ORDER BY id")).rows;
    const learning = readFileSync(
      new URL("../../../../drizzle/migrations/0003_learning_transactions_rpc.sql", import.meta.url),
      "utf8",
    );
    for (const fn of learning.match(/create or replace function[\s\S]*?end \$\$;/gi) ?? [])
      await db.exec(fn);
    const migration = readFileSync(
      new URL("../../../../drizzle/migrations/0005_telegram_control.sql", import.meta.url),
      "utf8",
    );
    await db.exec("BEGIN");
    await db.exec(migration);
    await db.exec("ROLLBACK");
    expect(
      (await db.query<{ name: null }>("SELECT to_regclass('public.control_registry') name")).rows[0]
        .name,
    ).toBeNull();
    expect((await db.query("SELECT id,name,knowledge FROM skills ORDER BY id")).rows).toEqual(
      before,
    );
    await db.exec("BEGIN");
    await db.exec(migration);
    await db.exec("COMMIT");
    expect((await db.query("SELECT id,name,knowledge FROM skills ORDER BY id")).rows).toEqual(
      before,
    );
    await expect(
      db.query("INSERT INTO skills(user_id,name) VALUES($1,'LEGACY SKILL')", [uid]),
    ).rejects.toThrow("skill_name_exists");
  } finally {
    await db.close();
  }
}, 30000);
