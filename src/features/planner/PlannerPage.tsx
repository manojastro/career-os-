"use client";

import { useState } from "react";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { Plus, GripVertical } from "lucide-react";
import { Button, Dialog, Empty, Field, PageHeading, Section, minutesLabel } from "@/components/ui";
import { localDay, mondayOf } from "@/lib/domain/insights";
import { Task } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

const slots = ["07:00", "09:00", "12:00", "18:00", "20:00", "21:00"];
const addDays = (value: string, days: number) => { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return localDay(date); };
const labelDay = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
const endTime = (start: string, minutes: number) => { const [h, m] = start.split(":").map(Number); const end = h * 60 + m + minutes; return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`; };

function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  return <div ref={setNodeRef} {...attributes} {...listeners} className="list-row row" style={{ touchAction: "none", cursor: "grab", transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined, background: "var(--surface)", position: "relative", zIndex: transform ? 30 : undefined }}><GripVertical size={14} className="muted" /><div><div className="small semibold">{task.title}</div><div className="micro muted">{minutesLabel(task.estimated_minutes)}</div></div></div>;
}

function DropSlot({ date, time, children }: { date: string; time: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: `${date}|${time}` });
  return <div ref={setNodeRef} style={{ minHeight: 58, borderBottom: "1px solid var(--line)", padding: "5px", background: isOver ? "var(--blue-soft)" : undefined }}><div className="micro muted" style={{ marginBottom: 4 }}>{time}</div>{children}</div>;
}

export function PlannerPage() {
  const { data, add, update } = useStore();
  const [view, setView] = useState<"Today" | "Week" | "Month">("Week");
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDay());
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");
  const dates = view === "Today" ? [localDay()] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const unscheduled = data.tasks.filter((task) => task.status !== "completed" && !data.planner_blocks.some((block) => block.task_id === task.id));

  const onDrop = async ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const task = data.tasks.find((item) => item.id === active.id);
    if (!task) return;
    const [blockDate, time] = String(over.id).split("|");
    if (!blockDate || !time) return;
    try {
      await add("planner_blocks", { task_id: task.id, title: task.title, block_date: blockDate, start_time: time, end_time: endTime(time, Math.max(15, task.estimated_minutes)) });
      await update("tasks", task.id, { scheduled_date: blockDate, scheduled_start: time, scheduled_end: endTime(time, Math.max(15, task.estimated_minutes)), status: blockDate === localDay() ? "today" : "week" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not schedule task."); }
  };

  const saveBlock = async () => {
    if (!title.trim() && !taskId) { setError("Enter a title or choose a task."); return; }
    if (end <= start) { setError("End time must be after start time."); return; }
    const task = data.tasks.find((item) => item.id === taskId);
    try {
      await add("planner_blocks", { task_id: taskId || null, title: task?.title ?? title.trim(), block_date: date, start_time: start, end_time: end });
      if (task) await update("tasks", task.id, { scheduled_date: date, scheduled_start: start, scheduled_end: end, status: date === localDay() ? "today" : "week" });
      setAdding(false); setTitle(""); setTaskId(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save time block."); }
  };

  return <><PageHeading title="Planner" subtitle="Make room for the work before the week fills up."><Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} />Time block</Button></PageHeading>
    <div className="row-between" style={{ marginBottom: 16, flexWrap: "wrap" }}><div className="tabs">{(["Today", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={view === item ? "active" : ""}>{item}</button>)}</div><div className="row"><Button onClick={() => setWeekStart(addDays(weekStart, -7))}>Previous</Button><span className="small semibold">Week of {labelDay(weekStart)}</span><Button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</Button></div></div>
    {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}
    <DndContext onDragEnd={(event) => void onDrop(event)}><div className="grid-main planner-grid"><Section title={view === "Month" ? "Month overview" : "Time blocks"} meta="Drag a task onto a time slot"><div className="table-wrap">
      {view === "Month" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(110px,1fr))", minWidth: 770 }}>{Array.from({ length: 28 }, (_, index) => { const day = addDays(weekStart, index); const blocks = data.planner_blocks.filter((block) => block.block_date === day); return <div key={day} style={{ minHeight: 90, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: 8 }}><strong className="small">{labelDay(day)}</strong>{blocks.slice(0, 2).map((block) => <div className="micro muted" key={block.id}>{block.start_time} {block.title}</div>)}{blocks.length > 2 && <div className="micro muted">+{blocks.length - 2} more</div>}</div>; })}</div> : <div style={{ display: "grid", gridTemplateColumns: `repeat(${dates.length},minmax(${view === "Today" ? 300 : 135}px,1fr))`, minWidth: view === "Today" ? 0 : 945 }}>{dates.map((day) => <div key={day} style={{ borderRight: "1px solid var(--line)" }}><div style={{ padding: "10px", fontWeight: 600, fontSize: 12, background: "var(--soft)", borderBottom: "1px solid var(--line)" }}>{labelDay(day)}{day === localDay() && <span className="badge blue" style={{ marginLeft: 5 }}>Today</span>}</div>{slots.map((time) => <DropSlot key={time} date={day} time={time}>{data.planner_blocks.filter((block) => block.block_date === day && block.start_time === time).map((block) => <div key={block.id} style={{ background: "var(--blue-soft)", color: "var(--text)", borderLeft: "2px solid var(--blue)", borderRadius: 3, padding: 5, fontSize: 11 }}>{block.title}<div className="micro muted">{block.start_time}–{block.end_time}</div></div>)}</DropSlot>)}</div>)}</div>}
    </div></Section><Section title="Unscheduled tasks" meta={`${unscheduled.length}`}><div style={{ maxHeight: 650, overflow: "auto" }}>{unscheduled.length ? unscheduled.slice(0, 25).map((task) => <DraggableTask key={task.id} task={task} />) : <Empty title="Everything has a place" detail="New tasks will appear here for scheduling." />}</div></Section></div></DndContext>
    {adding && <Dialog title="Add time block" onClose={() => setAdding(false)}><div className="form-grid"><Field label="Task (optional)" name="block-task" full><select id="block-task" className="select" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">No linked task</option>{data.tasks.filter((task) => task.status !== "completed").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field><Field label="Title" name="block-title" full><input id="block-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} disabled={!!taskId} /></Field><Field label="Day" name="block-day"><input id="block-day" type="date" className="input" value={date} onChange={(event) => setDate(event.target.value)} /></Field><div /><Field label="Start" name="block-start"><input id="block-start" type="time" className="input" value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="End" name="block-end"><input id="block-end" type="time" className="input" value={end} onChange={(event) => setEnd(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveBlock()}>Save block</Button></div></Dialog>}
  </>;
}
