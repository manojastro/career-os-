import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui";
import { Note } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

export function NoteEditor({ note }: { note: Note }) {
  const { update } = useStore();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const version = useRef(note.updated_at);
  const conflict = useRef(false);
  const latestUpdate = useRef(update);
  const [status, setStatus] = useState("Saved");
  const [hasConflict, setHasConflict] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const restored = useRef(false);
  const draftKey = `career-os-note-draft:${note.user_id}:${note.id}`;
  const retain = (content: string) => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ content, version: version.current, savedAt: Date.now() }),
      );
    } catch {
      setStatus("Draft recovery storage is unavailable. Copy your draft before leaving.");
    }
  };
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* Keep the editor usable when browser storage is unavailable. */
    }
  }, [draftKey]);
  useEffect(() => {
    latestUpdate.current = update;
  }, [update]);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
      if (pending.current !== null && !conflict.current) {
        let originalDraft: string | null = null;
        try {
          originalDraft = sessionStorage.getItem(draftKey);
        } catch {
          /* Storage is optional for network saving. */
        }
        void latestUpdate
          .current(
            "notes",
            note.id,
            { content: pending.current },
            { expectedUpdatedAt: version.current },
          )
          .then(() => {
            try {
              if (sessionStorage.getItem(draftKey) === originalDraft)
                sessionStorage.removeItem(draftKey);
            } catch {
              /* Recovery remains in this tab if cleanup fails. */
            }
          })
          .catch(() => {});
      }
    },
    [note.id, draftKey],
  );
  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-editor", "aria-label": "Note content" } },
    onUpdate: ({ editor: instance }) => {
      if (timeout.current) clearTimeout(timeout.current);
      const html = instance.getHTML();
      pending.current = html;
      retain(html);
      if (conflict.current) return;
      setStatus("Saving…");
      timeout.current = setTimeout(() => {
        void latestUpdate
          .current("notes", note.id, { content: html }, { expectedUpdatedAt: version.current })
          .then(() => {
            if (pending.current === html) {
              pending.current = null;
              clearDraft();
              setStatus("Saved");
            }
          })
          .catch(() => {
            conflict.current = true;
            setHasConflict(true);
            setStatus("Save failed; your draft is still here.");
          });
      }, 700);
    },
  });
  useEffect(() => {
    if (!editor || restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { content?: unknown; version?: string; savedAt?: number };
      if (
        typeof saved.content !== "string" ||
        saved.content.length > 100000 ||
        !saved.savedAt ||
        Date.now() - saved.savedAt > 86400000
      ) {
        clearDraft();
        return;
      }
      if (saved.content === note.content) {
        clearDraft();
        return;
      }
      editor.commands.setContent(saved.content, { emitUpdate: false });
      pending.current = saved.content;
      version.current = saved.version;
      conflict.current = true;
      setHasConflict(true);
      setStatus(
        "Recovered an unsaved draft from this tab. Review it before replacing the saved note.",
      );
    } catch {
      setStatus("Could not recover this tab’s saved draft.");
    }
  }, [editor, draftKey, note.content, clearDraft]);
  useEffect(() => {
    if (!editor) return;
    if (
      pending.current !== null &&
      note.content !== pending.current &&
      version.current !== note.updated_at
    ) {
      if (timeout.current) clearTimeout(timeout.current);
      conflict.current = true;
      setHasConflict(true);
      setStatus("This note changed elsewhere. Copy your draft or reload the saved note.");
      return;
    }
    version.current = note.updated_at;
    if (pending.current === null && editor.getHTML() !== note.content)
      editor.commands.setContent(note.content, { emitUpdate: false });
  }, [editor, note.content, note.updated_at]);
  const reload = () => {
    if (timeout.current) clearTimeout(timeout.current);
    pending.current = null;
    clearDraft();
    conflict.current = false;
    setHasConflict(false);
    version.current = note.updated_at;
    editor?.commands.setContent(note.content, { emitUpdate: false });
    setStatus("Saved note loaded");
  };
  const saveRecovered = async () => {
    if (
      !editor ||
      savingDraft ||
      !window.confirm("Replace the currently saved note with this local draft?")
    )
      return;
    setSavingDraft(true);
    editor.setEditable(false);
    try {
      const html = editor.getHTML();
      await latestUpdate.current(
        "notes",
        note.id,
        { content: html },
        { expectedUpdatedAt: note.updated_at },
      );
      pending.current = null;
      conflict.current = false;
      setHasConflict(false);
      clearDraft();
      setStatus("Saved");
    } catch {
      setStatus("The saved note changed again or could not be written. Your draft is retained.");
    } finally {
      editor.setEditable(true);
      setSavingDraft(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Button onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">
          B
        </Button>
        <Button onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic">
          <i>I</i>
        </Button>
        <Button onClick={() => editor?.chain().focus().toggleBulletList().run()}>List</Button>
        <Button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>Code</Button>
        <span className="small muted" role="status">
          {status}
        </span>
      </div>
      {hasConflict && (
        <div className="alert" role="alert">
          <div className="row">
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(editor?.getHTML() ?? "")
                  .then(() => setStatus("Draft copied"))
                  .catch(() =>
                    setStatus("Clipboard unavailable. Select and copy the draft manually."),
                  )
              }
            >
              Copy local draft
            </Button>
            <Button onClick={reload}>Discard local draft and reload</Button>
            <Button disabled={savingDraft} onClick={() => void saveRecovered()}>
              Use this draft after confirmation
            </Button>
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
      <p className="micro muted">
        Unsaved drafts stay in this browser tab for up to 24 hours, until saved or explicitly
        discarded.
      </p>
    </div>
  );
}
