import { useMemo, useState } from "react";
import { Section, Button, Field, PageHeading, Empty } from "@/components/ui";
import { useStore } from "@/lib/store";
import { useFocus } from "@/features/focus/FocusProvider";
import type { Task } from "@/lib/domain/types";
import { authSupabase } from "@/lib/supabase";
import { AgentGate, ErrorLine, FeedbackControls, Provenance, StatusBadge, insertRow, ist, queueCommand, todayIST, updateRow, useRows, type Row } from "./agentData";

const noop = () => {};

/** Legacy study rows linked to a canonical Learn task use that task as their only progress record. */
function useCanonical() {
  const { data } = useStore();
  const taskFor = (r: Row | undefined | null): Task | null => (r?.["consolidated_task_id"] ? data.tasks.find((t) => t.id === r["consolidated_task_id"]) ?? null : null);
  const isOpen = (r: Row) => { const t = taskFor(r); return t ? t.status !== "completed" && !t.deleted_at : true; };
  return { taskFor, isOpen };
}
function CanonicalStudyActions({ task }: { task: Task }) {
  const { update } = useStore();
  const { start } = useFocus();
  return <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
    <span className="micro muted">Linked task · {task.status} · {task.actual_minutes ?? 0} min recorded</span>
    <Button onClick={() => start(task)}>Start focus</Button>
    <Button variant="primary" onClick={() => void update("tasks", task.id, { status: "completed", completed_at: new Date().toISOString() })}>Complete</Button>
  </div>;
}

