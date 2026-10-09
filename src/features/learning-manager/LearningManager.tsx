import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Badge, Button, Empty, Field, Section, minutesLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase";
import { aiHeaders } from "@/lib/ai-headers";
import { useFocus } from "@/features/focus/FocusProvider";
import { selectCandidates, zonedParts, addDays, isValidTimeZone, DEFAULT_TZ } from "@/lib/learning/engine";
import { ist } from "@/features/agent/agentData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function callLearning(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`/api/learning/${action}`, {
    method: "POST",
    headers: await aiHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(describe(payload.error ?? `request_failed_${res.status}`, payload.detail));
  return payload;
}

async function uploadDocx(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("The DOCX file is larger than 10 MB.");
  const headers = await aiHeaders();
  const h = new Headers(headers);
  h.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const res = await fetch("/api/learning/upload-docx", { method: "POST", headers: h, body: file });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(describe(String(body.error ?? res.status)));
  return body;
}

function describe(code: string, detail?: unknown) {
  const map: Record<string, string> = {
    url_not_allowed: "Only Google Docs document links are accepted.",
    document_not_accessible:
      "The document is not publicly readable. Share it as 'Anyone with the link can view'.",
    document_not_machine_readable: "The document could not be downloaded as text.",
    curriculum_not_imported: "Sync the curriculum first.",
    no_eligible_topic: "No eligible topic: everything is complete or blocked by prerequisites.",
    assignment_exists_for_date: "An assignment already exists for that date.",
    learning_paused: "Learning is paused in Settings.",
    baseline_required: "Finish the one-time baseline in Skills first.",
    weekly_budget_exceeded: "This would exceed your weekly learning minutes.",
    carry_over_required: "Finish or reschedule the unfinished topic first.",
    reported_total_below_recorded:
      "The total you entered is less than the time already recorded on this task.",
    recommendation_rejected: `Plan rejected: ${Array.isArray(detail) ? detail.join(", ") : ""}`,
    unauthorized: "Please sign in again.",
  };
  return map[code] ?? code.replaceAll("_", " ");
}

