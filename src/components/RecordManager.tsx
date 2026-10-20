import { useState } from "react";
import { Button, Dialog, Field } from "./ui";
import { useStore } from "@/lib/store";
import { ENTITY_NAMES, type EntityName, type EntityMap, type RowBase } from "@/lib/domain/types";
import registry from "@/lib/control/registry.json";
import { browserSupabase } from "@/lib/supabase";
import { readRecurrence, type Cadence } from "@/lib/domain/recurrence";
type FieldDef = {
  type: string;
  editable: boolean;
  required: boolean;
  nullable: boolean;
  enum?: string[];
  references?: string;
};
type Def = { operations: string[]; fields: Record<string, FieldDef> };
type RecordRow = RowBase & Record<string, unknown>;
const definitions = registry as unknown as Record<string, Def>;
const writable = ENTITY_NAMES.filter((e) => definitions[e]?.operations.length);
const label = (r: Record<string, unknown>) =>
  String(r.title ?? r.name ?? r.question ?? r.company ?? r.content ?? r.id);
const trashKey = "career-os-demo-trash-v1";
type Trash = { table: EntityName; record: RecordRow };
export function RecordManager({
  onClose,
  initialEntity = "tasks",
  initialId,
}: {
  onClose: () => void;
  initialEntity?: EntityName;
  initialId?: string;
}) {
  const { data, add, update, remove, restore, demo, user, setCompleted, day, setRecurrence } =
    useStore();
  const initial = data[initialEntity].find((r) => r.id === initialId);
  const [entity, setEntity] = useState<EntityName>(initialEntity),
    [selected, setSelected] = useState<string | null>(initialId ?? null),
    [creating, setCreating] = useState(false),
    [values, setValues] = useState<Record<string, unknown>>(
      (initial as unknown as Record<string, unknown>) ?? {},
    ),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [archived, setArchived] = useState<RecordRow[]>([]),
    [showArchive, setShowArchive] = useState(false),
    [query, setQuery] = useState("");
  const definition = definitions[entity],
    rows = data[entity] as unknown as RecordRow[],
    record = rows.find((r) => r.id === selected),
    fields = Object.entries(definition.fields).filter(([, f]) => f.editable);
  const canLeave = () => !dirty || window.confirm("Discard unsaved edits?");
  const choose = (id: string | null) => {
    if (!canLeave()) return;
    setSelected(id);
    setCreating(false);
    setValues(rows.find((r) => r.id === id) ?? {});
    setDirty(false);
    setError("");
  };
  const begin = () => {
    if (!canLeave()) return;
    setSelected(null);
    setCreating(true);
    setDirty(false);
    setValues(
      Object.fromEntries(
        fields.map(([k, f]) => [
          k,
          f.nullable
            ? null
            : (f.enum?.[0] ??
              (f.type === "bool"
                ? false
                : f.type === "timestamptz"
                  ? new Date().toISOString()
                  : f.type === "date"
                    ? day()
                    : f.type === "_text"
                      ? []
                      : /int|float|numeric/.test(f.type)
                        ? 0
                        : "")),
        ]),
      ),
    );
  };
  const loadArchive = async () => {
    setError("");
    try {
      if (demo) {
        const entries = JSON.parse(localStorage.getItem(trashKey) ?? "[]") as Trash[];
        setArchived(
          entries
            .filter((e) => e.table === entity && !rows.some((r) => r.id === e.record.id))
            .map((e) => e.record),
        );
      } else {
        const client = browserSupabase();
        if (!client || !user) throw new Error("Sign in first.");
        const all: RecordRow[] = [];
        for (let offset = 0; ; offset += 200) {
          const result = await client
            .from(entity)
            .select("*")
            .eq("user_id", user.id)
            .not("deleted_at", "is", null)
            .order("id")
            .range(offset, offset + 199);
          if (result.error) throw result.error;
          all.push(...(result.data as RecordRow[]));
          if (result.data.length < 200) break;
        }
        setArchived(all);
      }
      setShowArchive((v) => !v);
    } catch {
      setError("Could not read deleted records.");
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const input: Record<string, unknown> = {};
      for (const [k, f] of fields) {
        let value = values[k];
        if (value === undefined) continue;
        if (value === "" && f.nullable) value = null;
        if ((value === null || value === "") && f.required)
          throw new Error("Enter " + k.replaceAll("_", " ") + ".");
        if (f.enum && value !== null && !f.enum.includes(String(value)))
          throw new Error("Choose a valid " + k + ".");
        if (value !== null && /int|numeric|float/.test(f.type)) {
          value = Number(value);
          if (!Number.isFinite(value) || Number(value) < 0)
            throw new Error("Enter a non-negative number for " + k + ".");
        }
        if (
          value !== null &&
          f.type === "uuid" &&
          !/^[a-f0-9-]{36}$/i.test(String(value)) &&
          !(
            demo &&
            (f.references || (entity === "notes" && k === "entity_id" && values.entity_type)) &&
            ENTITY_NAMES.includes((f.references || values.entity_type) as EntityName) &&
            data[(f.references || values.entity_type) as EntityName].some((r) => r.id === value)
          )
        )
          throw new Error("Choose a linked record for " + k + ".");
        if (/url$/.test(k) && value && !String(value).startsWith("storage:")) {
          const url = new URL(String(value));
          if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
            throw new Error("Enter an http(s) URL.");
        }
        if (value !== null && f.type === "timestamptz")
          value = new Date(String(value)).toISOString();
        if (creating || JSON.stringify(value) !== JSON.stringify(record?.[k])) input[k] = value;
      }
      if (creating) {
        const saved = await add(entity, input as never);
        setSelected(saved.id);
        setValues(saved as unknown as Record<string, unknown>);
        setCreating(false);
      } else if (record) {
        await update(
          entity,
          record.id,
          input as never,
          typeof values.updated_at === "string"
            ? { expectedUpdatedAt: values.updated_at }
            : undefined,
        );
        setSelected(null);
        setValues({});
      }
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (
      !record ||
      !window.confirm(
        "Delete this record? Related records may be detached or deleted by domain rules.",
      )
    )
      return;
    setBusy(true);
    try {
      if (demo) {
        const entries = JSON.parse(localStorage.getItem(trashKey) ?? "[]") as Trash[];
        localStorage.setItem(
          trashKey,
          JSON.stringify([
            ...entries.filter((e) => e.record.id !== record.id),
            { table: entity, record },
          ]),
        );
      }
      await remove(entity, record.id);
      setSelected(null);
      setValues({});
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this record.");
    } finally {
      setBusy(false);
    }
  };
  const recover = async (row: RecordRow) => {
    if (!window.confirm("Restore this record? Parent relationships must still be valid.")) return;
    try {
      await restore(entity, row as unknown as EntityMap[typeof entity]);
      setArchived((a) => a.filter((r) => r.id !== row.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore.");
    }
  };
  return (
    <Dialog
      title="Manage workspace records"
      onClose={() => {
        if (canLeave()) onClose();
      }}
    >
      <Field label="Record type" name="records-type">
        <select
          id="records-type"
          className="select"
          value={entity}
          onChange={(e) => {
            if (!canLeave()) return;
            setEntity(e.target.value as EntityName);
            setSelected(null);
            setCreating(false);
            setValues({});
            setDirty(false);
            setShowArchive(false);
            setQuery("");
          }}
        >
          {writable.map((e) => (
            <option key={e} value={e}>
              {e.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-actions">
        <Button onClick={begin}>New record</Button>
        <Button onClick={() => void loadArchive()}>Deleted records</Button>
      </div>
      <input
        className="input"
        aria-label="Find record"
        placeholder="Find by title or name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={{ maxHeight: 180, overflow: "auto", margin: "10px 0" }}>
        {(showArchive ? archived : rows)
          .filter((r) => label(r).toLowerCase().includes(query.toLowerCase()))
          .map((r) => (
            <div key={r.id} className="row-between list-row">
              <button className="link" onClick={() => choose(r.id)}>
                {label(r)}
              </button>
              {showArchive && <Button onClick={() => void recover(r)}>Restore</Button>}
            </div>
          ))}
      </div>
      {(creating || record) && !showArchive && (
        <>
          <h3>{creating ? "Create record" : label(record!)}</h3>
          <div className="form-grid">
            {fields.map(([k, f]) => {
              if (entity === "notes" && k === "entity_type")
                return (
                  <Field key={k} label="Link to a record type" name="record-entity_type" full>
                    <select
                      id="record-entity_type"
                      className="select"
                      value={String(values[k] ?? "")}
                      onChange={(e) => {
                        setValues((v) => ({
                          ...v,
                          entity_type: e.target.value || null,
                          entity_id: null,
                        }));
                        setDirty(true);
                      }}
                    >
                      <option value="">No linked record</option>
                      {["tasks", "projects", "skills", "goals", "contacts", "job_applications"].map(
                        (type) => (
                          <option key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                );
              const target =
                f.references ??
                (entity === "notes" && k === "entity_id" ? String(values.entity_type ?? "") : null);
              const linked =
                  target && ENTITY_NAMES.includes(target as EntityName)
                    ? (data[target as EntityName] as unknown as RecordRow[])
                    : null,
                value = values[k],
                id = "record-" + k;
              const change = (v: unknown) => {
                setValues((prev) => ({ ...prev, [k]: v }));
                setDirty(true);
              };
              return (
                <Field
                  key={k}
                  label={k.replaceAll("_", " ") + (f.required ? " *" : "")}
                  name={id}
                  full
                >
                  {f.enum || linked ? (
                    <select
                      id={id}
                      className="select"
                      value={String(value ?? "")}
                      onChange={(e) => change(e.target.value)}
                    >
                      <option value="">Choose / none</option>
                      {f.enum?.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                      {linked?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {label(r)}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "bool" ? (
                    <input
                      id={id}
                      type="checkbox"
                      checked={value === true}
                      onChange={(e) => change(e.target.checked)}
                    />
                  ) : f.type === "_text" ? (
                    <input
                      id={id}
                      className="input"
                      value={Array.isArray(value) ? value.join(", ") : ""}
                      onChange={(e) =>
                        change(
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  ) : (
                    <textarea
                      id={id}
                      className="textarea"
                      style={{ minHeight: 40 }}
                      value={value === null || value === undefined ? "" : String(value)}
                      onChange={(e) => change(e.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <div className="form-actions">
            <Button disabled={busy} variant="primary" onClick={() => void save()}>
              {busy ? "Saving…" : "Save record"}
            </Button>
            {record && definition.operations.includes("delete") && (
              <Button disabled={busy} variant="danger" onClick={() => void archive()}>
                Delete record
              </Button>
            )}
          </div>
        </>
      )}
      {record && definition.operations.includes("set_completed") && !showArchive && (
        <label className="row">
          <input
            type="checkbox"
            checked={!!record.completed_at}
            onChange={(e) =>
              void setCompleted(entity, record.id, e.target.checked).catch(() =>
                setError("Could not change completion."),
              )
            }
          />
          Completed
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {entity === "tasks" && record && !showArchive && (
        <Field label="Repeat after completion" name="record-repeat">
          <select
            id="record-repeat"
            className="select"
            disabled={dirty || busy}
            value={readRecurrence(record.recurrence as string) ?? ""}
            onChange={(e) => {
              const cadence = (e.target.value || null) as Cadence | null;
              if (
                window.confirm(
                  "Change repetition for this task? Completing it will create one future task; existing successors keep their own settings.",
                )
              )
                void setRecurrence(record.id, cadence).catch(() =>
                  setError("Could not change repeat settings."),
                );
            }}
          >
            <option value="">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span className="micro muted">
            Opt-in only. Save other edits first. No background job is created.
          </span>
        </Field>
      )}
    </Dialog>
  );
}
