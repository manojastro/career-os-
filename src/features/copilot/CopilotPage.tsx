"use client";

import { useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { Badge, Button, Empty, PageHeading, Section } from "@/components/ui";
import { localCommand } from "@/ai/local";
import { CommandResult, Proposal, commandResultSchema } from "@/ai/types";
import { useStore } from "@/lib/store";
import { localDay } from "@/lib/domain/insights";

const examples = ["Show me what I neglected this week", "Plan tomorrow. I have four hours.", "Move unfinished interview tasks to tomorrow", "Add Kubernetes under my learning backlog", "Which active project has the nearest milestone?"];

export function CopilotPage() {
  const { data, add, update } = useStore();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<CommandResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<number[]>([]);
  const [error, setError] = useState("");

  const ask = async (value = prompt) => {
    if (value.trim().length < 3) return;
    setPrompt(value); setBusy(true); setError(""); setResponse(null); setApplied([]);
    try {
      const result = await fetch("/api/ai/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: value, today: localDay() }) });
      if (result.status === 503) { setResponse(localCommand(value, data)); return; }
      const payload: unknown = await result.json();
      if (!result.ok) throw new Error((payload as { error?: string }).error ?? "AI request failed.");
      const parsed = commandResultSchema.safeParse(payload);
      if (!parsed.success) throw new Error("AI returned an unsupported response. No changes were made.");
      setResponse({ ...parsed.data, source: "ai" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not process command."); }
    finally { setBusy(false); }
  };

  const applyOne = async (proposal: Proposal) => {
    if (proposal.action === "create_task") {
      await add("tasks", { title: proposal.title, description: "Created from a confirmed Copilot proposal.", type: proposal.type, status: proposal.status, priority: "medium", estimated_minutes: 45, actual_minutes: 0, due_date: null, scheduled_date: proposal.status === "today" ? localDay() : null, scheduled_start: null, scheduled_end: null, skill_id: null, project_id: null, goal_id: null, milestone_id: null, application_id: null, contact_id: null, completed_at: null, sort_order: data.tasks.length + 1, tags: ["copilot"], recurrence: null, evidence_required: false });
    } else if (proposal.action === "complete_task") {
      const task = data.tasks.find((item) => item.id === proposal.task_id);
      if (!task) throw new Error("The task to complete no longer exists.");
      const minutes = proposal.minutes ?? 0;
      if (minutes > 0) {
        const endedAt = new Date();
        await add("focus_sessions", { task_id: task.id, started_at: new Date(endedAt.getTime() - minutes * 60000).toISOString(), ended_at: endedAt.toISOString(), duration_minutes: minutes, note: "Recorded from a confirmed Copilot command." });
      }
      await update("tasks", task.id, { status: "completed", completed_at: new Date().toISOString(), actual_minutes: task.actual_minutes + minutes });
    } else if (proposal.action === "reschedule_task") {
      const task = data.tasks.find((item) => item.id === proposal.task_id);
      if (!task || task.status === "completed") throw new Error("The task to move is no longer open.");
      await update("tasks", task.id, { scheduled_date: proposal.date, status: proposal.status });
    } else if (proposal.action === "create_skill") {
      if (data.skills.some((skill) => skill.name.toLowerCase() === proposal.name.toLowerCase())) throw new Error("That skill already exists.");
      await add("skills", { name: proposal.name, category: "", status: "Not Started", knowledge: 0, hands_on: 0, project_proof: 0, production: 0, interview: 0, last_activity: null });
    } else if (proposal.action === "add_note") {
      await add("notes", { title: proposal.title, content: `<p>${proposal.content.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`, entity_type: null, entity_id: null, source_url: "", tags: ["copilot"] });
    }
  };

  const confirm = async () => {
    if (!response || applying) return;
    setApplying(true); setError("");
    try {
      for (let index = 0; index < response.proposals.length; index++) {
        if (applied.includes(index)) continue;
        const proposal = response.proposals[index];
        await applyOne(proposal);
        setApplied((current) => [...current, index]);
        try {
          await add("activity_log", { entity_type: "copilot", entity_id: crypto.randomUUID(), action: proposal.action, summary: `Confirmed Copilot action: ${describe(proposal)}`, occurred_at: new Date().toISOString(), metadata: { source: response.source, action: proposal.action } });
        } catch { setError("Change saved, but its Copilot audit record could not be written."); }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A proposal could not be saved."); }
    finally { setApplying(false); }
  };

  const describe = (proposal: Proposal) => {
    if (proposal.action === "create_task") return `Create task: ${proposal.title}`;
    if (proposal.action === "create_skill") return `Add skill: ${proposal.name}`;
    if (proposal.action === "add_note") return `Save note: ${proposal.title}`;
    const task = data.tasks.find((item) => item.id === proposal.task_id);
    if (proposal.action === "complete_task") return `Complete: ${task?.title ?? "Unknown task"}${proposal.minutes ? ` · record ${proposal.minutes}m` : ""}`;
    return `Move ${task?.title ?? "Unknown task"} to ${proposal.date}`;
  };

  return <><PageHeading title="AI Copilot" subtitle="Ask about your workspace or review proposed changes before saving them." /><div className="grid-main"><div className="stack"><Section title="Command" action={<Badge tone="blue">Confirmation before writes</Badge>}><div className="section-body"><textarea className="textarea" style={{ minHeight: 125 }} aria-label="Copilot command" placeholder="Plan tomorrow. I have four hours." value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void ask(); }} /><div className="row-between" style={{ marginTop: 10 }}><span className="micro muted">Ctrl/Cmd + Enter to run</span><Button variant="primary" disabled={busy || prompt.trim().length < 3} onClick={() => void ask()}>{busy ? "Thinking…" : "Run command"} <ArrowUp size={14} /></Button></div></div></Section>
      {error && <div className="alert" role="alert">{error}</div>}
      {response && <Section title="Response" action={<Badge>{response.source === "ai" ? "AI provider" : "Local rules"}</Badge>}><div className="section-body"><p style={{ lineHeight: 1.6, marginTop: 0 }}>{response.answer}</p>{response.proposals.length > 0 && <><h3 className="small" style={{ margin: "18px 0 8px" }}>Proposed changes</h3><div style={{ border: "1px solid var(--line)", borderRadius: 6 }}>{response.proposals.map((proposal, index) => <div className="list-row row-between small" key={`${index}-${proposal.action}`}><span>{describe(proposal)}</span><Badge tone={applied.includes(index) ? "green" : "amber"}>{applied.includes(index) ? "Saved" : "Review"}</Badge></div>)}</div><div className="form-actions"><Button variant="primary" disabled={applying || applied.length === response.proposals.length} onClick={() => void confirm()}>{applying ? "Saving…" : applied.length === response.proposals.length ? "All saved" : `Confirm ${response.proposals.length - applied.length} change${response.proposals.length - applied.length === 1 ? "" : "s"}`}</Button></div></>}</div></Section>}
    </div><Section title="Try a command"><div>{examples.map((example) => <button key={example} className="list-row row-between" style={{ width: "100%", background: "transparent", borderTop: 0, borderLeft: 0, borderRight: 0, textAlign: "left", color: "var(--text)" }} onClick={() => void ask(example)}><span className="small">{example}</span><Sparkles size={14} className="muted" /></button>)}</div>{!response && <Empty title="Your workspace is the context" detail="The local command set works without an AI key. A configured provider can handle broader requests." />}</Section></div></>;
}
