"""Copy the reviewed JSON registry into migration 0005 without changing its permissions.

Run after intentional registry edits; inspect both diffs and rerun transaction tests.
Do not run against a deployed migration. Future schema changes need a new migration.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
registry = json.loads((root / 'src/lib/control/registry.json').read_text(encoding='utf-8'))
migration = root / 'drizzle/migrations/0005_telegram_control.sql'
sql = migration.read_text(encoding='utf-8')
start = sql.index('INSERT INTO public.control_registry VALUES\n')
end = sql.index(';', start) + 1
entries = ',\n'.join("('" + name + "', '" + json.dumps(definition, separators=(',', ':')).replace("'", "''") + "'::jsonb)" for name, definition in registry.items())
migration.write_text(sql[:start] + 'INSERT INTO public.control_registry VALUES\n' + entries + ';' + sql[end:], encoding='utf-8')
print(f'Reviewed registry: {len(registry)} entities, {sum(e["writable"] for e in registry.values())} writable')
