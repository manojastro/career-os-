"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, Section, minutesLabel } from "@/components/ui";
import { useStore } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase";
import { istParts } from "@/lib/learning/engine";
import type { LearningBaseline, LearningPreferences } from "@/lib/learning/models";
import { TaskRow } from "@/features/tasks/TaskRow";

async function call(action: string, body: Record<string, unknown> = {}) {
  const session = await browserSupabase()?.auth.getSession();
  const token = session?.data.session?.access_token;
  const response = await fetch(`/api/learning/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(String(result.error ?? "Request failed").replaceAll("_", " "));
  return result;
}

function useAction() {
  const { refresh } = useStore();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, success = "Saved.") => {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  };
  return { run, message, busy };
}

export function TodayLearningCard() {
  const { data, hosted, learningReady } = useStore();
  const { run, message, busy } = useAction();
  if (!hosted || !learningReady) return null;
  const pref = data.learning_preferences[0];
  const assignment = data.learning_assignments.find(a => a.assignment_date === istParts(new Date(), pref?.timezone).date && !["cancelled", "rescheduled"].includes(a.status));
  const topic = data.curriculum_topics.find(t => t.id === assignment?.topic_id);
  const task = data.tasks.find(t => t.id === assignment?.task_id);
  return <Section title="Today's learning" action={<Link className="link small" href="/skills">Learning path</Link>}>
    <div className="section-body stack">
      {!data.curriculum_topics.length ? <p className="small muted">Sync your learning guide in Settings.</p> : !pref?.baseline_completed_at ? <p className="small muted">Review your starting levels in Skills before generating a plan.</p> : !assignment ? <div><p className="small muted">{pref.paused ? "Learning is paused." : "No learning assigned today."}</p><Button disabled={busy || pref.paused} onClick={() => void run(() => call("plan"))}>Generate today&apos;s plan</Button></div> : <>
        <div className="small muted">{topic?.priority} · {topic?.source_reference} · {assignment.status} · {minutesLabel(assignment.planned_minutes)} planned</div>
        {task && <TaskRow task={task} compact />}
        <div className="small">{assignment.rationale}</div>
        <ol className="small">{assignment.plan.map((step, i) => <li key={i}>{step.step} · {step.minutes} min</li>)}</ol>
        <div className="small muted">Completion: {assignment.completion_criteria}</div>
        <Link className="link small" href={`/today#task-${assignment.task_id}`}>Open task in Today</Link>
      </>}
      <span className="small muted" role="status">{message}</span>
    </div>
  </Section>;
}

export function LearningBaselineReview() {
  const { data, hosted, learningReady } = useStore();
  const { run, message, busy } = useAction();
  if (!hosted || !learningReady || !data.curriculum_topics.length) return null;
  return <Section title="Curriculum baseline"><div className="section-body small">
    {data.curriculum_sources.some(s => s.status === "incomplete") && <p>The guide is incomplete. Available chapters are shown in the existing topic library.</p>}
    <p>Review the starting levels beneath each topic. Manual levels and task evidence remain separate. Unrated topics start at Not Started.</p>
    {!data.learning_preferences[0]?.baseline_completed_at && <Button disabled={busy} onClick={() => void run(() => call("baseline"), "Baseline confirmed.")}>Confirm my starting levels</Button>}
    <span role="status">{message}</span>
  </div></Section>;
}

const levels: LearningBaseline["level"][] = ["Not Started", "Familiar", "Learning", "Practiced", "Applied"];
export function CurriculumTopicInfo({ skillTopicId }: { skillTopicId: string }) {
  const { data, update, add, user, hosted } = useStore();
  const { run, message, busy } = useAction();
  const topic = data.curriculum_topics.find(t => t.skill_topic_id === skillTopicId);
  if (!hosted || !topic) return null;
  const baseline = data.learning_baselines.find(b => b.topic_id === topic.id);
  const prerequisites = data.curriculum_prerequisites.filter(p => p.topic_id === topic.id).map(p => `${data.curriculum_topics.find(t => t.id === p.prerequisite_topic_id)?.stable_topic_id ?? "Unknown"} (${p.basis === "sequence_inferred" ? "inferred" : "explicit"})`);
  const skillTopic = data.skill_topics.find(t => t.id === skillTopicId);
  const suggestion = skillTopic?.status === "Practicing" ? "Practiced" : ["Applied", "Interview Ready"].includes(skillTopic?.status ?? "") ? "Applied" : skillTopic?.status === "Learning" ? "Learning" : data.evidence.some(e => e.skill_id === topic.skill_id) ? "Familiar" : null;
  const save = async (level: LearningBaseline["level"]) => {
    if (!user || baseline?.basis === "evidence") return;
    if (baseline) await update("learning_baselines", baseline.id, { level });
    else await add("learning_baselines", { topic_id: topic.id, level, basis: "manual" });
  };
  return <div className="small" style={{ marginTop: 8 }}>
    <div className="muted">{topic.priority}{topic.priority_source === "inferred" ? " (inferred)" : ""} · {topic.source_reference}{topic.removed_at ? " · removed from latest source" : ""}</div>
    <div className="muted">Prerequisites: {prerequisites.join(", ") || "None"}</div>
    {suggestion && !baseline && <div className="muted">Suggested starting level from Skills (inference): {suggestion}</div>}
    <label>Starting level ({baseline?.basis ?? "manual"}) <select className="select" aria-label={`Baseline for ${topic.stable_topic_id}`} disabled={busy || baseline?.basis === "evidence"} value={baseline?.level ?? "Not Started"} onChange={e => void run(() => save(e.target.value as LearningBaseline["level"]))}>{levels.map(level => <option key={level}>{level}</option>)}</select></label>
    <details><summary>Guide details · {topic.stable_topic_id}</summary><p>{topic.practical_exercise}</p><p>{topic.completion_criteria || "No completion criterion supplied by the guide."}</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", font: "inherit" }}>{topic.body}</pre></details>
    <span role="status">{message}</span>
  </div>;
}