/* ---------------- Today: top priority + morning briefing ---------------- */
export function TodayAgentPanel() {
  return <AgentGate><TodayAgentInner /></AgentGate>;
}
function TodayAgentInner() {
  return <><BriefingSchedule /><TodayAgentCore /><TodayActions /></>;
}
/* ---------------- Today: actionable agent items ---------------- */
function TodayActions() {
  const study = useRows("study_tasks", { order: "created_at", filter: (q) => q.is("deleted_at", null).in("status", ["in_progress", "queued", "saved"]) });
  const leads = useRows("job_leads", { order: "updated_at", filter: (q) => q.is("deleted_at", null).in("status", ["verified", "new", "saved"]) });
  const drafts = useRows("outreach", { order: "updated_at", filter: (q) => q.is("deleted_at", null).in("status", ["draft", "approved"]) });
  const ptasks = useRows("project_tasks", { order: "created_at", filter: (q) => q.is("deleted_at", null).in("status", ["doing", "todo", "open", "saved"]) });
  const iq = useRows("interview_questions", { order: "created_at", filter: (q) => q.is("deleted_at", null).neq("status", "Strong") });
  const rank = (st: string, order: string[]) => { const i = order.indexOf(st); return i < 0 ? 9 : i; };
  const byDue = (a: Row, b: Row) => (a["due_date"] ?? "9999").localeCompare(b["due_date"] ?? "9999");
  const canon = useCanonical();
  const s = [...study.rows].filter(canon.isOpen).sort((a, b) => rank(a["status"], ["in_progress", "queued", "saved"]) - rank(b["status"], ["in_progress", "queued", "saved"]) || byDue(a, b))[0];
  const jobs = [...leads.rows].sort((a, b) => rank(a["status"], ["verified", "saved", "new"]) - rank(b["status"], ["verified", "saved", "new"])).slice(0, 3);
  const outs = drafts.rows.slice(0, 2);
  const pt = [...ptasks.rows].sort((a, b) => rank(a["status"], ["doing", "todo", "open", "saved"]) - rank(b["status"], ["doing", "todo", "open", "saved"]) || byDue(a, b))[0];
  const q = [...iq.rows].sort((a, b) => (a["confidence"] ?? 0) - (b["confidence"] ?? 0) || (a["last_practiced"] ?? "").localeCompare(b["last_practiced"] ?? ""))[0];
  const irec = useRows("recommendations", { order: "created_at", filter: (x) => x.is("deleted_at", null).eq("kind", "interview").in("status", ["new", "saved"]) });
  const rec = irec.rows[0];
  const reloadInterview = () => { iq.reload(); irec.reload(); };
  const more = (href: string, label = "Open") => <a className="link small" href={href}>{label}</a>;
  return <div className="grid-two" style={{ marginBottom: 16 }}>
    <Section title="Today's study" meta={s ? `${s["estimated_minutes"]} min` : undefined} action={more("/learning", "Learning")}>
      <ErrorLine error={study.error} />
      {s ? <div className="section-body"><div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{s["title"]}</strong><StatusBadge status={s["status"]} /></div>
        <div className="small muted">{[`${s["estimated_minutes"]} min`, s["due_date"] && `Due ${ist(s["due_date"], false)}`, s["priority"]].filter(Boolean).join(" · ")}</div>
        {s["detail"] && <div className="small" style={{ marginTop: 4 }}>{s["detail"]}</div>}
        <Provenance row={s} urlKey="resource_url" />
        {canon.taskFor(s) ? <><CanonicalStudyActions task={canon.taskFor(s)!} /><FeedbackControls table="study_tasks" targetType="study_task" row={s} onChange={study.reload} actions={[{ label: "Save", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} /></>
          : <FeedbackControls table="study_tasks" targetType="study_task" row={s} onChange={study.reload} actions={[{ label: "Done", status: "done", feedback: "done" }, { label: "Save", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />}</div>
        : <Empty title="No study task queued" detail="Add one in Learning or wait for your agent's plan." />}
    </Section>
    <InterviewTodayCard rec={rec} question={q} error={iq.error ?? irec.error} onChange={reloadInterview} />
    <Section title="Jobs to review" meta={`${jobs.length} of ${leads.rows.length}`} action={more("/jobs", "All jobs")}>
      <ErrorLine error={leads.error} />
      {jobs.length === 0 ? <Empty title="No open job leads" detail="Sourced leads appear here with their official link." /> : jobs.map((l) => <div className="list-row" key={l.id}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}><span className="small"><strong>{l["title"]}</strong> <span className="muted">· {l["company"]}{l["location"] ? ` · ${l["location"]}` : ""}</span></span><StatusBadge status={l["status"]} /></div>
        <div className="row small muted" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}><a className="link" href={l["official_url"]} target="_blank" rel="noreferrer noopener">Official posting</a>{l["source_url"] && <a className="link" href={l["source_url"]} target="_blank" rel="noreferrer noopener">Found via</a>}<span>{l["verified_at"] ? `Verified ${ist(l["verified_at"])}` : "Not verified"}</span>{l["fit_is_inference"] && l["fit_notes"] && <span>Fit is an inference</span>}</div>
        <JobLeadControls lead={l} onChange={leads.reload} />
      </div>)}
    </Section>
    <Section title="Outreach drafts" meta="Never sent automatically" action={more("/networking", "Networking")}>
      <ErrorLine error={drafts.error} />
      {outs.length === 0 ? <Empty title="No drafts waiting" detail="Connection drafts from your agent appear here for review." /> : outs.map((o) => <div className="list-row" key={o.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><span className="small"><strong>{o["recipient"]}</strong> <span className="muted">· {o["channel"]}</span></span><StatusBadge status={o["status"]} /></div>
        {o["reason"] && <div className="small muted">Why{o["is_inference"] ? " (inference)" : ""}: {o["reason"]}</div>}
        <p className="small" style={{ whiteSpace: "pre-wrap", margin: "4px 0 0", maxHeight: 72, overflow: "hidden" }}>{o["draft"]}</p>
        <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}><Button onClick={() => void navigator.clipboard?.writeText(o["draft"])}>Copy</Button>
        <FeedbackControls table="outreach" targetType="outreach" row={o} onChange={drafts.reload} actions={[{ label: "Approve", status: "approved", feedback: "save" }, { label: "I sent it", status: "sent_manually", feedback: "done" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} /></div>
      </div>)}
    </Section>
    <Section title="Next project task" meta={pt ? data_proj(pt) : undefined} action={more("/projects", "Projects")}>
      <ErrorLine error={ptasks.error} />
      {pt ? <div className="section-body"><div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{pt["title"]}</strong><StatusBadge status={pt["status"]} /></div>
        <div className="small muted">{[pt["kind"], pt["due_date"] && `Due ${ist(pt["due_date"], false)}`].filter(Boolean).join(" · ")}</div>
        {pt["detail"] && <div className="small" style={{ marginTop: 4 }}>{pt["detail"]}</div>}
        <Provenance row={pt} urlKey="evidence_url" />
        <FeedbackControls table="project_tasks" targetType="project_task" row={pt} onChange={ptasks.reload} actions={[...(pt["status"] !== "doing" ? [{ label: "Start", status: "doing", feedback: "save" as const }] : []), { label: "Done", status: "done", feedback: "done" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} /></div>
        : <Empty title="No open project task" detail="Add milestones or tasks in Projects." />}
    </Section>
  </div>;
}
function data_proj(_r: Row) { return "Up next"; }

/* Interview item: agent recommendation (kind "interview") or weakest saved question, recorded into interview_questions / interview_practice. */
function InterviewTodayCard({ rec, question, error, onChange }: { rec?: Row; question?: Row; error: string | null; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(""); const [conf, setConf] = useState(2); const [weak, setWeak] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const text: string | undefined = rec ? rec["title"] : question?.["question"];
  const record = async () => {
    if (!text) return;
    if (!answer.trim()) { setErr("Write your answer first — nothing is recorded or graded without one."); return; }
    setBusy(true); setErr("");
    try {
      const sb = authSupabase();
      let qid: string | undefined = rec ? undefined : question?.id;
      let qrow: Row | undefined = rec ? undefined : question;
      if (rec) {
        const { data: found, error: fe } = await sb.from("interview_questions").select("*").eq("question", text).is("deleted_at", null).limit(1);
        if (fe) throw fe;
        qrow = found?.[0] as Row | undefined;
        if (qrow) { qid = qrow.id; if (!qrow["recommendation_id"]) await updateRow("interview_questions", qrow.id, { recommendation_id: rec.id }); }
        else { const created = await insertRow("interview_questions", { question: text, category: "Agent suggested", difficulty: "Medium", status: "New", confidence: 0, recommendation_id: rec.id }) as Row; qid = created.id; qrow = created; }
      }
      const practice = await insertRow("interview_practice", { question_id: qid, answer: answer.trim(), confidence: conf, weaknesses: weak.trim(), notes: notes.trim(), recommendation_id: rec?.id ?? null }) as Row;
      await updateRow("interview_questions", qid!, { status: conf >= 4 ? "Strong" : "Practiced", confidence: conf, practice_count: (qrow?.["practice_count"] ?? 0) + 1, last_practiced: todayIST() });
      if (rec) { await updateRow("recommendations", rec.id, { status: "done" }); await insertRow("feedback", { target_type: "recommendation", target_id: rec.id, action: "done", note: `interview attempt ${practice.id}` }); }
      else await insertRow("feedback", { target_type: "interview_question", target_id: qid, action: "done", note: `interview attempt ${practice.id}` });
      setAnswer(""); setWeak(""); setNotes(""); setOpen(false); setOk("Attempt saved to Interview prep."); onChange();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return <Section title="Interview practice" meta={rec ? "From your agent" : question ? question["category"] : undefined} action={<a className="link small" href="/interviews">Interview prep</a>}>
    <ErrorLine error={error} />
    {!text ? <Empty title="No practice item" detail={ok || "Your agent's interview item or your weakest question appears here."} /> : <div className="section-body">
      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}><strong className="small">{text}</strong>{rec ? <StatusBadge status={rec["status"]} /> : <StatusBadge status={String(question!["status"]).toLowerCase()} />}</div>
      {rec?.["body"] && <div className="small muted" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{rec["body"]}</div>}
      {rec ? <Provenance row={rec} /> : <div className="small muted">Confidence {question!["confidence"]}/4 · practiced {question!["practice_count"] ?? 0}×{question!["last_practiced"] ? ` · last ${ist(question!["last_practiced"], false)}` : ""}</div>}
      {open ? <div className="stack" style={{ marginTop: 8, gap: 6 }}>
        <textarea className="input" rows={4} aria-label="Your answer" placeholder="Your answer (as you'd say it)" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <input className="input" aria-label="Weaknesses" placeholder="Weak spots you noticed (optional)" value={weak} onChange={(e) => setWeak(e.target.value)} />
        <input className="input" aria-label="Notes" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <select className="input" style={{ width: 170 }} value={conf} onChange={(e) => setConf(Number(e.target.value))} aria-label="Self-rated confidence">{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>My confidence {n}/4</option>)}</select>
          <Button variant="primary" disabled={busy} onClick={() => void record()}>Save attempt</Button><Button onClick={() => setOpen(false)}>Cancel</Button>
        </div>
        <span className="small muted">Self-rated only — answers are not graded automatically.</span>
      </div> : <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <Button variant="primary" onClick={() => { setOpen(true); setOk(""); }}>Attempt / record answer</Button>
        {rec && <FeedbackControls table="recommendations" targetType="recommendation" row={rec} onChange={onChange} actions={[{ label: "Save", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />}
      </div>}
      {err && <p className="error small">{err}</p>}{ok && <p className="small muted">{ok}</p>}
    </div>}
  </Section>;
}
function TodayAgentCore() {
  const { rows, error, reload } = useRows("recommendations", { order: "priority", filter: (q) => q.is("deleted_at", null) });
  const today = todayIST();
  const top = rows.filter((r) => r["kind"] === "top_priority" && r["status"] !== "dismissed" && r["status"] !== "done").sort((a, b) => (b["briefing_date"] ?? "").localeCompare(a["briefing_date"] ?? ""))[0];
  const briefing = rows.filter((r) => r["kind"] === "briefing").sort((a, b) => (b["briefing_date"] ?? b["created_at"]).localeCompare(a["briefing_date"] ?? a["created_at"]))[0];
  const actions = rows.filter((r) => (r["kind"] === "action" || r["kind"] === "insight") && r["status"] === "new").slice(0, 6);
  return <div className="grid-two" style={{ marginBottom: 16 }}>
    <Section title="Top priority" meta={top?.["briefing_date"] ? ist(top["briefing_date"], false) : "From your agent"}>
      <ErrorLine error={error} />
      {top ? <div className="section-body"><strong>{top["title"]}</strong><p className="small" style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{top["body"]}</p><Provenance row={top} /><FeedbackControls table="recommendations" targetType="recommendation" row={top} onChange={reload} /></div>
        : <Empty title="No top priority yet" detail="Your agent hasn't sent one. It will appear here after the next morning run." />}
    </Section>
    <Section title="Morning briefing" meta={briefing ? `${ist(briefing["briefing_date"] ?? briefing["created_at"], false)}${briefing["briefing_date"] && briefing["briefing_date"] !== today ? " · not today" : ""}` : "Asia/Kolkata"}>
      {briefing ? <div className="section-body"><strong>{briefing["title"]}</strong><p className="small" style={{ whiteSpace: "pre-wrap", margin: "6px 0 0" }}>{briefing["body"]}</p><Provenance row={briefing} /><FeedbackControls table="recommendations" targetType="recommendation" row={briefing} onChange={reload} /></div>
        : <Empty title="No briefing received" detail="Nothing has been delivered by the agent yet." />}
      {actions.length > 0 && <div style={{ borderTop: "1px solid var(--line)" }}>{actions.map((a) => <div className="list-row" key={a.id}><div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{a["title"]}</strong><StatusBadge status={a["status"]} /></div>{a["body"] && <div className="small muted">{a["body"]}</div>}<Provenance row={a} /><FeedbackControls table="recommendations" targetType="recommendation" row={a} onChange={reload} /></div>)}</div>}
    </Section>
  </div>;
}

/* ---------------- Jobs: sourced leads ---------------- */
export function JobLeadsPanel() {
  return <div style={{ marginTop: 16 }}><AgentGate><JobLeadsInner /></AgentGate></div>;
}
function JobLeadsInner() {
  const { add } = useStore();
  const [filter, setFilter] = useState("open");
  const { rows, error, reload } = useRows("job_leads", { order: "updated_at", filter: (q) => q.is("deleted_at", null) });
  const shown = rows.filter((r) => filter === "all" || (filter === "open" ? ["new", "verified", "saved"].includes(r["status"]) : r["status"] === filter));
  const track = async (lead: Row) => {
    const app = await add("job_applications", { company: lead["company"], role: lead["title"], location: lead["location"], work_type: lead["work_type"], job_url: lead["official_url"], job_description: lead["summary"], salary_range: lead["salary_range"], date_found: todayIST(), date_applied: null, status: "Saved", recruiter: "", recruiter_linkedin: "", resume_version: "", notes: "Tracked from agent lead. Not applied — apply yourself on the official page.", followup_date: null, priority: "medium" } as never);
    await updateRow("job_leads", lead.id, { status: "saved", application_id: (app as { id: string }).id });
    await insertRow("feedback", { target_type: "job_lead", target_id: lead.id, action: "save", note: "tracked as application" });
    reload();
  };
  return <Section title="Sourced job leads" meta={`${shown.length} shown`} action={<select className="input" style={{ width: 130 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Lead filter"><option value="open">Open</option><option value="verified">Verified</option><option value="saved">Saved</option><option value="applied">Applied</option><option value="dismissed">Dismissed</option><option value="all">All</option></select>}>
    <ErrorLine error={error} />
    {shown.length === 0 ? <Empty title="No job leads" detail="Leads found by your agent appear here with their official link and verification time." /> :
      shown.map((l) => <div className="list-row" key={l.id}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}><div><strong>{l["title"]}</strong> <span className="muted small">· {l["company"]}{l["location"] ? ` · ${l["location"]}` : ""}{l["work_type"] ? ` · ${l["work_type"]}` : ""}</span></div><StatusBadge status={l["status"]} /></div>
        {l["summary"] && <div className="small" style={{ marginTop: 4 }}>{l["summary"]}</div>}
        {l["fit_notes"] && <div className="small muted" style={{ marginTop: 4 }}><strong>Fit{l["fit_is_inference"] ? " (inference)" : ""}:</strong> {l["fit_notes"]}</div>}
        <div className="row small muted" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}><a className="link" href={l["official_url"]} target="_blank" rel="noreferrer noopener">Official posting</a>{l["source_url"] && <a className="link" href={l["source_url"]} target="_blank" rel="noreferrer noopener">Found via</a>}<span>{l["verified_at"] ? `Verified ${ist(l["verified_at"])}` : "Not verified"}</span>{l["posted_at"] && <span>Posted {ist(l["posted_at"], false)}</span>}</div>
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {!l["application_id"] && l["status"] !== "dismissed" && <Button variant="primary" onClick={() => void track(l)}>Track as application</Button>}
          <JobLeadControls lead={l} onChange={reload} />
        </div>
      </div>)}
  </Section>;
}

/* ---------------- Learning ---------------- */
export function LearningPage() {
  return <><PageHeading title="Learning" subtitle="Study queue and history. Agent suggestions are labeled; you decide what to study." /><AgentGate><LearningInner /></AgentGate></>;
}
function LearningInner() {
  const { data, add } = useStore();
  const canon = useCanonical();
  const queue = useRows("study_tasks", { order: "created_at", filter: (q) => q.is("deleted_at", null) });
  const history = useRows("study_history", { order: "occurred_at" });
  const [title, setTitle] = useState(""); const [skill, setSkill] = useState(""); const [mins, setMins] = useState(30); const [err, setErr] = useState("");
  const [logFor, setLogFor] = useState<Row | null>(null); const [logMin, setLogMin] = useState(30); const [logNote, setLogNote] = useState("");
  const open = queue.rows.filter((r) => ["queued", "in_progress", "saved"].includes(r["status"]) && canon.isOpen(r));
  const addTask = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); try { const task = await add("tasks", { title, type: "Learn", status: "backlog", skill_id: skill || null, estimated_minutes: mins, tags: ["study-task"] } as never) as unknown as { id: string } | undefined; await insertRow("study_tasks", { title, skill_id: skill || null, estimated_minutes: mins, consolidated_task_id: task?.id ?? null }); setTitle(""); queue.reload(); } catch (x) { setErr((x as Error).message); } };
  const logDone = async () => { if (!logFor) return; try { await insertRow("study_history", { study_task_id: logFor.id, skill_id: logFor["skill_id"], minutes: logMin, notes: logNote }); await updateRow("study_tasks", logFor.id, { status: "done" }); await insertRow("feedback", { target_type: "study_task", target_id: logFor.id, action: "done", note: `${logMin} min` }); setLogFor(null); setLogNote(""); queue.reload(); history.reload(); } catch (x) { setErr((x as Error).message); } };
  const skillName = (id: string | null) => data.skills.find((s) => s.id === id)?.name;
  const total7 = history.rows.filter((h) => Date.now() - new Date(h["occurred_at"]).getTime() < 7 * 864e5).reduce((a, h) => a + h["minutes"], 0);
  return <div className="grid-main">
    <Section title="Study queue" meta={`${open.length} open`}>
      <form className="section-body row" style={{ flexWrap: "wrap", borderBottom: "1px solid var(--line)" }} onSubmit={(e) => void addTask(e)}>
        <input className="input" style={{ flex: 2, minWidth: 180 }} placeholder="What to study" required value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Study task" />
        <select className="input" style={{ flex: 1, minWidth: 120 }} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Skill"><option value="">No skill</option>{data.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input className="input" type="number" min={0} style={{ width: 80 }} value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Minutes" />
        <Button variant="primary" type="submit">Add</Button>
      </form>
      {err && <p className="error small" style={{ padding: "0 16px" }}>{err}</p>}
      <ErrorLine error={queue.error} />
      {open.length === 0 ? <Empty title="Queue is empty" detail="Add a topic above, or wait for your agent's learning plan." /> : open.map((t) => <div className="list-row" key={t.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{t["title"]}</strong><StatusBadge status={t["status"]} /></div>
        <div className="small muted">{[skillName(t["skill_id"]), `${t["estimated_minutes"]} min`, t["due_date"] && `Due ${ist(t["due_date"], false)}`, t["priority"]].filter(Boolean).join(" · ")}</div>
        {t["detail"] && <div className="small">{t["detail"]}</div>}
        <Provenance row={t} urlKey="resource_url" />
        {canon.taskFor(t) ? <><CanonicalStudyActions task={canon.taskFor(t)!} /><FeedbackControls table="study_tasks" targetType="study_task" row={t} onChange={queue.reload} actions={[{ label: "Save", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} /></>
          : logFor?.id === t.id ? <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}><input className="input" type="number" style={{ width: 80 }} value={logMin} onChange={(e) => setLogMin(Number(e.target.value))} aria-label="Minutes studied" /><input className="input" style={{ flex: 1 }} placeholder="What did you learn?" value={logNote} onChange={(e) => setLogNote(e.target.value)} /><Button variant="primary" onClick={() => void logDone()}>Log & complete</Button><Button onClick={() => setLogFor(null)}>Cancel</Button></div>
          : <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>{t["status"] !== "in_progress" && <Button onClick={() => void updateRow("study_tasks", t.id, { status: "in_progress" }).then(queue.reload)}>Start</Button>}<Button variant="primary" onClick={() => { setLogFor(t); setLogMin(t["estimated_minutes"]); }}>Done…</Button><FeedbackControls table="study_tasks" targetType="study_task" row={t} onChange={queue.reload} actions={[{ label: "Save", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} /></div>}
      </div>)}
    </Section>
    <Section title="Study history" meta={`${total7} min in 7 days`}>
      {history.rows.length === 0 ? <Empty title="No study sessions yet" /> : history.rows.slice(0, 40).map((h) => <div className="list-row small" key={h.id}><div className="row" style={{ justifyContent: "space-between" }}><strong>{queue.rows.find((q) => q.id === h["study_task_id"])?.["title"] ?? skillName(h["skill_id"]) ?? "Study session"}</strong><span className="muted">{h["minutes"]} min</span></div><div className="muted">{ist(h["occurred_at"])}</div>{h["notes"] && <div>{h["notes"]}</div>}</div>)}
    </Section>
  </div>;
}

/* ---------------- Projects: milestones / tasks / evidence ---------------- */
export function ProjectTasksPanel() {
  return <div style={{ marginTop: 16 }}><AgentGate><ProjectTasksInner /></AgentGate></div>;
}
function ProjectTasksInner() {
  const { data } = useStore();
  const { rows, error, reload } = useRows("project_tasks", { order: "created_at", filter: (q) => q.is("deleted_at", null) });
  const [project, setProject] = useState(""); const [title, setTitle] = useState(""); const [kind, setKind] = useState("milestone"); const [url, setUrl] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); try { await insertRow("project_tasks", { project_id: project, title, kind, evidence_url: url }); setTitle(""); setUrl(""); reload(); } catch (x) { setErr((x as Error).message); } };
  const visible = rows.filter((r) => r["status"] !== "dismissed");
  return <Section title="Milestones, tasks & evidence" meta={`${visible.filter((r) => r["status"] === "done").length}/${visible.length} done`}>
    {data.projects.length === 0 ? <Empty title="Create a project first" detail="Milestones and evidence attach to one of your projects." /> : <form className="section-body row" style={{ flexWrap: "wrap", borderBottom: "1px solid var(--line)" }} onSubmit={(e) => void submit(e)}>
      <select className="input" required style={{ minWidth: 150 }} value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project"><option value="">Project…</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <select className="input" style={{ width: 120 }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind"><option value="milestone">Milestone</option><option value="task">Task</option><option value="evidence">Evidence</option></select>
      <input className="input" style={{ flex: 2, minWidth: 160 }} required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      <input className="input" style={{ flex: 1, minWidth: 140 }} type="url" placeholder="Evidence link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Evidence link" />
      <Button variant="primary" type="submit">Add</Button>
    </form>}
    {err && <p className="error small" style={{ padding: "0 16px" }}>{err}</p>}
    <ErrorLine error={error} />
    {visible.length === 0 ? <Empty title="No milestones yet" detail="Add one above; agent suggestions will be labeled." /> : visible.map((t) => <div className="list-row" key={t.id}>
      <div className="row" style={{ justifyContent: "space-between" }}><span className="small"><strong>{t["title"]}</strong> <span className="muted">· {data.projects.find((p) => p.id === t["project_id"])?.name ?? "Project"} · {t["kind"]}</span></span><StatusBadge status={t["status"]} /></div>
      {t["due_date"] && <div className="small muted">Due {ist(t["due_date"], false)}</div>}
      <Provenance row={t} urlKey="evidence_url" />
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{t["status"] === "todo" && <Button style={{ marginTop: 8 }} onClick={() => void updateRow("project_tasks", t.id, { status: "doing" }).then(reload)}>Start</Button>}<FeedbackControls table="project_tasks" targetType="project_task" row={t} onChange={reload} /></div>
    </div>)}
  </Section>;
}

/* ---------------- Networking: outreach drafts + events ---------------- */
export function OutreachPanel() {
  return <div style={{ marginTop: 16 }}><AgentGate><OutreachInner /></AgentGate></div>;
}
function OutreachInner() {
  const drafts = useRows("outreach", { order: "updated_at", filter: (q) => q.is("deleted_at", null) });
  const events = useRows("events", { order: "starts_at", ascending: true, filter: (q) => q.is("deleted_at", null) });
  const contacts = useRows("contacts", { order: "updated_at", filter: (q) => q.is("deleted_at", null) });
  const [editing, setEditing] = useState<string | null>(null); const [text, setText] = useState(""); const [copied, setCopied] = useState("");
  const [respFor, setRespFor] = useState<string | null>(null); const [respDate, setRespDate] = useState(todayIST()); const [respNotes, setRespNotes] = useState(""); const [respErr, setRespErr] = useState("");
  const saveResponse = async (d: Row) => {
    setRespErr("");
    try {
      const at = new Date(`${respDate}T12:00:00+05:30`).toISOString();
      await updateRow("outreach", d.id, { status: "responded", response_received_at: at, response_notes: respNotes.trim() });
      await insertRow("feedback", { target_type: "outreach", target_id: d.id, action: "done", note: `response received ${respDate}${respNotes.trim() ? `: ${respNotes.trim().slice(0, 500)}` : ""}` });
      if (d["contact_id"]) { await insertRow("network_interactions", { contact_id: d["contact_id"], kind: "response", occurred_at: at, notes: respNotes.trim() || `Replied to ${d["channel"]} outreach` }); await updateRow("contacts", d["contact_id"], { last_interaction: respDate }); }
      setRespFor(null); setRespNotes(""); drafts.reload();
    } catch (x) { setRespErr((x as Error).message); }
  };
  const personLink = (d: Row) => { const c = contacts.rows.find((x) => x.id === d["contact_id"]); return d["source_url"] ? { url: d["source_url"], label: "Source", verified: d["verified_at"] } : c?.["linkedin_url"] ? { url: c["linkedin_url"], label: "Profile", verified: null } : null; };
  const open = drafts.rows.filter((d) => d["status"] !== "dismissed");
  return <div className="grid-two">
    <Section title="Outreach drafts" meta="Never sent automatically">
      <ErrorLine error={drafts.error} />
      {open.length === 0 ? <Empty title="No outreach drafts" detail="Drafts from your agent appear here for review. You send them yourself." /> : open.map((d) => <div className="list-row" key={d.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{d["recipient"] || "Contact"} · {d["channel"]}</strong><StatusBadge status={d["status"]} /></div>
        {d["subject"] && <div className="small"><strong>{d["subject"]}</strong></div>}
        {editing === d.id ? <><textarea className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} aria-label="Draft text" /><div className="row" style={{ marginTop: 6 }}><Button variant="primary" onClick={() => void updateRow("outreach", d.id, { draft: text, source: "user" }).then(() => { setEditing(null); drafts.reload(); })}>Save draft</Button><Button onClick={() => setEditing(null)}>Cancel</Button></div></>
          : <p className="small" style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{d["draft"]}</p>}
        {d["reason"] && <div className="small muted">Why{d["is_inference"] ? " (inference)" : ""}: {d["reason"]}</div>}
        {(() => { const l = personLink(d); return <div className="row small muted" style={{ gap: 8, marginTop: 4, flexWrap: "wrap" }}>{d["source"] === "agent" && <span>Agent</span>}{l ? <><a className="link" href={l.url} target="_blank" rel="noreferrer noopener">{l.label} for {d["recipient"] || "this person"}</a>{l.label === "Source" && <span>{l.verified ? `Verified ${ist(l.verified)}` : "Not verified"}</span>}</> : <span>No source link for this person/community</span>}</div>; })()}
        {d["sent_at"] && <div className="small muted">Sent by you {ist(d["sent_at"])}</div>}
        {d["status"] === "responded" && <div className="small" style={{ marginTop: 4 }}><strong>Response received {ist(d["response_received_at"], false)}</strong>{d["response_notes"] && <span className="muted"> · {d["response_notes"]}</span>}</div>}
        {respFor === d.id && <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <input className="input" type="date" style={{ width: 160 }} aria-label="Response date" value={respDate} max={todayIST()} onChange={(e) => setRespDate(e.target.value)} />
          <input className="input" style={{ flex: 1, minWidth: 180 }} aria-label="Response notes" placeholder="What did they say? (optional)" value={respNotes} onChange={(e) => setRespNotes(e.target.value)} />
          <Button variant="primary" onClick={() => void saveResponse(d)}>Save response</Button><Button onClick={() => setRespFor(null)}>Cancel</Button>
          {respErr && <span className="error small">{respErr}</span>}
        </div>}
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {d["status"] === "sent_manually" && respFor !== d.id && <Button variant="primary" onClick={() => { setRespFor(d.id); setRespDate(todayIST()); setRespNotes(""); }}>Received response</Button>}
          <Button onClick={() => { setEditing(d.id); setText(d["draft"]); }}>Edit</Button>
          <Button onClick={() => void navigator.clipboard.writeText(d["draft"]).then(() => setCopied(d.id))}>{copied === d.id ? "Copied" : "Copy"}</Button>
          <FeedbackControls table="outreach" targetType="outreach" row={d} onChange={drafts.reload} actions={[{ label: "Approve", status: "approved", feedback: "save" }, { label: "I sent it", status: "sent_manually", feedback: "done" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />
        </div>
      </div>)}
    </Section>
    <Section title="Events" meta="Asia/Kolkata">
      <ErrorLine error={events.error} />
      {events.rows.filter((e) => e["status"] !== "dismissed").length === 0 ? <Empty title="No events" detail="Sourced events appear here. Registration is always yours to do." /> : events.rows.filter((e) => e["status"] !== "dismissed").map((e) => <div className="list-row" key={e.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{e["title"]}</strong><StatusBadge status={e["status"]} /></div>
        <div className="small muted">{[ist(e["starts_at"]), e["organizer"], e["location"]].filter((v) => v && v !== "—").join(" · ")}</div>
        {e["url"] && <a className="link small" href={e["url"]} target="_blank" rel="noreferrer noopener">Event page</a>}
        <Provenance row={e} />
        <FeedbackControls table="events" targetType="event" row={e} onChange={events.reload} actions={[{ label: "Save", status: "saved", feedback: "save" }, { label: "I registered", status: "registered_manually", feedback: "done" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />
      </div>)}
    </Section>
  </div>;
}

/* ---------------- Vault ---------------- */
export function VaultPage() {
  return <><PageHeading title="Vault" subtitle="Documents you hand to the agent, and claims that need your confirmation." /><AgentGate><VaultInner /></AgentGate></>;
}
function VaultInner() {
  const docs = useRows("source_documents", { order: "created_at", filter: (q) => q.is("deleted_at", null) });
  const claims = useRows("uncertain_claims", { order: "created_at", filter: (q) => q.is("deleted_at", null) });
  const [title, setTitle] = useState(""); const [kind, setKind] = useState("resume"); const [url, setUrl] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      let storage_path = "";
      if (file) {
        const client = authSupabase(); const { data: auth } = await client.auth.getUser();
        storage_path = `${auth.user!.id}/${crypto.randomUUID()}/${file.name.replace(/[^\w.-]+/g, "_")}`;
        const { error } = await client.storage.from("career-evidence").upload(storage_path, file);
        if (error) throw new Error(error.message);
      }
      const doc = await insertRow("source_documents", { title, kind, url, storage_path, status: "pending" });
      await queueCommand("reprocess_document", "vault_intake", { document_id: doc.id });
      setTitle(""); setUrl(""); setFile(null); setMsg("Added. The agent will pick it up on its next poll."); docs.reload();
    } catch (x) { setMsg((x as Error).message); }
    setBusy(false);
  };
  const openFile = async (path: string) => { const { data } = await authSupabase().storage.from("career-evidence").createSignedUrl(path, 300); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener"); };
  const openClaims = claims.rows.filter((c) => c["status"] === "open");
  return <div className="grid-main">
    <div className="stack">
      <Section title="Intake">
        <form className="section-body stack" style={{ gap: 10 }} onSubmit={(e) => void submit(e)}>
          <div className="row" style={{ flexWrap: "wrap" }}><input className="input" style={{ flex: 2, minWidth: 180 }} required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Document title" /><select className="input" style={{ flex: 1 }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Document kind">{["resume", "job_description", "certificate", "article", "note", "transcript", "other"].map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select></div>
          <div className="row" style={{ flexWrap: "wrap" }}><input className="input" style={{ flex: 1, minWidth: 180 }} type="url" placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Document link" /><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Upload file" /></div>
          <div className="row"><Button variant="primary" disabled={busy} type="submit">{busy ? "Saving…" : "Add to vault"}</Button>{msg && <span className="small muted">{msg}</span>}</div>
        </form>
      </Section>
      <Section title="Documents" meta={`${docs.rows.length}`}>
        <ErrorLine error={docs.error} />
        {docs.rows.length === 0 ? <Empty title="Vault is empty" detail="Add a resume, job description, or certificate above." /> : docs.rows.map((d) => <div className="list-row" key={d.id}>
          <div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{d["title"]} <span className="muted">· {d["kind"]}</span></strong><StatusBadge status={d["status"]} /></div>
          <div className="small muted">Added {ist(d["created_at"])}</div>
          {d["summary"] && <div className="small" style={{ whiteSpace: "pre-wrap" }}>{d["summary"]}</div>}
          {d["agent_summary"] && <div className="small" style={{ whiteSpace: "pre-wrap" }}><span className="muted">Agent summary (inference){d["processed_at"] ? ` · ${ist(d["processed_at"])}` : ""}:</span> {d["agent_summary"]}</div>}
          <div className="row small" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>{d["url"] && <a className="link" href={d["url"]} target="_blank" rel="noreferrer noopener">Link</a>}{d["storage_path"] && <button className="link" style={{ border: 0, background: "none" }} onClick={() => void openFile(d["storage_path"])}>Open file</button>}
            <Button onClick={() => void queueCommand("reprocess_document", "vault_intake", { document_id: d.id }).then(() => updateRow("source_documents", d.id, { status: "pending" })).then(docs.reload)}>Reprocess</Button>
            {d["status"] !== "archived" && <Button onClick={() => void updateRow("source_documents", d.id, { status: "archived" }).then(docs.reload)}>Archive</Button>}</div>
        </div>)}
      </Section>
    </div>
    <Section title="Needs your confirmation" meta={`${openClaims.length} open`}>
      <ErrorLine error={claims.error} />
      {claims.rows.length === 0 ? <Empty title="No uncertain claims" detail="When the agent isn't sure about a fact, it asks here instead of guessing." /> : claims.rows.map((c) => <div className="list-row" key={c.id}>
        <div className="row" style={{ justifyContent: "space-between" }}><strong className="small">{c["claim"]}</strong><StatusBadge status={c["status"]} /></div>
        {c["context"] && <div className="small muted">{c["context"]}</div>}
        <div className="small muted">Agent confidence {c["confidence"]}%</div>
        <Provenance row={c} />
        <FeedbackControls table="uncertain_claims" targetType="uncertain_claim" row={c} onChange={claims.reload} actions={[{ label: "Confirm", status: "confirmed", feedback: "useful" as never }, { label: "Reject", status: "rejected", feedback: "not_useful" as never }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />
      </div>)}
    </Section>
  </div>;
}

/* ---------------- Agent Activity ---------------- */
export const SPECIALISTS: Array<[string, string]> = [["study_coach", "Study coach"], ["project_builder", "Project builder"], ["job_hunter", "Job hunter"], ["networking_advisor", "Networking advisor"], ["interview_coach", "Interview coach"], ["certification_event_scout", "Certification & event scout"], ["vault_intake", "Vault intake"]];
const WORKFLOWS = ["orchestrator", ...SPECIALISTS.map(([id]) => id)];
export function AgentActivityPage() {
  return <><PageHeading title="Agent Activity" subtitle="Runs, failures, usage, deliveries and your command queue. Times in Asia/Kolkata." /><AgentGate><ActivityInner /></AgentGate></>;
}
function ActivityInner() {
  const runs = useRows("agent_runs", { order: "started_at", limit: 200 });
  const cmds = useRows("agent_commands", { order: "created_at", limit: 50 });
  const notes = useRows("agent_notifications", { order: "created_at", limit: 50 });
  const audit = useRows("audit_events", { order: "created_at", limit: 60 });
  const [msg, setMsg] = useState("");
  const workflows = useMemo(() => Array.from(new Set([...WORKFLOWS, ...runs.rows.map((r) => r["workflow"])])), [runs.rows]);
  const runNow = async (wf: string) => { setMsg(""); try { await queueCommand("run_now", wf); setMsg(`Queued ${wf.replaceAll("_", " ")}. The worker claims it on its next poll.`); cmds.reload(); } catch (x) { setMsg((x as Error).message); } };
  const usage = runs.rows.reduce((acc, r) => { const u = r["usage"] ?? {}; acc.tokens += Number(u["input_tokens"] ?? 0) + Number(u["output_tokens"] ?? 0); acc.cost += Number(u["cost_usd"] ?? 0); return acc; }, { tokens: 0, cost: 0 });
  const failures = runs.rows.filter((r) => r["status"] === "failed");
  const owner = useRows("agent_owner", { order: "bound_at", limit: 1 });
  const prefs = useRows("career_preferences", { order: "created_at", limit: 1 });
  const paused: string[] = prefs.rows[0]?.["paused_workflows"] ?? [];
  const linked = !!owner.rows[0];
  return <div className="stack">
    {!owner.loading && !linked && <div className="alert"><strong>Not linked.</strong> No agent is linked to this account yet, so nothing runs or gets delivered. Link it in Settings.</div>}
    {msg && <div className="alert">{msg}</div>}
    <Section title="Workflows" meta={`${runs.rows.length} runs · ${usage.tokens.toLocaleString("en-IN")} tokens · $${usage.cost.toFixed(2)}`}>
      <ErrorLine error={runs.error} />
      <div style={{ overflowX: "auto" }}><table className="data-table"><thead><tr><th align="left">Workflow</th><th align="left">Last run</th><th align="left">Status</th><th align="left">Next run</th><th /></tr></thead><tbody>
        {workflows.map((wf) => { const last = runs.rows.find((r) => r["workflow"] === wf); return <tr key={wf}><td><code>{wf}</code>{(paused.includes(wf) || (wf !== "orchestrator" && prefs.rows[0]?.["agent_paused"])) && <span className="muted"> · paused</span>}</td><td>{last ? ist(last["started_at"]) : "Never"}</td><td>{last ? <StatusBadge status={last["status"]} /> : <span className="muted">—</span>}</td><td>{last?.["next_run_at"] ? ist(last["next_run_at"]) : "—"}</td><td align="right"><Button disabled={!linked} onClick={() => void runNow(wf)}>Run now</Button></td></tr>; })}
      </tbody></table></div>
    </Section>
    <div className="grid-two">
      <Section title="Recent runs" meta={`${failures.length} failed`}>
        {runs.rows.length === 0 ? <Empty title="No runs reported yet" detail="Once the worker is connected, every run appears here." /> : runs.rows.slice(0, 30).map((r) => <div className="list-row small" key={r.id}>
          <div className="row" style={{ justifyContent: "space-between" }}><strong>{r["workflow"].replaceAll("_", " ")}</strong><StatusBadge status={r["status"]} /></div>
          <div className="muted">{ist(r["started_at"])}{r["finished_at"] ? ` → ${ist(r["finished_at"])}` : ""}</div>
          {r["error"] && <div className="error">{r["error"]}</div>}
          {Object.keys(r["usage"] ?? {}).length > 0 && <div className="muted">Usage: {Object.entries(r["usage"]).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>}
          {Object.keys(r["delivery"] ?? {}).length > 0 && <div className="muted">Delivery: {Object.entries(r["delivery"]).map(([k, v]) => `${k} ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ")}</div>}
        </div>)}
      </Section>
      <Section title="Command queue">
        <ErrorLine error={cmds.error} />
        {cmds.rows.length === 0 ? <Empty title="No commands" detail="Run now and pause requests appear here until the worker claims them." /> : cmds.rows.map((c) => <div className="list-row small" key={c.id}>
          <div className="row" style={{ justifyContent: "space-between" }}><strong>{c["command"].replaceAll("_", " ")} · {c["workflow"]}</strong><StatusBadge status={c["status"]} /></div>
          <div className="muted">Queued {ist(c["created_at"])}{c["claimed_at"] ? ` · claimed ${ist(c["claimed_at"])}` : ""}{c["completed_at"] ? ` · finished ${ist(c["completed_at"])}` : ""}</div>
          {c["status"] === "queued" && <Button style={{ marginTop: 6 }} onClick={() => void updateRow("agent_commands", c.id, { status: "cancelled" }).then(cmds.reload)}>Cancel</Button>}
        </div>)}
      </Section>
      <Section title="Notifications & delivery">
        {notes.rows.length === 0 ? <Empty title="No notifications" /> : notes.rows.map((n) => <div className="list-row small" key={n.id} style={{ opacity: n["read_at"] ? 0.65 : 1 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><strong>{n["title"]}</strong><StatusBadge status={n["delivery_status"]} /></div>
          <div className="muted">{n["channel"]} · {ist(n["delivered_at"] ?? n["created_at"])}</div>{n["body"] && <div>{n["body"]}</div>}
          {!n["read_at"] && <button className="link" style={{ border: 0, background: "none", padding: 0 }} onClick={() => void updateRow("agent_notifications", n.id, { read_at: new Date().toISOString() }).then(notes.reload)}>Mark read</button>}
        </div>)}
      </Section>
      <Section title="Audit trail">
        {audit.rows.length === 0 ? <Empty title="No audit events yet" /> : audit.rows.map((a) => <div className="list-row small" key={a.id}><strong>{a["actor"]}</strong> {a["action"]} {a["entity_type"].replaceAll("_", " ")}{a["detail"]?.["status"] ? ` → ${a["detail"]["status"]}` : ""} <span className="muted">· {ist(a["created_at"])}</span></div>)}
      </Section>
    </div>
  </div>;
}

/* ---------------- Settings: preferences, pause, owner link ---------------- */
export function AgentSettingsPanel() {
  return <div style={{ marginTop: 16 }}><AgentGate><AgentSettingsInner /></AgentGate></div>;
}
function AgentSettingsInner() {
  const { user } = useStore();
  const prefs = useRows("career_preferences", { order: "created_at", limit: 1 });
  const owner = useRows("agent_owner", { order: "bound_at", limit: 1 });
  const p = prefs.rows[0];
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState("");
  const values = form ?? { target_roles: (p?.["target_roles"] ?? []).join(", "), locations: (p?.["locations"] ?? []).join(", "), work_types: (p?.["work_types"] ?? []).join(", "), min_salary: p?.["min_salary"] ?? "", avoid_companies: (p?.["avoid_companies"] ?? []).join(", "), focus_skills: (p?.["focus_skills"] ?? []).join(", "), briefing_time: p?.["briefing_time"] ?? "07:00", study_minutes: String(p?.["study_minutes"] ?? 45), research_sources: (p?.["research_sources"] ?? []).join("\n"), notes: p?.["notes"] ?? "" };
  const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    const mins = Number(values.study_minutes);
    if (!Number.isInteger(mins) || mins < 30 || mins > 60) { setMsg("Study time must be a whole number between 30 and 60 minutes."); return; }
    const row = { study_minutes: mins, research_sources: values.research_sources.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean), target_roles: list(values.target_roles), locations: list(values.locations), work_types: list(values.work_types), min_salary: values.min_salary, avoid_companies: list(values.avoid_companies), focus_skills: list(values.focus_skills), briefing_time: values.briefing_time, notes: values.notes, timezone: "Asia/Kolkata" };
    try { if (p) await updateRow("career_preferences", p.id, row); else await insertRow("career_preferences", row); await queueCommand("refresh_preferences"); setForm(null); setMsg("Saved. The agent reads these on its next poll."); prefs.reload(); } catch (x) { setMsg((x as Error).message); }
  };
  const togglePause = async () => {
    setMsg("");
    const next = !(p?.["agent_paused"] ?? false);
    try { if (p) await updateRow("career_preferences", p.id, { agent_paused: next }); else await insertRow("career_preferences", { agent_paused: next }); await queueCommand(next ? "pause" : "resume"); prefs.reload(); setMsg(next ? "Agent paused." : "Agent resumed."); } catch (x) { setMsg((x as Error).message); }
  };
  const pausedList: string[] = p?.["paused_workflows"] ?? [];
  const toggleWorkflow = async (wf: string) => {
    setMsg("");
    const next = pausedList.includes(wf) ? pausedList.filter((w) => w !== wf) : [...pausedList, wf];
    try { if (p) await updateRow("career_preferences", p.id, { paused_workflows: next }); else await insertRow("career_preferences", { paused_workflows: next }); await queueCommand("refresh_preferences", wf); prefs.reload(); setMsg(`${wf} ${next.includes(wf) ? "paused" : "resumed"}. The agent picks this up on its next poll.`); } catch (x) { setMsg((x as Error).message); }
  };
  const link = async () => { setMsg(""); const { error } = await authSupabase().rpc("claim_agent_owner"); if (error) setMsg(error.message); else { setMsg("Agent linked to this account."); owner.reload(); } };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...values, [k]: e.target.value });
  return <div className="stack">
    <Section title="Agent" meta={!owner.rows[0] ? "Not linked" : p?.["agent_paused"] ? "Paused" : "Linked"} action={<Button onClick={() => void togglePause()}>{p?.["agent_paused"] ? "Resume agent" : "Pause agent"}</Button>}>
      <div className="section-body small">
        {owner.rows[0] ? <p style={{ margin: 0 }}>Linked to this account since {ist(owner.rows[0]["bound_at"])}. Agent results are written only here.</p>
          : <><p style={{ margin: "0 0 8px" }}>No agent is linked to this account. Only the designated owner account ({user?.email === "manojkumar9080@gmail.com" ? "this account" : "manojkumar9080@gmail.com"}) can link it.</p><Button variant="primary" onClick={() => void link()}>Link agent to my account</Button></>}
        {msg && <p className="muted" style={{ margin: "8px 0 0" }}>{msg}</p>}
      </div>
    </Section>
    <Section title="Specialist workflows" meta={`${pausedList.length} paused`}>
      <div className="section-body small">
        {SPECIALISTS.map(([id, label]) => { const off = pausedList.includes(id); return <div className="row" key={id} style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <div><strong>{label}</strong> <code className="muted">{id}</code></div>
          <div className="row" style={{ gap: 8 }}><StatusBadge status={off ? "paused" : "active"} /><Button aria-label={`${off ? "Resume" : "Pause"} ${label}`} onClick={() => void toggleWorkflow(id)}>{off ? "Resume" : "Pause"}</Button></div>
        </div>; })}
      </div>
    </Section>
    <NotificationStatus />
    <Section title="Career preferences" meta="Read by the agent on every poll">
      <form className="section-body form-grid" onSubmit={(e) => void save(e)}>
        <Field label="Target roles (comma separated)" name="pref-roles"><input id="pref-roles" className="input" value={values.target_roles} onChange={set("target_roles")} /></Field>
        <Field label="Locations" name="pref-loc"><input id="pref-loc" className="input" value={values.locations} onChange={set("locations")} /></Field>
        <Field label="Work types" name="pref-wt"><input id="pref-wt" className="input" placeholder="remote, hybrid" value={values.work_types} onChange={set("work_types")} /></Field>
        <Field label="Minimum salary" name="pref-sal"><input id="pref-sal" className="input" value={values.min_salary} onChange={set("min_salary")} /></Field>
        <Field label="Companies to avoid" name="pref-avoid"><input id="pref-avoid" className="input" value={values.avoid_companies} onChange={set("avoid_companies")} /></Field>
        <Field label="Focus skills" name="pref-skills"><input id="pref-skills" className="input" value={values.focus_skills} onChange={set("focus_skills")} /></Field>
        <Field label="Briefing time (IST)" name="pref-time"><input id="pref-time" className="input" type="time" value={values.briefing_time} onChange={set("briefing_time")} /></Field>
        <Field label="Daily study time (minutes, 30–60)" name="pref-study"><input id="pref-study" className="input" type="number" min={30} max={60} step={5} value={values.study_minutes} onChange={set("study_minutes")} /></Field>
        <Field label="Preferred research sources (one per line)" name="pref-sources" full><textarea id="pref-sources" className="input" rows={3} placeholder={"docs.aws.amazon.com\nnews.ycombinator.com"} value={values.research_sources} onChange={set("research_sources")} /></Field>
        <Field label="Notes for the agent" name="pref-notes" full><textarea id="pref-notes" className="input" rows={3} value={values.notes} onChange={set("notes")} /></Field>
        <div><Button variant="primary" type="submit">Save preferences</Button></div>
      </form>
    </Section>
  </div>;
}
/* ---------------- Notification destination (read-only) ---------------- */
function useNotificationConfig() {
  const runs = useRows("agent_runs", { order: "started_at", limit: 50 });
  const r = runs.rows.find((x) => x["delivery"] && typeof x["delivery"]["notification"] === "object" && x["delivery"]["notification"] !== null);
  const n = r?.["delivery"]["notification"];
  return { loading: runs.loading, configured: !!n?.["configured"], channel: n?.["channel"] ? String(n["channel"]) : "", label: n?.["destination_label"] ? String(n["destination_label"]).slice(0, 80) : "", at: r?.["started_at"] as string | undefined };
}
function NotificationStatus() {
  const c = useNotificationConfig();
  return <Section title="Notification destination" meta="Read-only · set on the worker">
    <div className="section-body small">
      {c.loading ? <span className="muted">Checking…</span> : c.configured
        ? <p style={{ margin: 0 }}><StatusBadge status="configured" /> {c.channel}{c.label ? ` · ${c.label}` : ""} <span className="muted">· reported {ist(c.at)}</span></p>
        : <p style={{ margin: 0 }}><StatusBadge status="not configured" /> Not configured on Hermes</p>}
      <p className="muted" style={{ margin: "6px 0 0" }}>Bot tokens and destinations stay on the Linux worker; this app never stores them.</p>
    </div>
  </Section>;
}

/* ---------------- Dashboard: morning briefing schedule ---------------- */
function nextDueIST(time: string) {
  const [h, m] = (time || "07:00").split(":").map(Number);
  const nowIst = new Date(Date.now() + 330 * 60000);
  const due = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate(), h, m) - 330 * 60000);
  if (due.getTime() <= Date.now()) due.setUTCDate(due.getUTCDate() + 1);
  return due;
}
function BriefingSchedule() {
  const prefs = useRows("career_preferences", { order: "created_at", limit: 1 });
  const owner = useRows("agent_owner", { order: "bound_at", limit: 1 });
  const runs = useRows("agent_runs", { order: "started_at", limit: 20, filter: (q) => q.eq("workflow", "morning_briefing") });
  const notif = useNotificationConfig();
  const p = prefs.rows[0];
  const saved = p?.["briefing_time"]?.slice(0, 5) ?? "07:00";
  const [time, setTime] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const value = time ?? saved;
  const paused = !!p?.["agent_paused"] || (p?.["paused_workflows"] ?? []).includes("orchestrator");
  const last = runs.rows[0];
  const status = !owner.rows[0] ? "Not linked — no briefing will be sent" : paused ? "Paused — briefing won't be sent" : !notif.configured ? "Scheduled · delivery not configured on Hermes (in-app only)" : `Scheduled · delivers via ${notif.channel || "worker"}`;
  const save = async () => {
    setMsg("");
    try { if (p) await updateRow("career_preferences", p.id, { briefing_time: value, timezone: "Asia/Kolkata" }); else await insertRow("career_preferences", { briefing_time: value, timezone: "Asia/Kolkata" }); await queueCommand("refresh_preferences", "orchestrator"); setTime(null); prefs.reload(); setMsg("Saved. The worker picks this up on its next poll."); } catch (x) { setMsg((x as Error).message); }
  };
  return <Section title="Morning briefing schedule" meta={`${value} Asia/Kolkata`}>
    <div className="section-body small">
      <p style={{ margin: "0 0 8px" }}><strong>{status}</strong></p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label htmlFor="brief-time" className="muted">Send at (IST)</label>
        <input id="brief-time" className="input" type="time" style={{ width: 130 }} value={value} onChange={(e) => setTime(e.target.value)} />
        <Button disabled={value === saved} onClick={() => void save()}>Save time</Button>
        {saved !== "07:00" && <Button onClick={() => setTime("07:00")}>Use 07:00 default</Button>}
      </div>
      <p className="muted" style={{ margin: "8px 0 0" }}>Next due {ist(nextDueIST(saved).toISOString())} · last briefing run {last ? `${ist(last["started_at"])} (${last["status"]})` : "never"}. The Linux worker sends it at the due time; this page never sends anything.</p>
      {msg && <p className="muted" style={{ margin: "6px 0 0" }}>{msg}</p>}
    </div>
  </Section>;
}
export { noop };

/** Save only bookmarks a lead. "I applied" is an explicit owner confirmation that atomically creates/links one application. */
function JobLeadControls({ lead, onChange }: { lead: Row; onChange: () => void }) {
  const { refresh } = useStore();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const applied = lead["status"] === "applied";
  const confirm = async () => {
    setBusy(true); setErr("");
    const { error } = await (authSupabase() as any).rpc("mark_job_lead_applied", { p_lead: lead.id, p_notes: notes });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false); setNotes(""); onChange(); void refresh();
  };
  return <div style={{ width: "100%" }}>
    <FeedbackControls table="job_leads" targetType="job_lead" row={lead} onChange={onChange} actions={applied ? [] : [{ label: "Save for later", status: "saved", feedback: "save" }, { label: "Dismiss", status: "dismissed", feedback: "dismiss" }]} />
    {applied ? <div className="small muted" style={{ marginTop: 6 }}>Applied · tracked in Job Applications</div>
      : open ? <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Optional notes (resume version, referral…)" value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} aria-label="Application notes" />
          <Button variant="primary" disabled={busy} onClick={() => void confirm()}>Confirm I applied</Button><Button onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      : <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}><Button onClick={() => setOpen(true)}>I applied…</Button><span className="small muted">Saving does not mean applied. Apply yourself on the official page.</span></div>}
    {err && <span className="error small">{err}</span>}
  </div>;
}

