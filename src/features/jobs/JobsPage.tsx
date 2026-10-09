import { aiHeaders } from "@/lib/ai-headers";
import { useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, PageHeading, Section, dateLabel } from "@/components/ui";
import { analyzeJobDescription, assessRequirements } from "@/lib/domain/jobGap";
import { localDay } from "@/lib/domain/insights";
import { JobApplication, ApplicationStatus } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

const stages: ApplicationStatus[] = ["Saved", "Planning to Apply", "Applied", "Recruiter Contact", "Screening", "Technical Interview", "Hiring Manager", "Final Round", "Offer", "Rejected", "Withdrawn"];
const later = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return localDay(date); };

export function JobsPage() {
  const { data, add, update, hosted } = useStore();
  const [view, setView] = useState<"List" | "Kanban">("List");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [planPreview, setPlanPreview] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [signals, setSignals] = useState<{ experience_signals: string[]; responsibilities: string[] } | null>(null);
  const job = data.job_applications.find((item) => item.id === selected) ?? data.job_applications[0];
  const extracted = data.job_skill_requirements.filter((item) => item.application_id === job?.id);
  const gap = job ? extracted.length ? assessRequirements(extracted.map((item) => item.skill_name), data) : analyzeJobDescription(job.job_description, data) : [];
  const planName = job ? `Close gaps for ${job.company} · ${job.role}` : "";
  const planExists = data.goals.some((goal) => goal.title === planName);
  const needsPlan = gap.filter((item) => item.assessment === "Gap" || item.assessment === "Unknown").slice(0, 6);

  const save = async () => {
    if (company.trim().length < 2 || role.trim().length < 2) { setError("Enter a company and role."); return; }
    try {
      const created = await add("job_applications", { company: company.trim(), role: role.trim(), location: location.trim(), work_type: "", job_url: url.trim(), job_description: description.trim(), salary_range: "", date_found: localDay(), date_applied: null, status: "Saved", recruiter: "", recruiter_linkedin: "", resume_version: "", notes: "", followup_date: null, priority: "medium" });
      setSelected(created.id); setAdding(false); setCompany(""); setRole(""); setLocation(""); setUrl(""); setDescription(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add application."); }
  };
  const moveStage = async (item: JobApplication, status: ApplicationStatus) => {
    try { await update("job_applications", item.id, { status, date_applied: status === "Applied" && !item.date_applied ? localDay() : item.date_applied }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not move application."); }
  };
  const analyzeWithAI = async () => {
    if (!job) return;
    setAnalyzing(true); setError("");
    try {
      const response = await fetch("/api/ai/analyze-jd", { method: "POST", headers: await aiHeaders(), body: JSON.stringify({ description: job.job_description }) });
      const payload = await response.json() as { error?: string; required_skills?: string[]; preferred_skills?: string[]; tools?: string[]; cloud_requirements?: string[]; experience_signals?: string[]; responsibilities?: string[] };
      if (!response.ok) throw new Error(payload.error ?? "Could not analyze the job description.");
      const groups = [["required", payload.required_skills ?? []], ["preferred", payload.preferred_skills ?? []], ["tool", payload.tools ?? []], ["cloud", payload.cloud_requirements ?? []]] as const;
      for (const [requirement_type, names] of groups) for (const skill_name of names) {
        if (extracted.some((item) => item.skill_name.toLowerCase() === skill_name.toLowerCase())) continue;
        const skill = data.skills.find((item) => item.name.toLowerCase() === skill_name.toLowerCase());
        await add("job_skill_requirements", { application_id: job.id, skill_name, requirement_type, skill_id: skill?.id ?? null, assessment: skill ? "Developing" : "Gap" });
      }
      setSignals({ experience_signals: payload.experience_signals ?? [], responsibilities: payload.responsibilities ?? [] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI analysis failed."); }
    finally { setAnalyzing(false); }
  };
  const createPlan = async () => {
    if (!job || !needsPlan.length || planExists) return;
    try {
      const goal = await add("goals", { title: planName, description: `Evidence-backed preparation for ${job.role}.`, goal_type: "monthly", parent_goal_id: null, target_date: later(30), status: "active", reason: `Prepare for ${job.company}.`, success_criteria: `Demonstrate the missing requirements through practice or project proof.` });
      const milestone = await add("milestones", { goal_id: goal.id, title: "Address priority gaps", due_date: later(14), status: "pending", success_criteria: "Each gap has a concrete practice or build artifact." });
      for (const item of needsPlan) {
        await add("tasks", { title: `Learn ${item.name} for ${job.company}`, description: `Review the requirement in the job description and save evidence of learning.`, type: "Learn", status: "week", priority: "medium", estimated_minutes: 60, actual_minutes: 0, due_date: later(14), scheduled_date: null, scheduled_start: null, scheduled_end: null, skill_id: data.skills.find((skill) => skill.name === item.name)?.id ?? null, project_id: null, goal_id: goal.id, milestone_id: milestone.id, application_id: job.id, contact_id: null, completed_at: null, sort_order: data.tasks.length + 1, tags: ["job-gap"], recurrence: null, evidence_required: true });
        await add("tasks", { title: `Practice ${item.name} interview questions`, description: `Explain the concept and a concrete implementation trade-off.`, type: "Interview", status: "week", priority: "medium", estimated_minutes: 45, actual_minutes: 0, due_date: later(21), scheduled_date: null, scheduled_start: null, scheduled_end: null, skill_id: data.skills.find((skill) => skill.name === item.name)?.id ?? null, project_id: null, goal_id: goal.id, milestone_id: milestone.id, application_id: job.id, contact_id: null, completed_at: null, sort_order: data.tasks.length + 2, tags: ["job-gap"], recurrence: null, evidence_required: false });
      }
      setPlanPreview(false); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create gap plan."); }
  };

  return <><PageHeading title="Job applications" subtitle="Track the pipeline and prepare against actual role requirements."><Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} />Add application</Button></PageHeading>
    <div className="row-between" style={{ marginBottom: 15 }}><div className="tabs"><button className={view === "List" ? "active" : ""} onClick={() => setView("List")}>List</button><button className={view === "Kanban" ? "active" : ""} onClick={() => setView("Kanban")}>Kanban</button></div><span className="small muted">{data.job_applications.length} applications</span></div>
    {error && <div className="alert" style={{ marginBottom: 13 }}>{error}</div>}
    {view === "List" ? <Section title="Pipeline"><div className="table-wrap"><table className="data-table"><thead><tr><th>Company & role</th><th>Stage</th><th>Location</th><th>Priority</th><th>Follow-up</th><th>Open</th></tr></thead><tbody>{data.job_applications.map((item) => <tr key={item.id}><td><strong>{item.company}</strong><div className="muted">{item.role}</div></td><td><select className="select" aria-label={`Stage for ${item.company}`} style={{ minWidth: 150 }} value={item.status} onChange={(event) => void moveStage(item, event.target.value as ApplicationStatus)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></td><td>{item.location || "—"}</td><td><Badge tone={item.priority === "high" ? "amber" : "default"}>{item.priority}</Badge></td><td>{dateLabel(item.followup_date)}</td><td><Button variant="quiet" onClick={() => { setSelected(item.id); document.getElementById("job-detail")?.scrollIntoView({ behavior: "smooth" }); }}>Details</Button></td></tr>)}</tbody></table>{!data.job_applications.length && <Empty title="No applications yet" detail="Save a role, then move it through the pipeline." />}</div></Section>
      : <div className="kanban">{stages.map((stage) => <div className="kanban-col" key={stage}><div className="kanban-head row-between"><span>{stage}</span><span className="badge">{data.job_applications.filter((item) => item.status === stage).length}</span></div>{data.job_applications.filter((item) => item.status === stage).map((item) => <button className="kanban-card" style={{ display: "block", textAlign: "left", width: "calc(100% - 16px)", color: "var(--text)" }} key={item.id} onClick={() => setSelected(item.id)}><strong>{item.company}</strong><div className="micro muted" style={{ margin: "4px 0 8px" }}>{item.role}</div><select className="select" aria-label={`Move ${item.company}`} value={item.status} onClick={(event) => event.stopPropagation()} onChange={(event) => void moveStage(item, event.target.value as ApplicationStatus)}>{stages.map((next) => <option key={next}>{next}</option>)}</select></button>)}</div>)}</div>}
    {job && <div id="job-detail" style={{ marginTop: 17 }} className="grid-main"><div className="stack"><Section title={`${job.company} · ${job.role}`} action={<Badge tone="blue">{job.status}</Badge>}><div className="section-body"><div className="row-between small muted"><span>{job.location || "Location not entered"} · {job.work_type || "Work type open"}</span><span>Found {dateLabel(job.date_found)}</span></div><div className="row" style={{ marginTop: 12 }}>{job.job_url && <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="link small row">Job posting <ExternalLink size={12} /></a>}{job.resume_version && <span className="small muted">Resume: {job.resume_version}</span>}</div><div className="form-grid" style={{ marginTop: 16 }}><Field label="Follow-up" name="job-followup"><input id="job-followup" type="date" className="input" value={job.followup_date ?? ""} onChange={(event) => void update("job_applications", job.id, { followup_date: event.target.value || null })} /></Field><Field label="Priority" name="job-priority"><select id="job-priority" className="select" value={job.priority} onChange={(event) => void update("job_applications", job.id, { priority: event.target.value as JobApplication["priority"] })}><option>low</option><option>medium</option><option>high</option></select></Field></div></div></Section>
      <Section title="Job description"><div className="section-body"><textarea className="textarea" aria-label="Job description" key={job.id} style={{ minHeight: 180 }} defaultValue={job.job_description} placeholder="Paste the job description here" onBlur={(event) => { if (event.target.value !== job.job_description) void update("job_applications", job.id, { job_description: event.target.value }); }} /><p className="micro muted" style={{ marginBottom: 0 }}>Updates save when you leave the field. Skill gap results use this description.</p></div></Section>
      <Section title="Notes"><div className="section-body"><textarea className="textarea" aria-label="Application notes" key={`${job.id}-notes`} defaultValue={job.notes} onBlur={(event) => { if (event.target.value !== job.notes) void update("job_applications", job.id, { notes: event.target.value }); }} /></div></Section></div>
      <div className="stack"><Section title="Skill gap" meta={extracted.length ? "AI extracted, evidence assessed" : "Local recognition, evidence assessed"} action={<div className="row">{hosted && <Button disabled={analyzing || job.job_description.length < 80} onClick={() => void analyzeWithAI()}>{analyzing ? "Analyzing…" : "Analyze with AI"}</Button>}{needsPlan.length > 0 && !planExists && <Button onClick={() => setPlanPreview(true)}>Create gap plan</Button>}</div>}><div>{gap.length ? gap.map((item) => <div className="list-row" key={item.name}><div className="row-between small"><strong>{item.name}</strong><Badge tone={item.assessment === "Strong" ? "green" : item.assessment === "Developing" ? "blue" : item.assessment === "Gap" ? "red" : "amber"}>{item.assessment}</Badge></div><div className="micro muted" style={{ marginTop: 5 }}>{item.evidence.length ? `Proof: ${item.evidence.join(" · ")}` : "No linked evidence yet"}</div></div>) : <Empty title="No recognizable requirements" detail="Paste a job description to compare its skills with your records." />}{signals && <div className="section-body"><strong className="small">Experience signals</strong><p className="small muted">{signals.experience_signals.join(" · ") || "None stated"}</p><strong className="small">Responsibilities</strong><p className="small muted">{signals.responsibilities.join(" · ") || "None stated"}</p></div>}</div></Section><Section title="Related contacts"><div>{data.contacts.filter((contact) => contact.company.toLowerCase() === job.company.toLowerCase()).map((contact) => <div className="list-row small" key={contact.id}>{contact.name} · {contact.role}</div>)}{!data.contacts.some((contact) => contact.company.toLowerCase() === job.company.toLowerCase()) && <Empty title="No related contact" detail="Add a recruiter or employee in Networking." />}</div></Section></div></div>}
    {adding && <Dialog title="Add job application" onClose={() => setAdding(false)}><div className="form-grid"><Field label="Company" name="job-company"><input id="job-company" className="input" autoFocus value={company} onChange={(event) => setCompany(event.target.value)} /></Field><Field label="Role" name="job-role"><input id="job-role" className="input" value={role} onChange={(event) => setRole(event.target.value)} /></Field><Field label="Location" name="job-location"><input id="job-location" className="input" value={location} onChange={(event) => setLocation(event.target.value)} /></Field><Field label="Job URL" name="job-url"><input id="job-url" type="url" className="input" value={url} onChange={(event) => setUrl(event.target.value)} /></Field><Field label="Job description" name="job-description" full><textarea id="job-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={() => void save()}>Save application</Button></div></Dialog>}
    {planPreview && job && <Dialog title="Review gap plan" onClose={() => setPlanPreview(false)}><p className="small muted">This will create one goal, one milestone, and {needsPlan.length * 2} tasks. Review the suggested work before saving.</p><div>{needsPlan.map((item) => <div className="list-row small" key={item.name}><strong>{item.name}</strong><div className="muted">Learn the requirement · Practice interview questions</div></div>)}</div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setPlanPreview(false)}>Cancel</Button><Button variant="primary" onClick={() => void createPlan()}>Create plan</Button></div></Dialog>}
  </>;
}

