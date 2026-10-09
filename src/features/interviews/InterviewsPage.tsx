import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, PageHeading, Section, dateLabel } from "@/components/ui";
import { InterviewQuestion } from "@/lib/domain/types";
import { useStore } from "@/lib/store";
import { localDay } from "@/lib/domain/insights";

const categories: InterviewQuestion["category"][] = ["Technical", "Coding", "System Design", "Project", "Behavioral", "Architecture", "Debugging", "Cloud", "AI/LLM"];

export function InterviewsPage() {
  const { data, add, update } = useStore();
  const [tab, setTab] = useState<"Questions" | "Story bank">("Questions");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<InterviewQuestion["category"]>("Technical");
  const [confidence, setConfidence] = useState(2);
  const [notes, setNotes] = useState("");
  const [story, setStory] = useState({ title: "", situation: "", task: "", action: "", result: "", lessons: "" });
  const [error, setError] = useState("");
  const item = data.interview_questions.find((entry) => entry.id === selected) ?? data.interview_questions[0];
  const practiced = data.interview_questions.filter((entry) => entry.practice_count > 0).length;

  const addQuestion = async () => {
    if (question.trim().length < 8) { setError("Enter a useful interview question."); return; }
    try { const created = await add("interview_questions", { question: question.trim(), answer: answer.trim(), category, difficulty: "Medium", status: "New", confidence: 0, skill_id: null, last_practiced: null, practice_count: 0 }); setSelected(created.id); setAdding(false); setQuestion(""); setAnswer(""); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add question."); }
  };
  const savePractice = async () => {
    if (!item) return;
    try {
      await add("interview_practice", { question_id: item.id, practiced_at: new Date().toISOString(), confidence, notes });
      await update("interview_questions", item.id, { confidence, practice_count: item.practice_count + 1, last_practiced: localDay(), status: confidence >= 4 ? "Strong" : "Practiced" });
      setPracticing(false); setNotes(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not record practice."); }
  };
  const saveStory = async () => {
    if (story.title.trim().length < 2) { setError("Enter a story title."); return; }
    try { await add("interview_stories", { ...story, project_id: null, tags: [] }); setAdding(false); setStory({ title: "", situation: "", task: "", action: "", result: "", lessons: "" }); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save story."); }
  };

  return <><PageHeading title="Interview prep" subtitle="Practice weak areas and keep concrete examples ready."><Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} />{tab === "Questions" ? "Add question" : "Add story"}</Button></PageHeading>
    <div className="summary" style={{ gridTemplateColumns: "repeat(3,1fr)" }}><div className="summary-item"><span>Question bank</span><strong>{data.interview_questions.length}</strong></div><div className="summary-item"><span>Practiced</span><strong>{practiced}</strong></div><div className="summary-item" style={{ borderRight: 0 }}><span>Needs work</span><strong>{data.interview_questions.filter((entry) => entry.confidence <= 2).length}</strong></div></div>
    <div className="tabs" style={{ marginBottom: 15 }}>{(["Questions", "Story bank"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "Questions" ? <div className="grid-main"><Section title="Question bank" meta={`${data.interview_questions.length}`}><div>{data.interview_questions.map((entry) => <button key={entry.id} className="list-row" style={{ display: "block", textAlign: "left", width: "100%", borderLeft: item?.id === entry.id ? "2px solid var(--blue)" : "2px solid transparent", borderTop: 0, borderRight: 0, background: item?.id === entry.id ? "var(--blue-soft)" : "transparent", color: "var(--text)" }} onClick={() => setSelected(entry.id)}><div className="small semibold">{entry.question}</div><div className="row" style={{ marginTop: 6 }}><Badge>{entry.category}</Badge><span className="micro muted">Practiced {entry.practice_count} times</span></div></button>)}{!data.interview_questions.length && <Empty title="No questions yet" detail="Add a question and practice it more than once." />}</div></Section>
      {item ? <div className="stack"><Section title="Practice question" action={<Badge tone={item.status === "Strong" ? "green" : "blue"}>{item.status}</Badge>}><div className="section-body"><h2 style={{ fontSize: 17, margin: "0 0 12px" }}>{item.question}</h2><div className="row small muted" style={{ marginBottom: 15 }}><span>{item.category}</span><span>·</span><span>{item.difficulty}</span><span>·</span><span>Last practiced {dateLabel(item.last_practiced)}</span></div><Field label="Working answer" name="interview-answer"><textarea id="interview-answer" className="textarea" key={item.id} defaultValue={item.answer} onBlur={(event) => { if (event.target.value !== item.answer) void update("interview_questions", item.id, { answer: event.target.value }); }} /></Field><div className="row-between" style={{ marginTop: 15 }}><span className="small muted">Confidence {item.confidence} / 4</span><Button variant="primary" onClick={() => { setConfidence(Math.max(1, item.confidence)); setPracticing(true); }}>Record practice</Button></div></div></Section><Section title="Practice history"><div>{data.interview_practice.filter((record) => record.question_id === item.id).sort((a, b) => b.practiced_at.localeCompare(a.practiced_at)).map((record) => <div key={record.id} className="list-row row-between small"><span>{record.notes || "Practice session"}</span><span className="muted">{dateLabel(record.practiced_at)} · {record.confidence}/4</span></div>)}{!data.interview_practice.some((record) => record.question_id === item.id) && <Empty title="No practice yet" detail="Record your first attempt and revisit later." />}</div></Section></div> : <Section title="Choose a question"><Empty title="Practice starts with a question" /></Section>}</div>
      : <Section title="STAR story bank" meta={`${data.interview_stories.length}`}><div className="grid-two" style={{ padding: 16 }}>{data.interview_stories.map((entry) => <div className="section-body" style={{ border: "1px solid var(--line)", borderRadius: 6 }} key={entry.id}><h2 className="semibold" style={{ fontSize: 14, margin: "0 0 10px" }}>{entry.title}</h2>{(["situation", "task", "action", "result", "lessons"] as const).map((field) => <div key={field} className="small" style={{ marginBottom: 8 }}><strong style={{ textTransform: "capitalize" }}>{field}: </strong><span className="muted">{entry[field] || "—"}</span></div>)}</div>)}{!data.interview_stories.length && <Empty title="No stories yet" detail="Save situations where your decisions produced a result." />}</div></Section>}
    {adding && <Dialog title={tab === "Questions" ? "Add interview question" : "Add STAR story"} onClose={() => setAdding(false)}>{tab === "Questions" ? <div className="form-grid"><Field label="Question" name="new-question" full><textarea id="new-question" className="textarea" autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} /></Field><Field label="Category" name="new-question-category"><select id="new-question-category" className="select" value={category} onChange={(event) => setCategory(event.target.value as InterviewQuestion["category"])}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Initial answer" name="new-question-answer" full><textarea id="new-question-answer" className="textarea" value={answer} onChange={(event) => setAnswer(event.target.value)} /></Field></div> : <div className="form-grid">{(["title", "situation", "task", "action", "result", "lessons"] as const).map((field) => <Field key={field} label={field[0].toUpperCase() + field.slice(1)} name={`story-${field}`} full><textarea id={`story-${field}`} className="textarea" style={{ minHeight: field === "title" ? 38 : 70 }} value={story[field]} onChange={(event) => setStory({ ...story, [field]: event.target.value })} /></Field>)}</div>}{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={() => void (tab === "Questions" ? addQuestion() : saveStory())}>Save {tab === "Questions" ? "question" : "story"}</Button></div></Dialog>}
    {practicing && item && <Dialog title="Record practice" onClose={() => setPracticing(false)}><div className="small semibold" style={{ marginBottom: 15 }}>{item.question}</div><Field label="Confidence (0–4)" name="practice-confidence"><select id="practice-confidence" className="select" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))}>{[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} {value === 0 ? "— unfamiliar" : value === 4 ? "— can explain clearly" : ""}</option>)}</select></Field><Field label="What improved or remains weak?" name="practice-notes"><textarea id="practice-notes" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setPracticing(false)}>Cancel</Button><Button variant="primary" onClick={() => void savePractice()}>Save practice</Button></div></Dialog>}
  </>;
}

