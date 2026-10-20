import { useEffect, useRef, useState } from "react";
import { Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Note } from "@/lib/domain/types";
export function NoteTitle({ note }: { note: Note }) {
  const { update } = useStore(),
    [draft, setDraft] = useState(note.title),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const baseline = useRef(note.updated_at),
    dirty = useRef(false),
    restored = useRef(false);
  const key = `career-os-note-title:${note.user_id}:${note.id}`;
  const clearLocal = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      setError("Title saved, but its recovery copy could not be cleared in this tab.");
    }
  };
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const value = JSON.parse(raw);
      if (
        typeof value.text === "string" &&
        value.text !== note.title &&
        value.text.length <= 20000 &&
        Date.now() - value.savedAt < 86400000
      ) {
        setDraft(value.text);
        baseline.current = value.version;
        dirty.current = true;
        setConflict(true);
      } else sessionStorage.removeItem(key);
    } catch {
      setError("Could not recover the title draft from this tab.");
    }
  }, [key, note.title]);
  useEffect(() => {
    if (note.updated_at === baseline.current) return;
    if (dirty.current) {
      setConflict(true);
      return;
    }
    baseline.current = note.updated_at;
    setDraft(note.title);
  }, [note.title, note.updated_at]);
  const change = (value: string) => {
    setDraft(value);
    dirty.current = true;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ text: value, version: baseline.current, savedAt: Date.now() }),
      );
    } catch {
      setError("Draft recovery is unavailable. Copy the title before leaving.");
    }
  };
  const save = async (force = false) => {
    if (!draft.trim() || saving || (conflict && !force)) return;
    if (force && !window.confirm("Replace the saved title with this local title draft?")) return;
    setSaving(true);
    setError("");
    const sent = draft.trim();
    try {
      await update(
        "notes",
        note.id,
        { title: sent },
        { expectedUpdatedAt: force ? note.updated_at : baseline.current },
      );
      dirty.current = false;
      setConflict(false);
      clearLocal();
    } catch {
      setConflict(true);
      setError("The title changed elsewhere or could not be saved. Your draft is retained.");
    } finally {
      setSaving(false);
    }
  };
  const reload = () => {
    if (window.confirm("Discard the local title and load the saved title?")) {
      dirty.current = false;
      baseline.current = note.updated_at;
      setDraft(note.title);
      setConflict(false);
      setError("");
      clearLocal();
    }
  };
  return (
    <Field label="Title" name="note-title">
      <input
        id="note-title"
        className="input"
        disabled={saving}
        value={draft}
        onChange={(e) => change(e.target.value)}
      />
      <div className="form-actions">
        <Button disabled={saving || conflict || !draft.trim()} onClick={() => void save()}>
          Save title
        </Button>
        {conflict && (
          <>
            <Button onClick={reload}>Reload saved title</Button>
            <Button disabled={saving} onClick={() => void save(true)}>
              Use this title after confirmation
            </Button>
          </>
        )}
      </div>
      {(error || conflict) && (
        <p role="status" className="error">
          {error || "A local title draft is retained. Review it before replacing the saved title."}
        </p>
      )}
    </Field>
  );
}
