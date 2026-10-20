import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Dialog, Empty, Section, minutesLabel } from "@/components/ui";
import { goalProgress, localDay, mondayOf, weeklyTime } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";

export function WeeklyReviewPanel() {
  const { data, update, timezone } = useStore();
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const week = weeklyTime(data, new Date(), timezone);
  const unfinished = data.tasks.filter((task) => ["today", "week", "doing"].includes(task.status));
  const neglected = Object.entries(week.by_type).filter(
    ([, value]) => value.planned > 0 && value.actual < value.planned * 0.5,
  );
  const since = `${week.start}T00:00:00`;
  const milestones = data.activity_log.filter(
    (item) => item.entity_type === "milestones" && item.occurred_at >= since,
  );
  const nextMonday = new Date(`${mondayOf()}T12:00:00`);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const nextDay = localDay(nextMonday);

  const createPlan = async () => {
    try {
      for (const task of unfinished)
        await update("tasks", task.id, { status: "week", scheduled_date: nextDay });
      setPreview(false);
      setMessage(`${unfinished.length} tasks moved to the week of ${nextDay}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not create next week plan.");
    }
  };

  return (
    <div className="stack">
      <div className="summary" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 0 }}>
        <div className="summary-item">
          <span>Planned</span>
          <strong>{minutesLabel(week.planned_minutes)}</strong>
        </div>
        <div className="summary-item">
          <span>Actual</span>
          <strong>{minutesLabel(week.actual_minutes)}</strong>
        </div>
        <div className="summary-item">
          <span>Completed tasks</span>
          <strong>{week.completed}</strong>
        </div>
        <div className="summary-item" style={{ borderRight: 0 }}>
          <span>Milestones reached</span>
          <strong>{milestones.length}</strong>
        </div>
      </div>
      <div className="grid-two">
        <Section title="Plan versus actual">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Planned</th>
                  <th>Actual</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(week.by_type).map(([type, time]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{minutesLabel(time.planned)}</td>
                    <td>{minutesLabel(time.actual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!Object.keys(week.by_type).length && (
              <Empty
                title="No work planned"
                detail="Schedule tasks to make next week's review useful."
              />
            )}
          </div>
        </Section>
        <Section title="Attention and progress">
          <div className="section-body stack" style={{ gap: 10 }}>
            <div className="small">
              <strong>Receiving less time than planned</strong>
              <div className="muted">
                {neglected.length
                  ? neglected.map(([type]) => type).join(", ")
                  : "No under-attended areas recorded."}
              </div>
            </div>
            <div className="small">
              <strong>Interview practice</strong>
              <div className="muted">
                {data.interview_practice.filter((item) => item.practiced_at >= since).length}{" "}
                attempts
              </div>
            </div>
            <div className="small">
              <strong>Networking</strong>
              <div className="muted">
                {data.network_interactions.filter((item) => item.occurred_at >= since).length}{" "}
                interactions
              </div>
            </div>
            <div className="small">
              <strong>Applications</strong>
              <div className="muted">
                {data.job_applications.filter((item) => item.created_at >= since).length} added
              </div>
            </div>
          </div>
        </Section>
      </div>
      <div className="grid-two">
        <Section title="Goal progress">
          <div>
            {data.goals
              .filter((goal) => goal.status === "active")
              .map((goal) => (
                <div className="list-row row-between small" key={goal.id}>
                  <span>{goal.title}</span>
                  <strong>{goalProgress(data, goal.id)}%</strong>
                </div>
              ))}
          </div>
        </Section>
        <Section
          title="Unfinished work"
          meta={`${unfinished.length}`}
          action={
            unfinished.length ? (
              <Button onClick={() => setPreview(true)}>Create next week plan</Button>
            ) : undefined
          }
        >
          <div>
            {unfinished.slice(0, 8).map((task) => (
              <div className="list-row small" key={task.id}>
                {task.title}
              </div>
            ))}
            {!unfinished.length && (
              <Empty title="Nothing to carry forward" detail="Your week is clear." />
            )}
          </div>
        </Section>
      </div>
      {message && (
        <div className="alert" role="status">
          {message}
        </div>
      )}
      {preview && (
        <Dialog title="Review next week plan" onClose={() => setPreview(false)}>
          <p className="small muted">
            Move these {unfinished.length} unfinished tasks to the week of {nextDay}. Their history
            and actual time stay intact.
          </p>
          <div style={{ maxHeight: 280, overflow: "auto" }}>
            {unfinished.map((task) => (
              <div className="list-row small" key={task.id}>
                {task.title}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <Button onClick={() => setPreview(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void createPlan()}>
              Move tasks
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export function AnalyticsPanel() {
  const { data, timezone } = useStore();
  const week = weeklyTime(data, new Date(), timezone);
  const chartData = Object.entries(week.by_type).map(([area, time]) => ({
    area,
    Planned: Number((time.planned / 60).toFixed(1)),
    Actual: Number((time.actual / 60).toFixed(1)),
  }));
  return (
    <div className="stack">
      <Section title="Time by area" meta="Hours this week">
        <div className="section-body" style={{ height: 310 }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="area" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Planned" fill="#aab9c9" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Actual" fill="#3566a7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty
              title="No time data yet"
              detail="Plan and complete tasks to see where your time goes."
            />
          )}
        </div>
      </Section>
      <div className="grid-two">
        <Section title="Tasks">
          <div className="section-body">
            <strong style={{ fontSize: 23 }}>
              {data.tasks.filter((task) => task.status === "completed").length}
            </strong>
            <div className="small muted">completed in total</div>
          </div>
        </Section>
        <Section title="Career evidence">
          <div className="section-body">
            <strong style={{ fontSize: 23 }}>{data.evidence.length}</strong>
            <div className="small muted">proof records linked to skills, goals, or projects</div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function ExportPanel() {
  const { data, hosted } = useStore();
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { exported_at: new Date().toISOString(), source: hosted ? "supabase" : "demo", data },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `career-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };
  return (
    <Section title="Export / backup">
      <div className="section-body">
        <p className="small muted" style={{ maxWidth: 600 }}>
          Download a JSON copy of the records currently loaded in this workspace. Keep the file
          private: it can contain notes, contacts, and job details.
        </p>
        <Button variant="primary" onClick={download}>
          Download JSON backup
        </Button>
        {hosted && (
          <p className="micro muted">
            This export includes all pages of the loaded owner records. Database backups and file
            storage backups are managed separately in Supabase.
          </p>
        )}
      </div>
    </Section>
  );
}
