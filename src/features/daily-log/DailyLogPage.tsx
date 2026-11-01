import { useEffect, useRef, useState } from "react";
import { Button, Empty, PageHeading, Section, minutesLabel } from "@/components/ui";
import { dailyFocusBreakdown } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";
import { DailyLogLearning } from "@/features/learning-manager/LearningManager";

type FocusItem = ReturnType<typeof dailyFocusBreakdown>["learning"][number];
const focusList = (items: FocusItem[], empty: string, withType = false) =>
  items.length
    ? items
        .map(
          (item) =>
            `${item.title}${withType && item.type ? ` (${item.type})` : ""} · ${minutesLabel(item.minutes)}`,
        )
        .join(", ")
    : empty;

export function DailyLogPage() {
  const { data, add, update, day: localDay, timezone, user } = useStore();
  const [date, setDate] = useState(localDay());
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // Unsaved notes survive date changes, navigation and reloads in this tab, like note drafts.
  const draftKey = `career-os-journal-draft:${user?.id ?? "demo"}:${date}`;
  const currentKey = useRef(draftKey);
  currentKey.current = draftKey;
  useEffect(() => {
    try {
      setDraft(sessionStorage.getItem(draftKey));
    } catch {
      setDraft(null);
    }
  }, [draftKey]);
  const log = data.daily_logs.find((item) => item.log_date === date);
  const journal = draft ?? log?.journal ?? "";
  const dirty = draft !== null && draft !== (log?.journal ?? "");
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const edit = (value: string) => {
    setDraft(value);
    try {
      sessionStorage.setItem(draftKey, value);
    } catch {
      setMessage("Draft recovery is unavailable in this tab. Save before leaving.");
    }
  };
  const forget = (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage is optional; the saved journal is the record. */
    }
    if (currentKey.current === key) setDraft(null);
  };
  const tasks = data.tasks.filter(
    (task) => task.completed_at && localDay(new Date(task.completed_at)) === date,
  );
  const focus = dailyFocusBreakdown(data, date, timezone);
  const practice = data.interview_practice.filter(
    (item) => localDay(new Date(item.practiced_at)) === date,
  );
  const interactions = data.network_interactions.filter(
    (item) => localDay(new Date(item.occurred_at)) === date,
  );
  const activity = data.activity_log
    .filter((item) => localDay(new Date(item.occurred_at)) === date)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  const save = async () => {
    const key = draftKey;
    try {
      if (log) await update("daily_logs", log.id, { journal });
      else await add("daily_logs", { log_date: date, journal });
      setMessage("Journal saved.");
      forget(key);
    } catch {
      setMessage("Could not save the journal. Your notes are still here; try again.");
    }
  };

  return (
    <>
      <PageHeading
        title="Daily log"
        subtitle="Activity appears here as you work. Add context once, when it matters."
      >
        <input
          className="input"
          aria-label="Log date"
          type="date"
          style={{ width: 155 }}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setMessage("");
          }}
        />
      </PageHeading>
      <div className="summary" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="summary-item">
          <span>Completed tasks</span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="summary-item">
          <span>Focused work</span>
          <strong>{minutesLabel(focus.total)}</strong>
        </div>
        <div className="summary-item">
          <span>Questions practiced</span>
          <strong>{practice.length}</strong>
        </div>
        <div className="summary-item" style={{ borderRight: 0 }}>
          <span>Interactions</span>
          <strong>{interactions.length}</strong>
        </div>
      </div>
      <div className="grid-main">
        <div className="stack">
          <Section title="Work recorded automatically">
            <div className="section-body stack" style={{ gap: 14 }}>
              <div>
                <strong className="small">Learning</strong>
                <div className="small muted">
                  {focusList(focus.learning, "No learning session yet.")}
                </div>
              </div>
              <div>
                <strong className="small">Building</strong>
                <div className="small muted">
                  {focusList(focus.building, "No build session yet.")}
                </div>
              </div>
              {focus.other.length > 0 && (
                <div>
                  <strong className="small">Other focused work</strong>
                  <div className="small muted">{focusList(focus.other, "", true)}</div>
                </div>
              )}
              <div>
                <strong className="small">Completed tasks</strong>
                <div className="small muted">
                  {tasks.length
                    ? tasks.map((task) => task.title).join(" · ")
                    : "No task completed yet."}
                </div>
              </div>
              <div>
                <strong className="small">Interview & networking</strong>
                <div className="small muted">
                  {practice.length} questions practiced · {interactions.length} interactions
                  recorded
                </div>
              </div>
            </div>
          </Section>
          <DailyLogLearning date={date} />
          <Section title="Journal notes">
            <div className="section-body">
              <textarea
                className="textarea"
                aria-label="Journal notes"
                style={{ minHeight: 150 }}
                placeholder="What did you learn? What needs attention tomorrow?"
                value={journal}
                onChange={(event) => edit(event.target.value)}
              />
              <div className="row-between" style={{ marginTop: 12 }}>
                <span className="small muted" role="status">
                  {message ||
                    (dirty ? "Unsaved notes are kept in this tab until you save or discard." : "")}
                </span>
                <div className="row" style={{ gap: 8 }}>
                  {dirty && (
                    <Button
                      onClick={() => {
                        forget(draftKey);
                        setMessage("");
                      }}
                    >
                      Discard changes
                    </Button>
                  )}
                  <Button variant="primary" onClick={() => void save()}>
                    Save journal
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        </div>
        <Section title="Activity timeline" meta={`${activity.length} events`}>
          <div className="section-body">
            {activity.length ? (
              <div className="timeline">
                {activity.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <span className="semibold">{item.summary}</span>
                    <div className="micro muted">
                      {new Date(item.occurred_at).toLocaleTimeString([], {
                        timeZone: timezone,
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="No activity recorded"
                detail="Complete work to populate this day automatically."
              />
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
