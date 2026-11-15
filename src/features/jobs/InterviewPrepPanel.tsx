import { useState } from "react";
import { Badge, Button, Empty, Section } from "@/components/ui";
import type { JobGap } from "@/lib/domain/jobGap";
import { draftPrepQuestions, interviewPrep } from "@/lib/domain/interviewPrep";
import { Link } from "@/lib/router-compat";
import { useStore } from "@/lib/store";

const MAX_DRAFTS = 8;
const TONES = { Strong: "green", Practiced: "blue", Learning: "amber", New: "default" } as const;

/** Practice for one application: its interviews and questions matched to its requirements. */
export function InterviewPrepPanel({
  applicationId,
  gap,
}: {
  applicationId: string;
  gap: JobGap[];
}) {
  const { data, add, timezone } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const prep = interviewPrep(data, applicationId, gap);
  const drafts = prep.uncovered.slice(0, MAX_DRAFTS);
  const addDrafts = async () => {
    setBusy(true);
    setMessage("");
    let added = 0;
    try {
      for (const question of draftPrepQuestions(drafts, gap, data)) {
        await add("interview_questions", question);
        added++;
      }
      setMessage(`Added ${added} practice questions. Write your answers in Interviews.`);
    } catch {
      setMessage(`Added ${added} of ${drafts.length} questions; the rest could not be saved.`);
    }
    setBusy(false);
  };
  return (
    <Section
      title="Interview prep for this role"
      meta={`${prep.questions.length} matching questions`}
      action={
        drafts.length > 0 && (
          <Button disabled={busy} onClick={() => void addDrafts()}>
            {busy
              ? "Adding…"
              : `Add ${drafts.length} practice question${drafts.length === 1 ? "" : "s"}`}
          </Button>
        )
      }
    >
      <div>
        {!gap.length ? (
          <Empty
            title="No requirements to prepare against"
            detail="Analyze the job description first; prep follows its requirements."
          />
        ) : (
          <>
            {prep.interviews.length > 0 && (
              <div className="list-row small">
                <strong>Interviews</strong>
                {prep.interviews.map((row) => (
                  <div className="muted" key={row.id}>
                    {String(row["stage"] ?? "Interview")} ·{" "}
                    {row["scheduled_at"]
                      ? new Date(String(row["scheduled_at"])).toLocaleString([], {
                          timeZone: timezone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "date not set"}
                  </div>
                ))}
              </div>
            )}
            {prep.questions.slice(0, 8).map((q) => (
              <div className="list-row small" key={q.id}>
                <div className="row-between">
                  <span>{q.question}</span>
                  <Badge tone={TONES[q.status]}>{q.status}</Badge>
                </div>
                <div className="micro muted">
                  {q.category} · confidence {q.confidence}/4
                </div>
              </div>
            ))}
            {prep.uncovered.length > 0 && (
              <div className="list-row micro muted">
                No practice question yet for: {prep.uncovered.join(", ")}
              </div>
            )}
          </>
        )}
        <div className="section-body small row-between">
          <Link href="/interviews" className="link">
            Practice in Interviews
          </Link>
          {message && (
            <span className="muted" role="status">
              {message}
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}
