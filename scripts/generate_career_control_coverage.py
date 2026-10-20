"""Generate permission/field documentation from the reviewed registry, never production rows."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
registry=json.loads((root/'src/lib/control/registry.json').read_text(encoding='utf-8'))
lines=['# Hermes API coverage','', 'Generated from `src/lib/control/registry.json`. Run `python scripts/generate_career_control_coverage.py` after reviewed schema changes. This file documents permissions, not a successful production deployment.','',f'**{len(registry)} entities; {sum(e["writable"] for e in registry.values())} with permitted writes; {sum(not e["writable"] for e in registry.values())} read-only.** All new production capabilities: **IMPLEMENTED BUT NOT LIVE TESTED**.','',
'Every entity supports owner-scoped query/search/export. SQL fixture tests read all entities and exercise each permitted business create/update/delete/undo; domain workflows have additional named tests. Registry coverage does not certify every UI or live Telegram journey.','',
'## Operation / UI / intent matrix','', '| Entity | Owner field | UI / feature | Telegram intent | Permitted operations | Confirmation | Local evidence | Live status |','| --- | --- | --- | --- | --- | --- | --- | --- |']
core=(root/'src/lib/domain/types.ts').read_text(encoding='utf-8')
names=set(re.findall(r'\b([a-z_]+):\s*(?:RowBase|Task|Goal|Milestone|Skill|Project|Contact|NetworkInteraction|Interview|Job|FocusSession|Note|Resource|Evidence|InboxItem|Activity|DailyLog|PlannerBlock|LearningSession|AppNotification)',core))
always={'profiles','career_preferences','learning_preferences','agent_commands'}
for name,e in registry.items():
 ops=', '.join(e['operations']) or 'read only / dedicated workflow'
 ui='Manage records / dedicated screen' if name in names and e['writable'] else 'Dedicated screen or agent/history read'
 approval='all writes' if name in always else 'delete; bulk; substantial text; flagged settings' if e['writable'] else 'dedicated workflow only'
 lines.append(f'| `{name}` | `{e["owner"]}` | {ui} | Read/search {name.replace("_"," ")}; supported writes below | {ops} | {approval} | PostgreSQL registry smoke; specialized tests where noted | IMPLEMENTED BUT NOT LIVE TESTED |')
lines+=['','## Validation and boundaries','',
'`POST /api/agent/control` uses bearer authentication plus trusted Telegram owner/private-chat/message provenance. Ordinary browser mutations use authenticated `workspace_write` with server-derived `auth.uid()`, durable request identity, expected revision and the same domain executor. Browser restore is separate from Telegram undo; it restores one owned soft-deleted record, and does not replay an entire deleted parent graph. Internal learning rows remain read-only.','',
'Telegram compound writes: 1–50 operations, at most 500 journaled preview effects; list pages 1–200; stable ID tie ordering; message trust 30 minutes; saved list references 24 hours; approvals 10 minutes; attachment 6,000,000 bytes; export 20,000,000 bytes; signed URLs 300 seconds; persisted control quota 240/hour. Explicit task time is 1–600 minutes per control operation.','',
'Dates are actual YYYY-MM-DD calendar dates; timestamps require offsets; settings times are HH:mm; timezone names are validated through Intl/PostgreSQL. Numeric ranges and enums are enforced by protocol plus actual database constraints. URLs permit http/https without userinfo, or authorized `storage:` references for supported private records. Text-edit commands accept append or a unique literal fragment, up to 20,000 characters.','',
'Fields below list **all** registry fields. Only columns explicitly marked editable are accepted as write values. Required means required on create when no server default exists; owner IDs are always server-bound. Read-only fields include provenance, inferred counters, IDs and source metadata. Required owner fields are not caller-supplied.','']
for name,e in registry.items():
 lines += [f'## `{name}`','',f'Owner: `{e["owner"]}`. Soft delete: {e["softDelete"]}. Operations: {", ".join(e["operations"]) or "read-only; use dedicated workflow"}.','', '| Field | Type | Nullable | Required on create | Editable | Enum / relationship / approval |','| --- | --- | --- | --- | --- | --- |']
 for field,f in e['fields'].items():
  details=[]
  if f.get('enum'):details.append('enum: '+', '.join('`'+str(v)+'`' for v in f['enum']))
  if f.get('references'):details.append('owned '+f['references'])
  if f.get('confirm'):details.append('confirmation required')
  lines.append(f'| `{field}` | `{f["type"]}` | {f["nullable"]} | {f["required"] and f["editable"]} | {f["editable"]} | {"; ".join(details)} |')
 lines.append('')
(root/'docs/HERMES-API-COVERAGE.md').write_text('\n'.join(lines),encoding='utf-8')
print(f'Documented {len(registry)} entities and {sum(len(e["fields"]) for e in registry.values())} fields; no account data included.')
