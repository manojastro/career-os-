"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Field } from "./ui";
import { classifyCapture } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";

export function CaptureDialog({ onClose }: { onClose: () => void }) {
  const { add, data } = useStore();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<"task" | "note" | "resource" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const proposed = kind ?? classifyCapture(content);
  const save = async () => {
    if (!content.trim()) return;
    setSaving(true); setError("");
    try {
      if (proposed === "task") {
        await add("tasks", { title: content.trim(), description: "", type: /follow up|contact/i.test(content) ? "Network" : "Learn", status: "backlog", priority: "medium", estimated_minutes: 30, actual_minutes: 0, due_date: null, scheduled_date: null, scheduled_start: null, scheduled_end: null, skill_id: null, project_id: null, goal_id: null, milestone_id: null, application_id: null, contact_id: null, completed_at: null, sort_order: data.tasks.length + 1, tags: [], recurrence: null, evidence_required: false });
      } else if (proposed === "resource") {
        const isUrl = /^https?:\/\//i.test(content.trim());
        await add("resources", { title: isUrl ? new URL(content.trim()).hostname : content.trim(), url: isUrl ? content.trim() : "", source_type: "URL", skill_id: null, project_id: null, status: "Inbox", priority: "medium", notes: "" });
      } else {
        await add("notes", { title: content.trim().slice(0, 80), content: `<p>${content.trim().replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`, entity_type: null, entity_id: null, source_url: "", tags: [] });
      }
      onClose();
      if (proposed === "task") router.push("/tasks");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save capture."); }
    finally { setSaving(false); }
  };
  return <Dialog title="Quick capture" onClose={onClose}><Field label="Capture an idea, task, note, or URL" name="capture-text" full><textarea id="capture-text" autoFocus className="textarea" placeholder="Learn reciprocal rank fusion" value={content} onChange={(event) => { setContent(event.target.value); setKind(null); }} /></Field>
    {content.trim() && <div className="row" style={{ marginTop: 12 }}><span className="small muted">Save as</span><div className="tabs">{(["task", "note", "resource"] as const).map((item) => <button type="button" key={item} className={proposed === item ? "active" : ""} onClick={() => setKind(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>}
    {proposed === "task" && content.trim() && <p className="small muted" style={{ marginTop: 12 }}>New tasks enter Backlog. Set a date and links from the task editor.</p>}
    {error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving || !content.trim()} onClick={() => void save()}>{saving ? "Saving…" : `Save ${proposed}`}</Button></div>
  </Dialog>;
}
