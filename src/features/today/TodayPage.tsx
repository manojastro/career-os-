import { Link } from "@/lib/router-compat";
import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { GripVertical, Plus, Sparkles, ArrowRight } from "lucide-react";
import { Button, Empty, PageHeading, Section, minutesLabel, dateLabel } from "@/components/ui";
import { localDay, overdueTasks, todayTasks } from "@/lib/domain/insights";
import { Task } from "@/lib/domain/types";
import { useStore } from "@/lib/store";
import { TaskRow } from "@/features/tasks/TaskRow";

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  return <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition, display: "flex", alignItems: "center" }}><button className="btn btn-quiet btn-icon" style={{ marginLeft: 5 }} aria-label={`Reorder ${task.title}`} {...attributes} {...listeners}><GripVertical size={15} /></button><div style={{ flex: 1, minWidth: 0 }}><TaskRow task={task} compact /></div></div>;
}

export function TodayPage({ openTask }: { openTask: () => void }) {
  const { data, add, update } = useStore();
  const tasks = todayTasks(data);
  const overdue = overdueTasks(data);
  const blocks = data.planner_blocks.filter((block) => block.block_date === localDay()).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const planned = tasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const actual = tasks.reduce((sum, task) => sum + task.actual_minutes, 0);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = tasks.findIndex((task) => task.id === active.id);
    const to = tasks.findIndex((task) => task.id === over.id);
    const sorted = [...tasks];
    const [moved] = sorted.splice(from, 1);
    sorted.splice(to, 0, moved);
    await Promise.all(sorted.map((task, index) => update("tasks", task.id, { sort_order: index + 1 })));
  };

  const saveNote = async () => {
    if (!note.trim()) return;
    try {
      await add("notes", { title: `Quick note · ${localDay()}`, content: `<p>${note.trim().replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`, entity_type: null, entity_id: null, source_url: "", tags: ["daily"] });
      setNote(""); setNoteError("");
    } catch (cause) { setNoteError(cause instanceof Error ? cause.message : "Could not save note."); }
  };

  return <><PageHeading title="Today" subtitle="An execution space for the work you chose."><Link className="btn" href="/copilot"><Sparkles size={14} />Replan with AI</Link><Button variant="primary" onClick={openTask}><Plus size={15} />Add task</Button></PageHeading>
    <div className="summary" style={{ gridTemplateColumns: "repeat(3,1fr)" }}><div className="summary-item"><span>Priorities</span><strong>{tasks.length}</strong></div><div className="summary-item"><span>Planned</span><strong>{minutesLabel(planned)}</strong></div><div className="summary-item" style={{ borderRight: 0 }}><span>Actual</span><strong>{minutesLabel(actual)}</strong></div></div>
    <div className="grid-main"><div className="stack"><Section title="Prioritized tasks" meta="Drag to reorder" action={<Link href="/tasks" className="link small">All tasks</Link>}>
      {tasks.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}><SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>{tasks.map((task) => <SortableTask key={task.id} task={task} />)}</SortableContext></DndContext> : <Empty title="No tasks planned for today" detail="Add a task or move one from your weekly list." />}
    </Section>
    {overdue.length > 0 && <Section title="Overdue" meta={`${overdue.length} items`}><div>{overdue.map((task) => <div className="list-row row-between" key={task.id}><div><div className="small semibold">{task.title}</div><div className="micro muted">Due {dateLabel(task.due_date)}</div></div><Button onClick={() => void update("tasks", task.id, { scheduled_date: localDay(), due_date: localDay(), status: "today" })}>Move to today</Button></div>)}</div></Section>}
    <Section title="Quick notes"><div className="section-body"><textarea className="textarea" aria-label="Quick note" placeholder="What did you learn or notice?" value={note} onChange={(event) => setNote(event.target.value)} />{noteError && <div className="error">{noteError}</div>}<div className="form-actions"><Button disabled={!note.trim()} onClick={() => void saveNote()}>Save note</Button></div></div></Section>
    </div><div className="stack"><Section title="Schedule" action={<Link href="/planner" className="link small">Open planner <ArrowRight size={12} /></Link>}><div>{blocks.length ? blocks.map((block) => <div className="list-row row" key={block.id}><div style={{ minWidth: 95, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{block.start_time}–{block.end_time}</div><div className="small">{block.title}</div></div>) : <Empty title="No time blocks yet" detail="Give your priorities a place in the day." />}</div></Section>
      <Section title="Next up" meta="Unfinished this week"><div>{data.tasks.filter((task) => task.status === "week").slice(0, 5).map((task) => <div className="list-row row-between" key={task.id}><div className="small">{task.title}</div><Button variant="quiet" onClick={() => void update("tasks", task.id, { status: "today", scheduled_date: localDay() })}>Today</Button></div>)}{!data.tasks.some((task) => task.status === "week") && <Empty title="Weekly list is clear" detail="Move backlog items into this week when ready." />}</div></Section>
    </div></div>
  </>;
}

