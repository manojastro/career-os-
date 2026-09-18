"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, PageHeading, Section } from "@/components/ui";
import { skillReadiness } from "@/lib/domain/insights";
import { SkillStatus } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

const statuses: SkillStatus[] = ["Not Started", "Learning", "Practicing", "Applied", "Interview Ready"];
const dimensions = ["Knowledge", "Hands-on", "Project proof", "Production", "Interview"];
const keys = ["knowledge", "hands_on", "project_proof", "production", "interview"] as const;

export function SkillsPage() {
  const { data, add, update } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [showSkill, setShowSkill] = useState(false);
  const [showTopic, setShowTopic] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const skill = data.skills.find((item) => item.id === selected) ?? data.skills[0];
  const topics = data.skill_topics.filter((topic) => topic.skill_id === skill?.id);
  const evidence = data.evidence.filter((item) => item.skill_id === skill?.id);

  const saveSkill = async () => {
    if (name.trim().length < 2) { setError("Enter a skill name."); return; }
    try { const created = await add("skills", { name: name.trim(), category: category.trim(), status: "Not Started", knowledge: 0, hands_on: 0, project_proof: 0, production: 0, interview: 0, last_activity: null }); setSelected(created.id); setShowSkill(false); setName(""); setCategory(""); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add skill."); }
  };
  const saveTopic = async () => {
    if (!skill || name.trim().length < 2) { setError("Enter a topic name."); return; }
    try { await add("skill_topics", { skill_id: skill.id, parent_topic_id: null, title: name.trim(), status: "Not Started" }); setShowTopic(false); setName(""); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add topic."); }
  };

  return <><PageHeading title="Skills" subtitle="Track what you know, what you have used, and the proof behind it."><Button variant="primary" onClick={() => { setName(""); setShowSkill(true); }}><Plus size={15} />Add skill</Button></PageHeading>
    <div className="grid-main"><Section title="Skill library" meta={`${data.skills.length} skills`}><div>{data.skills.length ? data.skills.map((item) => <button className="list-row row-between" key={item.id} style={{ width: "100%", textAlign: "left", background: skill?.id === item.id ? "var(--blue-soft)" : "transparent", borderTop: 0, borderLeft: skill?.id === item.id ? "2px solid var(--blue)" : "2px solid transparent", borderRight: 0, color: "var(--text)" }} onClick={() => setSelected(item.id)}><div><div className="small semibold">{item.name}</div><div className="micro muted">{item.category || "Uncategorized"} · {data.skill_topics.filter((topic) => topic.skill_id === item.id).length} topics</div></div><Badge tone={item.status === "Applied" || item.status === "Interview Ready" ? "green" : item.status === "Learning" ? "amber" : "blue"}>{item.status}</Badge></button>) : <Empty title="No skills yet" detail="Add a skill and break it into topics." />}</div></Section>
      <div className="stack">{skill ? <><Section title={skill.name} action={<select className="select" aria-label="Skill status" style={{ width: 150 }} value={skill.status} onChange={(event) => void update("skills", skill.id, { status: event.target.value as SkillStatus, last_activity: new Date().toISOString().slice(0, 10) })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>}><div className="section-body"><p className="small muted" style={{ marginTop: 0 }}>Readiness indicators use a 0–4 scale. Use evidence to explain each rating.</p><div className="stack" style={{ gap: 10 }}>{skillReadiness(skill).map((value, index) => <div className="row-between" key={keys[index]}><span className="small" style={{ width: 120 }}>{dimensions[index]}</span><div className="row" style={{ flex: 1, gap: 4 }}>{[1, 2, 3, 4].map((level) => <span key={level} style={{ display: "block", height: 8, flex: 1, background: level <= value ? "var(--blue)" : "var(--line)", borderRadius: 2 }} />)}</div><select className="select" aria-label={`${dimensions[index]} level`} style={{ width: 64, minHeight: 28, padding: "3px 5px" }} value={value} onChange={(event) => void update("skills", skill.id, { [keys[index]]: Number(event.target.value), last_activity: new Date().toISOString().slice(0, 10) })}>{[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}</select></div>)}</div></div></Section>
      <Section title="Topics" meta={`${topics.length}`} action={<Button onClick={() => { setName(""); setShowTopic(true); }}><Plus size={14} />Add topic</Button>}><div>{topics.map((topic) => <div className="list-row row-between" key={topic.id}><span className="small semibold">{topic.title}</span><select className="select" aria-label={`Status for ${topic.title}`} style={{ width: 130, minHeight: 30, padding: "4px 6px" }} value={topic.status} onChange={(event) => void update("skill_topics", topic.id, { status: event.target.value as SkillStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div>)}{!topics.length && <Empty title="No topics yet" detail="Break this skill into specific areas to study and practice." />}</div></Section>
      <Section title="Proof & linked work"><div className="section-body"><div className="row-between small"><span>Evidence records</span><strong>{evidence.length}</strong></div><div className="row-between small" style={{ marginTop: 8 }}><span>Linked project tasks</span><strong>{data.tasks.filter((task) => task.skill_id === skill.id && task.status === "completed").length} completed</strong></div>{evidence.map((item) => <div className="list-row small" key={item.id}>{item.title} <span className="muted">· {item.kind}</span></div>)}{!evidence.length && <p className="small muted">Add code, a demo, or a write-up in Evidence under More.</p>}</div></Section>
      </> : <Section title="Choose a skill"><Empty title="Your skill map starts here" detail="Add a skill to track topics and proof." /></Section>}</div></div>
    {showSkill && <Dialog title="Add skill" onClose={() => setShowSkill(false)}><div className="form-grid"><Field label="Skill name" name="skill-name" full><input id="skill-name" className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Category" name="skill-category" full><input id="skill-category" className="input" placeholder="Engineering" value={category} onChange={(event) => setCategory(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setShowSkill(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveSkill()}>Add skill</Button></div></Dialog>}
    {showTopic && <Dialog title={`Add topic to ${skill?.name}`} onClose={() => setShowTopic(false)}><Field label="Topic name" name="topic-name"><input id="topic-name" className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setShowTopic(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveTopic()}>Add topic</Button></div></Dialog>}
  </>;
}