function useLearningData() {
  const { hosted, user } = useStore();
  const [state, setState] = useState<{
    prefs: Row | null;
    source: Row | null;
    version: Row | null;
    topics: Row[];
    prereqs: Row[];
    baselines: Row[];
    assignments: Row[];
    feedback: Row[];
  }>({
    prefs: null,
    source: null,
    version: null,
    topics: [],
    prereqs: [],
    baselines: [],
    assignments: [],
    feedback: [],
  });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const db = browserSupabase();
    if (!hosted || !user || !db) {
      setLoading(false);
      return;
    }
    const [prefs, source, topics, prereqs, baselines, assignments, feedback] = await Promise.all([
      db.from("learning_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      db
        .from("curriculum_sources")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("curriculum_topics")
        .select(
          "id,stable_topic_id,volume,volume_title,title,priority,priority_source,sequence,recommended_minutes,completion_criteria,source_reference,skill_id,skill_topic_id,removed_at",
        )
        .is("deleted_at", null)
        .order("sequence"),
      db
        .from("curriculum_prerequisites")
        .select("topic_id,prerequisite_topic_id,basis")
        .is("deleted_at", null),
      db.from("learning_baselines").select("id,topic_id,level,basis").is("deleted_at", null),
      db
        .from("learning_assignments")
        .select("*, tasks(status,actual_minutes)")
        .is("deleted_at", null)
        .order("assignment_date", { ascending: false })
        .limit(200),
      db
        .from("learning_feedback")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    let version: Row | null = null;
    if (source.data?.active_version_id)
      version = (
        await db
          .from("curriculum_versions")
          .select("*")
          .eq("id", source.data.active_version_id)
          .maybeSingle()
      ).data;
    setState({
      prefs: prefs.data,
      source: source.data,
      version,
      topics: topics.data ?? [],
      prereqs: prereqs.data ?? [],
      baselines: baselines.data ?? [],
      assignments: (assignments.data ?? []).map((a: Row) => ({
        ...a,
        task_completed: a.tasks?.status === "completed",
      })),
      feedback: feedback.data ?? [],
    });
    setLoading(false);
  }, [hosted, user]);
  useEffect(() => {
    void load();
    // Narrow refresh: pick up agent/Telegram updates when the tab regains focus (no polling).
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);
  return { ...state, loading, reload: load, hosted };
}

function selection(d: ReturnType<typeof useLearningData>, date: string) {
  return selectCandidates({
    topics: d.topics as never,
    prereqs: d.prereqs as never,
    baselines: d.baselines as never,
    assignments: d.assignments as never,
    date,
    daily_minutes: d.prefs?.daily_minutes ?? 90,
    weekly_minutes: d.prefs?.weekly_minutes,
    paused: d.prefs ? !!d.prefs.paused : undefined,
    baseline_completed: d.prefs ? !!d.prefs.baseline_completed_at : undefined,
  });
}

const tone = (p: string) =>
  (p === "MUST" ? "red" : p === "SHOULD" ? "amber" : "default") as "red" | "amber" | "default";

// ---------------- Dashboard ----------------
export function TodayLearningCard() {
  const d = useLearningData();
  const { data, refresh } = useStore();
  const { start } = useFocus();
  const [msg, setMsg] = useState("");
  const date = zonedParts(new Date(), d.prefs?.timezone ?? DEFAULT_TZ).date;
  const sel = useMemo(() => selection(d, date), [d, date]);
  if (!d.hosted || d.loading) return null;
  const a = sel.today as Row | null;
  const topic = a ? d.topics.find((t) => t.id === a.topic_id) : null;
  const next = sel.candidates.find((c) => c.topic_id !== a?.topic_id);
  const task = a ? data.tasks.find((t) => t.id === a.task_id) : null;
  const act = async (fn: () => Promise<unknown>) => {
    setMsg("");
    try {
      await fn();
      await Promise.all([d.reload(), refresh()]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <Section
      title="Today's learning"
      meta={a ? `Assigned ${ist(a.created_at)}` : undefined}
      action={
        <Link href="/skills" className="link small">
          Learning path
        </Link>
      }
    >
      <div className="section-body stack" style={{ gap: 8 }}>
        {!d.topics.length ? (
          <Empty
            title="Curriculum not imported"
            detail="Open Settings → AI learning manager and sync the learning guide."
          />
        ) : !a ? (
          <>
            <Empty
              title="No learning assigned today"
              detail={
                next
                  ? `Next eligible: ${next.stable_topic_id} ${next.title} (${next.priority})`
                  : "No eligible topic right now."
              }
            />
            {next && (
              <div>
                <Button onClick={() => void act(() => callLearning("plan"))}>
                  Generate today's plan
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="row-between">
              <strong className="small">
                {topic?.stable_topic_id} · {topic?.title}
              </strong>
              <span className="row" style={{ gap: 6 }}>
                <Badge tone={tone(topic?.priority)}>{topic?.priority}</Badge>
                <Badge
                  tone={
                    a.status === "completed" ? "green" : a.status === "partial" ? "amber" : "blue"
                  }
                >
                  {a.status.replace("_", " ")}
                </Badge>
              </span>
            </div>
            <div className="micro muted">
              Scheduled {minutesLabel(a.planned_minutes)} · recorded{" "}
              {minutesLabel(task?.actual_minutes ?? a.recorded_minutes)} · {topic?.source_reference}
            </div>
            {a.rationale && <div className="micro muted">Why today (inference): {a.rationale}</div>}
            {next && (
              <div className="micro muted">
                Next recommended: {next.stable_topic_id} {next.title}
              </div>
            )}
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {task && a.status !== "completed" && (
                <Button variant="primary" onClick={() => start(task)}>
                  Start learning
                </Button>
              )}
              <Link className="btn" href="/skills">
                Open topic
              </Link>
              {a.status !== "completed" && (
                <Button
                  onClick={() =>
                    void act(() =>
                      callLearning("feedback", {
                        idempotency_key: `app:${a.id}:completed`,
                        assignment_id: a.id,
                        kind: "completed",
                      }),
                    )
                  }
                >
                  Mark complete
                </Button>
              )}
              {a.status !== "completed" && (
                <Button
                  variant="quiet"
                  onClick={() =>
                    void act(() =>
                      callLearning("feedback", {
                        idempotency_key: `app:${a.id}:reschedule:${addDays(date, 1)}`,
                        assignment_id: a.id,
                        kind: "reschedule",
                        new_date: addDays(date, 1),
                      }),
                    )
                  }
                >
                  Reschedule to tomorrow
                </Button>
              )}
            </div>
          </>
        )}
        {msg && <div className="error">{msg}</div>}
      </div>
    </Section>
  );
}

// ---------------- Skills: learning path + baseline ----------------
const LEVELS = ["Not Started", "Familiar", "Learning", "Practiced", "Applied"];

/**
 * Suggests (never writes) a baseline from existing Skills data: the linked skill topic's status and
 * whether the skill has evidence. Suggestions are labeled inference and require an explicit choice.
 */
export function suggestBaseline(topicStatus: string | undefined, skillHasEvidence: boolean) {
  const map: Record<string, string> = {
    Learning: "Learning",
    Practicing: "Practiced",
    Applied: "Applied",
    "Interview Ready": "Applied",
  };
  const fromTopic = topicStatus ? map[topicStatus] : undefined;
  if (fromTopic) return { level: fromTopic, reason: `skill topic is ${topicStatus}` };
  if (skillHasEvidence) return { level: "Familiar", reason: "skill has saved evidence" };
  return null;
}

export function LearningPathSection() {
  const d = useLearningData();
  const { user, data } = useStore();
  const [volume, setVolume] = useState("");
  const [msg, setMsg] = useState("");
  const date = zonedParts(new Date(), d.prefs?.timezone ?? DEFAULT_TZ).date;
  const sel = useMemo(() => selection(d, date), [d, date]);
  if (!d.hosted)
    return (
      <Section title="Learning path">
        <div className="section-body small muted">
          The curriculum learning path requires a signed-in account.
        </div>
      </Section>
    );
  if (d.loading) return null;
  if (!d.topics.length)
    return (
      <Section title="Learning path">
        <Empty
          title="No curriculum imported"
          detail="Sync the learning guide from Settings → AI learning manager."
        />
      </Section>
    );
  const volumes = [...new Set(d.topics.map((t) => t.volume))];
  const vol = volume || volumes[0];
  const prereqOf = (id: string) =>
    d.prereqs
      .filter((p) => p.topic_id === id)
      .map((p) => {
        const code = d.topics.find((t) => t.id === p.prerequisite_topic_id)?.stable_topic_id;
        return code ? `${code}${p.basis === "guide_explicit" ? "" : " (inferred)"}` : null;
      })
      .filter(Boolean);
  const nextId = sel.carry_over?.topic_id ?? sel.candidates[0]?.topic_id;
  const setLevel = async (topicId: string, level: string) => {
    setMsg("");
    const db = browserSupabase()!;
    const existing = d.baselines.find((b) => b.topic_id === topicId);
    if (existing?.basis === "evidence") {
      setMsg("This topic has evidence-backed completion; manual baseline not changed.");
      return;
    }
    const { error } = await db
      .from("learning_baselines")
      .upsert(
        { user_id: user!.id, topic_id: topicId, level, basis: "manual" },
        { onConflict: "user_id,topic_id" },
      );
    if (error) setMsg(error.message);
    else await d.reload();
  };
  const finishBaseline = async () => {
    await browserSupabase()!
      .from("learning_preferences")
      .update({ baseline_completed_at: new Date().toISOString() })
      .eq("user_id", user!.id);
    await d.reload();
  };
  return (
    <Section
      title="Learning path"
      meta={`${d.topics.filter((t) => !t.removed_at).length} topics · ${d.source?.status === "incomplete" ? "guide incomplete" : "guide synced"}`}
      action={
        <select
          className="input"
          aria-label="Volume"
          style={{ width: 150 }}
          value={vol}
          onChange={(e) => setVolume(e.target.value)}
        >
          {volumes.map((v) => (
            <option key={v} value={v}>
              Volume {v}
            </option>
          ))}
        </select>
      }
    >
      <div className="section-body stack" style={{ gap: 6 }}>
        {!d.prefs?.baseline_completed_at && (
          <div
            className="small"
            style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 6 }}
          >
            One-time baseline: set your starting level for topics you already know. Manual levels
            stay separate from evidence-backed completion.{" "}
            <Button variant="quiet" onClick={() => void finishBaseline()}>
              Baseline done
            </Button>
          </div>
        )}
        {d.source?.status === "incomplete" && (
          <div className="micro muted">
            The guide's contents list sections that were not found in the document (
            {(d.version?.report?.missing_volumes ?? []).map((v: string) => `Vol ${v}`).join(", ") ||
              "see Settings"}
            ). Missing material is not invented.
          </div>
        )}
        {d.topics
          .filter((t) => t.volume === vol)
          .map((t) => {
            const b = d.baselines.find((x) => x.topic_id === t.id);
            const assigned = d.assignments.find(
              (a) => a.topic_id === t.id && a.status !== "cancelled",
            );
            const done = d.assignments.some(
              (a) => a.topic_id === t.id && (a.status === "completed" || a.task_completed),
            );
            const pre = prereqOf(t.id);
            const st = data.skill_topics.find((x) => x.id === t.skill_topic_id);
            const sug = !b
              ? suggestBaseline(
                  st?.status,
                  data.evidence.some((e) => e.skill_id && e.skill_id === t.skill_id),
                )
              : null;
            return (
              <div
                key={t.id}
                className="list-row row-between"
                style={{ gap: 8, opacity: t.removed_at ? 0.5 : 1 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="small semibold">
                    {t.stable_topic_id} {t.title}{" "}
                    {t.id === nextId && <Badge tone="blue">next</Badge>}
                  </div>
                  <div className="micro muted">
                    <Badge tone={tone(t.priority)}>
                      {t.priority}
                      {t.priority_source === "inferred" ? " (inferred)" : ""}
                    </Badge>{" "}
                    {pre.length ? `after ${pre.join(", ")}` : "no prerequisite"}{" "}
                    ·{" "}
                    {done
                      ? "completed (evidence: task)"
                      : assigned
                        ? `assigned ${assigned.assignment_date} · ${assigned.status}`
                        : "not assigned"}
                    {t.removed_at ? " · removed from latest guide" : ""}
                    {b ? ` · baseline: ${b.basis === "evidence" ? "evidence-backed" : "manual"}` : ""}
                  </div>
                  <TopicDetail topicId={t.id} prerequisites={pre as string[]} />
                  {sug && sug.level !== "Not Started" && (
                    <div className="micro muted">
                      Suggested baseline (inference, from Skills): {sug.level} — {sug.reason}.{" "}
                      <button
                        type="button"
                        className="link micro"
                        onClick={() => void setLevel(t.id, sug.level)}
                      >
                        Use
                      </button>
                    </div>
                  )}
                </div>
                <select
                  className="input"
                  aria-label={`Baseline for ${t.stable_topic_id}`}
                  style={{ width: 130 }}
                  value={b?.level ?? "Not Started"}
                  disabled={b?.basis === "evidence"}
                  onChange={(e) => void setLevel(t.id, e.target.value)}
                >
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
            );
          })}
        {msg && <div className="error">{msg}</div>}
      </div>
    </Section>
  );
}

/** Raw chapter detail from the guide, loaded on demand (body is not part of the list query). */
function TopicDetail({ topicId, prerequisites }: { topicId: string; prerequisites: string[] }) {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !row) {
      const { data, error } = await browserSupabase()!
        .from("curriculum_topics")
        .select("description,body,practical_exercise,completion_criteria,interview_notes,source_reference,recommended_minutes")
        .eq("id", topicId)
        .maybeSingle();
      if (error || !data) setErr("Could not load chapter detail.");
      else setRow(data);
    }
  };
  const field = (label: string, value: string | undefined, fallback: string) => (
    <div>
      <span className="semibold">{label}:</span>{" "}
      {value?.trim() ? value : <span className="muted">{fallback}</span>}
    </div>
  );
  return (
    <div className="micro">
      <button type="button" className="link micro" aria-expanded={open} onClick={() => void toggle()}>
        {open ? "Hide chapter detail" : "Show chapter detail"}
      </button>
      {open && (
        <div className="stack" style={{ gap: 4, marginTop: 4, padding: 8, border: "1px solid var(--border)", borderRadius: 6 }}>
          {err && <div className="error">{err}</div>}
          {!row && !err && <div className="muted">Loading…</div>}
          {row && (
            <>
              {field("Source", row.source_reference, "No source reference in the guide")}
              {field("Practical exercise", row.practical_exercise, "Not stated in the guide")}
              {field("Completion criteria", row.completion_criteria, "Not stated in the guide (a labeled inference is used when planning)")}
              {field("Interview notes", row.interview_notes, "Not stated in the guide")}
              {field("Prerequisites", prerequisites.join(", "), "None")}
              <div className="semibold">Raw chapter text (from the guide, unedited)</div>
              <pre style={{ whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto", margin: 0, fontSize: 12 }}>
                {row.body || row.description || "The guide has no body text for this chapter."}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Daily log ----------------
export function DailyLogLearning({ date }: { date: string }) {
  const d = useLearningData();
  if (!d.hosted || d.loading) return null;
  const items = d.assignments.filter(
    (a) =>
      a.assignment_date === date ||
      d.feedback.some(
        (f) => f.assignment_id === a.id && zonedParts(new Date(f.created_at), d.prefs?.timezone ?? DEFAULT_TZ).date === date,
      ),
  );
  return (
    <Section title="Learning manager" meta="Recorded automatically">
      <div>
        {items.length ? (
          items.map((a) => {
            const t = d.topics.find((x) => x.id === a.topic_id);
            const fb = d.feedback.filter((f) => f.assignment_id === a.id);
            return (
              <div className="list-row" key={a.id}>
                <div className="row-between">
                  <span className="small semibold">
                    {t?.stable_topic_id} {t?.title}
                  </span>
                  <Badge
                    tone={
                      a.status === "completed"
                        ? "green"
                        : a.status === "partial"
                          ? "amber"
                          : "default"
                    }
                  >
                    {a.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="micro muted">
                  Planned {minutesLabel(a.planned_minutes)} · actual{" "}
                  {minutesLabel(a.tasks?.actual_minutes ?? a.recorded_minutes)} · evidence:{" "}
                  {a.task_completed ? "task completed" : "none yet"}
                </div>
                {fb.map((f) => (
                  <div className="micro" key={f.id}>
                    {ist(f.created_at)} · {f.channel} · {f.kind}
                    {f.minutes ? ` · ${f.minutes} min` : ""}
                    {f.notes ? ` — ${f.notes}` : ""}
                  </div>
                ))}
                {a.progress_notes && <div className="micro muted">Notes: {a.progress_notes}</div>}
              </div>
            );
          })
        ) : (
          <Empty title="No learning activity on this day" />
        )}
      </div>
    </Section>
  );
}

// ---------------- Settings ----------------
export function LearningSettings() {
  const d = useLearningData();
  const { user } = useStore();
  const [form, setForm] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    if (d.prefs && !form) setForm(d.prefs);
  }, [d.prefs, form]);
  useEffect(() => {
    // Create default preferences row on first visit.
    if (d.hosted && !d.loading && !d.prefs && user)
      void browserSupabase()!
        .from("learning_preferences")
        .insert({
          user_id: user.id,
          guide_url:
            "https://docs.google.com/document/d/1mvhBvoHWR70ZlynZTQp2KVvzyAwU0O6w-o7tTlC85dU/edit?usp=sharing",
        })
        .then(() => d.reload());
  }, [d, user]);
  if (!d.hosted)
    return (
      <Section title="AI learning manager">
        <div className="section-body small muted">
          Requires a signed-in account. Demo mode never syncs with the agent.
        </div>
      </Section>
    );
  if (!form) return null;
  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMsg("");
    try {
      const r = await fn();
      setMsg(typeof r === "string" ? r : `${label}: done`);
      await d.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  };
  const save = () =>
    run("Save", async () => {
      if (!isValidTimeZone(form.timezone ?? DEFAULT_TZ))
        throw new Error("Timezone must be a valid IANA name, e.g. Asia/Kolkata or Europe/London.");
      const { error } = await browserSupabase()!
        .from("learning_preferences")
        .update({
          guide_url: form.guide_url,
          sync_time: form.sync_time,
          morning_time: form.morning_time,
          evening_time: form.evening_time,
          daily_minutes: Number(form.daily_minutes),
          weekly_minutes: Number(form.weekly_minutes),
          paused: form.paused,
          timezone: form.timezone ?? DEFAULT_TZ,
        })
        .eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      await browserSupabase()!
        .from("agent_commands")
        .insert({
          user_id: user!.id,
          command: "refresh_preferences",
          workflow: "study_coach",
          payload: { scope: "learning" },
          source: "user",
          provenance: {},
        });
      return "Saved. The agent picks this up on its next poll.";
    });
  const report = d.version?.report ?? {};
  const seen = d.prefs?.hermes_last_seen_at;
  const tg: Record<string, string> = {
    unknown: "Unknown — no delivery reported by Hermes",
    sent_ok: "Hermes reported a successful send",
    send_failed: "Hermes reported a failed send",
    reply_ok: "Reply received and processed",
  };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  return (
    <Section title="AI learning manager">
      <div className="section-body form-grid">
        <Field label="Learning guide URL (Google Docs: shared or published-to-web link)" name="lm-url" full>
          <input id="lm-url" className="input" value={form.guide_url} onChange={set("guide_url")} />
        </Field>
        <div className="full small">
          <div>
            Curriculum:{" "}
            <strong>{d.source ? d.source.status.replace("_", " ") : "never synced"}</strong>
            {d.source?.last_synced_at && ` · last sync ${ist(d.source.last_synced_at)}`}
            {d.source?.last_checked_at && ` · checked ${ist(d.source.last_checked_at)}`}
          </div>
          {d.version && (
            <div className="micro muted">
              {d.version.topic_count} topics · volumes parsed{" "}
              {(report.parsed_volumes ?? []).join(", ")}
              {report.missing_volumes?.length
                ? ` · missing from document: ${report.missing_volumes.join(", ")}`
                : ""}
              {report.missing_topics?.length
                ? ` · missing chapters: ${report.missing_topics.join(", ")}`
                : ""}
            </div>
          )}
          {d.source?.last_error && (
            <div className="micro" style={{ color: "var(--amber, inherit)" }}>
              Last issue: {d.source.last_error.replaceAll("_", " ")}
            </div>
          )}
          <div>
            Hermes:{" "}
            <strong>
              {seen ? `last API call ${ist(seen)}` : "Not connected — no agent call recorded"}
            </strong>
          </div>
          <div>
            Telegram: <strong>{tg[d.prefs?.telegram_status ?? "unknown"]}</strong>
            {d.prefs?.telegram_status_at && ` · ${ist(d.prefs.telegram_status_at)}`}
          </div>
        </div>
        <Field label={`Curriculum check (${form.timezone ?? DEFAULT_TZ})`} name="lm-sync">
          <input
            id="lm-sync"
            type="time"
            className="input"
            value={form.sync_time}
            onChange={set("sync_time")}
          />
        </Field>
        <Field label={`Morning plan (${form.timezone ?? DEFAULT_TZ})`} name="lm-morning">
          <input
            id="lm-morning"
            type="time"
            className="input"
            value={form.morning_time}
            onChange={set("morning_time")}
          />
        </Field>
        <Field label={`Evening check-in (${form.timezone ?? DEFAULT_TZ})`} name="lm-evening">
          <input
            id="lm-evening"
            type="time"
            className="input"
            value={form.evening_time}
            onChange={set("evening_time")}
          />
        </Field>
        <Field label="Timezone" name="lm-tz">
          <input
            id="lm-tz"
            className="input"
            list="lm-tz-list"
            value={form.timezone ?? DEFAULT_TZ}
            onChange={set("timezone")}
          />
          <datalist id="lm-tz-list">
            {["Asia/Kolkata", "UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Singapore", "Asia/Dubai", "Australia/Sydney"].map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </Field>
        <Field label="Daily learning minutes" name="lm-daily">
          <input
            id="lm-daily"
            type="number"
            min={15}
            max={480}
            className="input"
            value={form.daily_minutes}
            onChange={set("daily_minutes")}
          />
        </Field>
        <Field label="Weekly availability (minutes)" name="lm-weekly">
          <input
            id="lm-weekly"
            type="number"
            min={0}
            max={3360}
            className="input"
            value={form.weekly_minutes}
            onChange={set("weekly_minutes")}
          />
        </Field>
        <label className="full small row" style={{ gap: 6 }}>
          <input type="checkbox" checked={!!form.paused} onChange={set("paused")} /> Pause daily
          learning (curriculum checks continue)
        </label>
        <div className="full row" style={{ gap: 6, flexWrap: "wrap" }}>
          <Button variant="primary" disabled={!!busy} onClick={() => void save()}>
            Save
          </Button>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Test document access", async () => {
                const r = await callLearning("test-document", { url: form.guide_url });
                return `Readable: ${r.topic_count} topics; ${r.complete ? "complete" : `incomplete — missing ${[...r.missing_volumes.map((v: string) => `Vol ${v}`), ...r.missing_topics].slice(0, 12).join(", ")}`}`;
              })
            }
          >
            Test document access
          </Button>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Sync", async () => {
                const r = await callLearning("sync");
                return `Sync: ${r.outcome.replaceAll("_", " ")}${r.changes ? ` · +${r.changes.added.length} new, ${r.changes.edited.length} edited, ${r.changes.removed.length} removed` : ""}`;
              })
            }
          >
            Sync curriculum now
          </Button>
          <label className="btn" style={{ cursor: busy ? "default" : "pointer" }}>
            Upload DOCX copy
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              disabled={!!busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void run("DOCX import", async () => {
                    const r = await uploadDocx(file);
                    return `DOCX import: ${r.outcome.replaceAll("_", " ")}${r.report && !r.report.complete ? " — guide incomplete; missing content was not invented" : ""}`;
                  });
              }}
            />
          </label>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Plan", async () => {
                const r = await callLearning("plan");
                return r.replayed
                  ? "Today's plan already exists."
                  : "Today's plan created — see Today.";
              })
            }
          >
            Generate today's plan
          </Button>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Hermes", async () => {
                await browserSupabase()!.from("agent_commands").insert({
                  user_id: user!.id,
                  command: "ping_learning_manager",
                  workflow: "study_coach",
                  payload: {},
                  source: "user",
                  provenance: {},
                });
                return "Test queued. Hermes status updates only when the agent actually calls the API.";
              })
            }
          >
            Test Hermes connection
          </Button>
          <Button
            disabled={!!busy}
            onClick={() =>
              void run("Telegram", async () => {
                await browserSupabase()!.from("agent_commands").insert({
                  user_id: user!.id,
                  command: "send_test_telegram",
                  workflow: "study_coach",
                  payload: {},
                  source: "user",
                  provenance: {},
                });
                return "Test message queued for Hermes. Status changes only after Hermes reports delivery.";
              })
            }
          >
            Send test Telegram
          </Button>
        </div>
        {msg && (
          <div className="full small" role="status">
            {msg}
          </div>
        )}
      </div>
    </Section>
  );
}

