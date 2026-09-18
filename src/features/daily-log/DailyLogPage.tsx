"use client";

import { useState } from "react";
import { Button, Empty, PageHeading, Section, minutesLabel } from "@/components/ui";
import { localDay } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";

export function DailyLogPage() {
  const { data, add, update } = useStore();
  const [date, setDate] = useState(localDay());
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const log = data.daily_logs.find((item) => item.log_date === date);
  const journal = draft ?? log?.journal ?? "";
  const tasks = data.tasks.filter((task) => task.completed_at && localDay(new Date(task.completed_at)) === date);
  const sessions = data.focus_sessions.filter((session) => localDay(new Date(session.started_at)) === date);
  const practice = data.interview_practice.filter((item) => localDay(new Date(item.practiced_at)) === date);
  const interactions = data.network_interactions.filter((item) => localDay(new Date(item.occurred_at)) === date);
  const activity = data.activity_log.filter((item) => localDay(new Date(item.occurred_at)) === date).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const learned = sessions.filter((session) => data.tasks.find((task) => task.id === session.task_id)?.type === "Learn");
  const built = sessions.filter((session) => data.tasks.find((task) => task.id === session.task_id)?.type === "Build");

  const save = async () => {
    try {
      if (log) await update("daily_logs", log.id, { journal });
      else await add("daily_logs", { log_date: date, journal });
      setMessage("Journal saved."); setDraft(null);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save journal."); }
  };

  return <><PageHeading title="Daily log" subtitle="Activity appears here as you work. Add context once, when it matters."><input className="input" aria-label="Log date" type="date" style={{ width: 155 }} value={date} onChange={(event) => { setDate(event.target.value); setDraft(null); setMessage(""); }} /></PageHeading>
    <div className="summary" style={{ gridTemplateColumns: "repeat(4,1fr)" }}><div className="summary-item"><span>Completed tasks</span><strong>{tasks.length}</strong></div><div className="summary-item"><span>Focused work</span><strong>{minutesLabel(sessions.reduce((sum, session) => sum + session.duration_minutes, 0))}</strong></div><div className="summary-item"><span>Questions practiced</span><strong>{practice.length}</strong></div><div className="summary-item" style={{ borderRight: 0 }}><span>Interactions</span><strong>{interactions.length}</strong></div></div>
    <div className="grid-main"><div className="stack"><Section title="Work recorded automatically"><div className="section-body stack" style={{ gap: 14 }}><div><strong className="small">Learning</strong><div className="small muted">{learned.length ? learned.map((session) => `${data.tasks.find((task) => task.id === session.task_id)?.title ?? "Learning"} · ${minutesLabel(session.duration_minutes)}`).join(", ") : "No learning session yet."}</div></div><div><strong className="small">Building</strong><div className="small muted">{built.length ? built.map((session) => `${data.tasks.find((task) => task.id === session.task_id)?.title ?? "Project"} · ${minutesLabel(session.duration_minutes)}`).join(", ") : "No build session yet."}</div></div><div><strong className="small">Completed tasks</strong><div className="small muted">{tasks.length ? tasks.map((task) => task.title).join(" · ") : "No task completed yet."}</div></div><div><strong className="small">Interview & networking</strong><div className="small muted">{practice.length} questions practiced · {interactions.length} interactions recorded</div></div></div></Section>
      <Section title="Journal notes"><div className="section-body"><textarea className="textarea" aria-label="Journal notes" style={{ minHeight: 150 }} placeholder="What did you learn? What needs attention tomorrow?" value={journal} onChange={(event) => setDraft(event.target.value)} /><div className="row-between" style={{ marginTop: 12 }}><span className="small muted" role="status">{message}</span><Button variant="primary" onClick={() => void save()}>Save journal</Button></div></div></Section></div>
      <Section title="Activity timeline" meta={`${activity.length} events`}><div className="section-body">{activity.length ? <div className="timeline">{activity.map((item) => <div className="timeline-item" key={item.id}><span className="semibold">{item.summary}</span><div className="micro muted">{new Date(item.occurred_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div>)}</div> : <Empty title="No activity recorded" detail="Complete work to populate this day automatically." />}</div></Section>
    </div>
  </>;
}
