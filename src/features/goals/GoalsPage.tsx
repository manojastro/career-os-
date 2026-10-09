import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, PageHeading, Progress, Section, dateLabel } from "@/components/ui";
import { goalProgress } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";

export function GoalsPage() {
  const { data, add, update } = useStore();
  const [showGoal, setShowGoal] = useState(false);
  const [milestoneGoal, setMilestoneGoal] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [criteria, setCriteria] = useState("");
  const [type, setType] = useState<"career" | "quarter" | "monthly">("quarter");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const active = data.goals.filter((goal) => goal.status === "active");
  const detail = data.goals.find((goal) => goal.id === selected) ?? active[0];

  const saveGoal = async () => {
    if (title.trim().length < 2) { setError("Enter a goal title."); return; }
    try {
      await add("goals", { title: title.trim(), description, goal_type: type, parent_goal_id: type === "career" ? null : data.goals.find((goal) => goal.goal_type === "career")?.id ?? null, target_date: date || null, status: "active", reason, success_criteria: criteria });
      setShowGoal(false); setTitle(""); setDescription(""); setReason(""); setCriteria(""); setDate(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create goal."); }
  };
  const saveMilestone = async () => {
    if (!milestoneGoal || title.trim().length < 2) { setError("Enter a milestone title."); return; }
    try {
      await add("milestones", { goal_id: milestoneGoal, title: title.trim(), due_date: date || null, status: "pending", success_criteria: criteria });
      setMilestoneGoal(null); setTitle(""); setDate(""); setCriteria(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create milestone."); }
  };

  return <><PageHeading title="Goals & milestones" subtitle="Progress comes from completed milestones and linked tasks."><Button variant="primary" onClick={() => setShowGoal(true)}><Plus size={15} />New goal</Button></PageHeading>
    <div className="grid-main"><Section title="Active goals" meta={`${active.length}`}><div>{active.length ? active.map((goal) => { const progress = goalProgress(data, goal.id); return <button key={goal.id} className="list-row" style={{ display: "block", width: "100%", textAlign: "left", borderLeft: detail?.id === goal.id ? "2px solid var(--blue)" : "2px solid transparent", borderTop: 0, borderRight: 0, background: detail?.id === goal.id ? "var(--blue-soft)" : "transparent", color: "var(--text)" }} onClick={() => setSelected(goal.id)}><div className="row-between"><span className="semibold small">{goal.title}</span><span className="small muted">{progress}%</span></div><div className="row-between" style={{ margin: "7px 0" }}><span className="micro muted">{goal.goal_type === "quarter" ? "90-day goal" : goal.goal_type === "career" ? "Career goal" : "Monthly goal"} · Due {dateLabel(goal.target_date)}</span></div><Progress value={progress} /></button>; }) : <Empty title="No active goals" detail="Create a career goal, then add milestones and tasks." />}</div></Section>
      <div className="stack">{detail ? <><Section title="Goal detail" action={<Badge tone="blue">{detail.status}</Badge>}><div className="section-body"><h2 style={{ fontSize: 17, margin: "0 0 8px" }}>{detail.title}</h2><p className="small muted" style={{ margin: "0 0 12px" }}>{detail.description || "No description yet."}</p>{detail.reason && <p className="small"><strong>Why:</strong> {detail.reason}</p>}{detail.success_criteria && <p className="small"><strong>Success:</strong> {detail.success_criteria}</p>}<div className="row-between" style={{ marginTop: 13 }}><span className="small muted">Target {dateLabel(detail.target_date)}</span><Button variant="quiet" onClick={() => void update("goals", detail.id, { status: detail.status === "completed" ? "active" : "completed" })}>{detail.status === "completed" ? "Reopen" : "Mark complete"}</Button></div></div></Section>
        <Section title="Milestones" action={<Button onClick={() => { setTitle(""); setCriteria(""); setDate(""); setMilestoneGoal(detail.id); }}><Plus size={14} />Add milestone</Button>}><div>{data.milestones.filter((item) => item.goal_id === detail.id).map((milestone) => <div className="list-row row-between" key={milestone.id}><div><div className="small semibold">{milestone.title}</div><div className="micro muted">Due {dateLabel(milestone.due_date)}{milestone.success_criteria ? ` · ${milestone.success_criteria}` : ""}</div></div><button className={`btn ${milestone.status === "completed" ? "" : "btn-quiet"}`} onClick={() => void update("milestones", milestone.id, { status: milestone.status === "completed" ? "in_progress" : "completed" })}>{milestone.status === "completed" ? <><Check size={14} />Done</> : "Complete"}</button></div>)}{!data.milestones.some((item) => item.goal_id === detail.id) && <Empty title="No milestones" detail="Add a measurable checkpoint for this goal." />}</div></Section>
        <Section title="Linked tasks"><div>{data.tasks.filter((task) => task.goal_id === detail.id).slice(0, 6).map((task) => <div key={task.id} className="list-row row-between small"><span>{task.title}</span><Badge tone={task.status === "completed" ? "green" : "default"}>{task.status}</Badge></div>)}{!data.tasks.some((task) => task.goal_id === detail.id) && <Empty title="No linked tasks" detail="Link tasks from the task editor to make progress visible." />}</div></Section>
      </> : <Section title="Get started"><Empty title="Choose a goal" detail="Your milestones and linked work will appear here." /></Section>}</div></div>
    {showGoal && <Dialog title="New goal" onClose={() => setShowGoal(false)}><div className="form-grid"><Field label="Goal title" name="goal-title" full><input id="goal-title" className="input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Type" name="goal-type"><select id="goal-type" className="select" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="career">Career</option><option value="quarter">90-day</option><option value="monthly">Monthly</option></select></Field><Field label="Target date" name="goal-date"><input id="goal-date" type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Description" name="goal-description" full><textarea id="goal-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></Field><Field label="Why it matters" name="goal-reason" full><input id="goal-reason" className="input" value={reason} onChange={(event) => setReason(event.target.value)} /></Field><Field label="Success criteria" name="goal-criteria" full><textarea id="goal-criteria" className="textarea" value={criteria} onChange={(event) => setCriteria(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setShowGoal(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveGoal()}>Create goal</Button></div></Dialog>}
    {milestoneGoal && <Dialog title="Add milestone" onClose={() => setMilestoneGoal(null)}><div className="form-grid"><Field label="Milestone title" name="milestone-title" full><input id="milestone-title" className="input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></Field><Field label="Due date" name="milestone-date"><input id="milestone-date" type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Success criteria" name="milestone-criteria" full><textarea id="milestone-criteria" className="textarea" value={criteria} onChange={(event) => setCriteria(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setMilestoneGoal(null)}>Cancel</Button><Button variant="primary" onClick={() => void saveMilestone()}>Create milestone</Button></div></Dialog>}
  </>;
}

