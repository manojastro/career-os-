"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Empty, PageHeading, Section } from "@/components/ui";
import { TaskStatus } from "@/lib/domain/types";
import { useStore } from "@/lib/store";
import { TaskRow } from "./TaskRow";

const stages: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" }, { value: "backlog", label: "Backlog" }, { value: "month", label: "This month" },
  { value: "week", label: "This week" }, { value: "today", label: "Today" }, { value: "doing", label: "Doing" }, { value: "completed", label: "Completed" },
];

export function TasksPage({ openTask }: { openTask: () => void }) {
  const { data } = useStore();
  const [stage, setStage] = useState<TaskStatus | "all">("all");
  const [query, setQuery] = useState("");
  const tasks = data.tasks.filter((task) => !task.deleted_at && (stage === "all" || task.status === stage) && task.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.status.localeCompare(b.status) || a.sort_order - b.sort_order);
  return <><PageHeading title="Tasks" subtitle="Move work from idea to finished proof."><Button variant="primary" onClick={openTask}><Plus size={15} />New task</Button></PageHeading>
    <div className="row-between" style={{ marginBottom: 15, alignItems: "flex-start", flexWrap: "wrap" }}><div className="tabs" style={{ flexWrap: "wrap" }}>{stages.map((item) => <button key={item.value} className={stage === item.value ? "active" : ""} onClick={() => setStage(item.value)}>{item.label} <span className="muted">{item.value === "all" ? data.tasks.length : data.tasks.filter((task) => task.status === item.value).length}</span></button>)}</div><div className="row" style={{ border: "1px solid var(--line)", borderRadius: 6, paddingLeft: 8, background: "var(--surface)" }}><Search size={14} className="muted" /><input className="input" aria-label="Filter tasks" placeholder="Filter tasks" style={{ border: 0, width: 180 }} value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
    <Section title={stage === "all" ? "All tasks" : stages.find((item) => item.value === stage)?.label ?? "Tasks"} meta={`${tasks.length} tasks`}>{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} />) : <Empty title="No tasks here" detail="Create a task or choose another stage." />}</Section>
  </>;
}