export function DailyLearningLog({ date }: { date: string }) {
  const { data, hosted } = useStore();
  if (!hosted) return null;
  const feedback = data.learning_feedback.filter(f => istParts(new Date(f.created_at), data.learning_preferences[0]?.timezone).date === date);
  if (!feedback.length) return null;
  return <Section title="Learning check-ins"><div className="section-body small stack">{feedback.map(f => <div key={f.id}><strong>{f.kind.replaceAll("_", " ")}</strong> · {f.channel} · {f.minutes ?? 0} min added{f.notes && <div>{f.notes}</div>}</div>)}</div></Section>;
}

export function LearningSettings() {
  const { data, hosted, learningReady } = useStore();
  const pref = data.learning_preferences[0];
  if (!hosted) return <Section title="AI learning manager"><div className="section-body small muted">Sign in to a hosted workspace to import your guide and connect Hermes.</div></Section>;
  if (!learningReady) return <Section title="AI learning manager"><div className="section-body small muted">Apply the learning database migrations to enable this extension.</div></Section>;
  return <LearningSettingsForm key={pref?.id ?? "new"} pref={pref} />;
}

function LearningSettingsForm({ pref }: { pref?: LearningPreferences }) {
  const { data } = useStore();
  const [draft, setDraft] = useState({ guide_url: pref?.guide_url ?? "https://docs.google.com/document/d/1mvhBvoHWR70ZlynZTQp2KVvzyAwU0O6w-o7tTlC85dU/edit", sync_time: pref?.sync_time.slice(0, 5) ?? "10:30", morning_time: pref?.morning_time.slice(0, 5) ?? "11:00", evening_time: pref?.evening_time.slice(0, 5) ?? "20:30", daily_minutes: pref?.daily_minutes ?? 90, weekly_minutes: pref?.weekly_minutes ?? 600, timezone: pref?.timezone ?? "Asia/Kolkata", paused: pref?.paused ?? false });
  const { run, message, busy } = useAction();
  const source = data.curriculum_sources.toSorted((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
  return <Section title="AI learning manager"><div className="section-body stack">
    <Field label="Learning guide URL" name="learning-guide"><input id="learning-guide" className="input" value={draft.guide_url} onChange={e => setDraft({ ...draft, guide_url: e.target.value })} /></Field>
    <div className="form-grid">{(["sync_time", "morning_time", "evening_time"] as const).map(k => <Field key={k} label={k.replaceAll("_", " ")} name={`learning-${k}`}><input id={`learning-${k}`} type="time" className="input" value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })} /></Field>)}
    {(["daily_minutes", "weekly_minutes"] as const).map(k => <Field key={k} label={k.replaceAll("_", " ")} name={`learning-${k}`}><input id={`learning-${k}`} type="number" min={15} max={k === "daily_minutes" ? 600 : 4200} className="input" value={draft[k]} onChange={e => setDraft({ ...draft, [k]: Number(e.target.value) })} /></Field>)}
    <Field label="Timezone" name="learning-timezone"><input id="learning-timezone" className="input" value={draft.timezone} onChange={e => setDraft({ ...draft, timezone: e.target.value })} /></Field></div>
    <label className="small"><input type="checkbox" checked={draft.paused} onChange={e => setDraft({ ...draft, paused: e.target.checked })} /> Pause learning messages</label>
    <div className="row" style={{ flexWrap: "wrap" }}><Button disabled={busy} onClick={() => void run(() => call("save-preferences", draft))}>Save learning settings</Button><Button disabled={busy} onClick={() => void run(() => call("test-document", { url: draft.guide_url }), "Document is readable.")}>Test document access</Button><Button disabled={busy} onClick={() => void run(async () => { await call("save-preferences", draft); return call("sync"); }, "Curriculum sync finished; review source status below.")}>Sync curriculum now</Button></div>
    <div className="small muted">Source: {source?.status ?? "not synced"} · checked {source?.last_checked_at ?? "never"}<br />Hermes last verified API call: {pref?.hermes_last_seen_at ?? "never"}<br />Telegram: {pref?.telegram_status ?? "unknown"} {pref?.telegram_status_at ?? ""}</div>
    <div className="row"><Button disabled={busy} onClick={() => void run(() => call("request-test", { command: "ping_learning_manager" }), "Test queued. A running Hermes worker must acknowledge it.")}>Test Hermes</Button><Button disabled={busy} onClick={() => void run(() => call("request-test", { command: "send_test_telegram" }), "Telegram test queued; delivery is not yet verified.")}>Send test Telegram message</Button></div>
    <span className="small muted" role="status">{message}</span>
  </div></Section>;
}
