import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui";
import { Note } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

export function NoteEditor({ note }: { note: Note }) {
  const { update } = useStore();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const latestUpdate = useRef(update);
  const [status, setStatus] = useState("Saved");
  useEffect(() => { latestUpdate.current = update; }, [update]);
  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (pending.current !== null) void latestUpdate.current("notes", note.id, { content: pending.current });
  }, [note.id]);
  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content,
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-editor", "aria-label": "Note content" } },
    onUpdate: ({ editor: instance }) => {
      setStatus("Saving…");
      if (timeout.current) clearTimeout(timeout.current);
      const html = instance.getHTML();
      pending.current = html;
      timeout.current = setTimeout(() => {
        void latestUpdate.current("notes", note.id, { content: html }).then(() => { if (pending.current === html) { pending.current = null; setStatus("Saved"); } }).catch(() => setStatus("Save failed"));
      }, 700);
    },
  });

  return <div><div className="row" style={{ marginBottom: 8 }}><Button onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Bold">B</Button><Button onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Italic"><i>I</i></Button><Button onClick={() => editor?.chain().focus().toggleBulletList().run()}>List</Button><Button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>Code</Button><span className="small muted" role="status">{status}</span></div><EditorContent editor={editor} /></div>;
}

