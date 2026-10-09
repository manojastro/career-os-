import { Link } from "@/lib/router-compat";
import { ArrowRight, Play, AlertCircle } from "lucide-react";
import { Badge, Button, Empty, PageHeading, Progress, Section, dateLabel, minutesLabel } from "@/components/ui";
import { goalProgress, overdueTasks, projectProgress, todayTasks, weeklyTime, localDay } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";
import { useFocus } from "@/features/focus/FocusProvider";
import { TaskRow } from "@/features/tasks/TaskRow";
import { TodayLearningCard } from "@/features/learning-manager/LearningManager";

export function DashboardPage({ openCapture }: { openCapture: () => void }) {
  const { data } = useStore();
  const { start } = useFocus();
  const today = todayTasks(data).slice(0, 5);
  const week = weeklyTime(data);
  const overdue = overdueTasks(data);
  const followups = data.contacts.filter((contact) => contact.next_followup && contact.next_followup <= localDay());
  const activeGoals = data.goals.filter((goal) => goal.status === "active");
  const totalProgress = activeGoals.length ? Math.round(activeGoals.reduce((sum, goal) => sum + goalProgress(data, goal.id), 0) / activeGoals.length) : 0;
  const interviews = data.interview_questions.filter((question) => question.status === "Practiced" || question.status === "Strong");
  const stages = ["Saved", "Applied", "Recruiter Contact", "Screening", "Technical Interview", "Final Round", "Offer"];
  const displayDate = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return <><PageHeading title="Your career, in motion" subtitle={`${displayDate} · Focus on what moves the work forward.`}><Button onClick={openCapture}>Capture something</Button><Link className="btn btn-primary" href="/today">Open Today <ArrowRight size={14} /></Link></PageHeading>
    <div className="summary"><div className="summary-item"><span>Goal progress</span><strong>{totalProgress}%</strong><em>linked work</em></div><div className="summary-item"><span>Planned this week</span><strong>{minutesLabel(week.planned_minutes)}</strong></div><div className="summary-item"><span>Actual this week</span><strong>{minutesLabel(week.actual_minutes)}</strong></div><div className="summary-item"><span>Completed this week</span><strong>{week.completed}</strong><em>tasks</em></div><div className="summary-item"><span>Needs attention</span><strong>{overdue.length + followups.length}</strong><em>items</em></div></div>
    <div className="grid-main"><div className="stack">
      <Section title="Today's focus" meta={`${today.length} priorities`} action={<div className="row">{today[0] && <Button variant="primary" onClick={() => start(today[0])}><Play size={14} />Start focus</Button>}<Link className="btn" href="/today">View plan <ArrowRight size={13} /></Link></div>}>
        {today.length ? today.map((task) => <TaskRow key={task.id} task={task} compact />) : <Empty title="Today is open" detail="Move a task into Today to make a deliberate plan." />}
      </Section>
      {(overdue.length > 0 || followups.length > 0) && <Section title="Needs attention" meta="Clear or reschedule"><div className="section-body stack" style={{ gap: 9 }}>{overdue.slice(0, 3).map((task) => <div key={task.id} className="row-between"><div className="row"><AlertCircle size={15} style={{ color: "var(--red)" }} /><span className="small">{task.title}</span></div><Badge tone="red">Overdue</Badge></div>)}{followups.slice(0, 3).map((contact) => <div key={contact.id} className="row-between"><div className="row"><AlertCircle size={15} style={{ color: "var(--amber)" }} /><span className="small">Follow up with {contact.name}</span></div><Badge tone="amber">{dateLabel(contact.next_followup)}</Badge></div>)}</div></Section>}
      <TodayLearningCard />
      <div className="grid-two"><Section title="Goals & milestones" action={<Link href="/goals" className="link small">Open goals</Link>}><div className="section-body stack" style={{ gap: 17 }}>{activeGoals.slice(0, 3).map((goal) => { const progress = goalProgress(data, goal.id); return <div key={goal.id}><div className="row-between small" style={{ marginBottom: 7 }}><span className="semibold">{goal.title}</span><span className="muted">{progress}%</span></div><Progress value={progress} /></div>; })}{!activeGoals.length && <Empty title="No active goals" detail="Create one goal and break it into milestones." />}</div></Section>
      <Section title="Skills in motion" action={<Link href="/skills" className="link small">All skills</Link>}><div className="section-body stack" style={{ gap: 11 }}>{data.skills.slice(0, 5).map((skill) => <div key={skill.id} className="row-between small"><span className="semibold">{skill.name}</span><Badge tone={skill.status === "Applied" ? "green" : skill.status === "Learning" ? "amber" : "blue"}>{skill.status}</Badge></div>)}</div></Section></div>
      <Section title="Projects" action={<Link href="/projects" className="link small">All projects</Link>}><div>{data.projects.filter((project) => project.status !== "Archived").slice(0, 3).map((project) => <div className="list-row" key={project.id}><div className="row-between small"><span className="semibold">{project.name}</span><Badge tone="blue">{project.status}</Badge></div><div className="row-between small muted" style={{ marginTop: 7 }}><span>Next: {data.tasks.find((task) => task.project_id === project.id && task.status !== "completed")?.title ?? "No open task"}</span><span>{projectProgress(data, project.id)}%</span></div></div>)}</div></Section>
    </div><div className="stack">
      <Section title="This week's balance" action={<Link href="/more" className="link small">Weekly review</Link>}><div className="section-body stack" style={{ gap: 13 }}>{Object.entries(week.by_type).slice(0, 5).map(([type, time]) => <div key={type}><div className="row-between small" style={{ marginBottom: 5 }}><span>{type}</span><span className="muted">{minutesLabel(time.actual)} / {minutesLabel(time.planned)}</span></div><Progress value={time.planned ? Math.round(time.actual / time.planned * 100) : 0} /></div>)}{!Object.keys(week.by_type).length && <Empty title="No planned time yet" detail="Schedule tasks to see your weekly balance." />}</div></Section>
      <Section title="Networking" action={<Link href="/networking" className="link small">Contacts</Link>}><div className="section-body"><div className="row-between"><div><strong style={{ fontSize: 20 }}>{data.contacts.length}</strong><div className="small muted">contacts</div></div><div><strong style={{ fontSize: 20, color: followups.length ? "var(--amber)" : undefined }}>{followups.length}</strong><div className="small muted">follow-ups due</div></div></div></div></Section>
      <Section title="Interview prep" action={<Link href="/interviews" className="link small">Practice</Link>}><div className="section-body"><div className="row-between small"><span>Questions practiced</span><strong>{interviews.length} / {data.interview_questions.length}</strong></div><div className="small muted" style={{ marginTop: 10 }}>Weak topic: {data.interview_questions.toSorted((a, b) => a.confidence - b.confidence)[0]?.category ?? "None yet"}</div></div></Section>
      <Section title="Applications" action={<Link href="/jobs" className="link small">Pipeline</Link>}><div className="section-body" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>{stages.filter((stage) => data.job_applications.some((job) => job.status === stage)).map((stage) => <div key={stage}><strong style={{ fontSize: 18 }}>{data.job_applications.filter((job) => job.status === stage).length}</strong><div className="small muted">{stage}</div></div>)}{!data.job_applications.length && <span className="muted small">No applications tracked yet.</span>}</div></Section>
      <Section title="Recent activity" action={<Link href="/daily-log" className="link small">Daily log</Link>}><div>{data.activity_log.slice().sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 5).map((activity) => <div className="list-row small" key={activity.id}><span className="status-dot" />{activity.summary}<div className="micro muted" style={{ margin: "4px 0 0 14px" }}>{dateLabel(activity.occurred_at)}</div></div>)}{!data.activity_log.length && <Empty title="No activity yet" detail="Complete a task or start a focus session." />}</div></Section>
    </div></div>
  </>;
}

