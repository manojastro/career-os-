import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Dialog, Field } from "@/components/ui";
import { localDay } from "@/lib/domain/insights";
import { Task, TaskStatus, TaskType } from "@/lib/domain/types";
import { useStore } from "@/lib/store";
import { useState } from "react";

const taskTypes: TaskType[] = ["Learn", "Build", "Practice", "Interview", "Network", "Apply", "Research", "Document", "Admin"];
const statuses: TaskStatus[] = ["backlog", "month", "week", "today", "doing", "completed"];
const schema = z.object({
  title: z.string().trim().min(2, "Enter a task title."),
  description: z.string(),
  type: z.enum(taskTypes as [TaskType, ...TaskType[]]),
  status: z.enum(statuses as [TaskStatus, ...TaskStatus[]]),
  priority: z.enum(["low", "medium", "high"]),
  estimated_minutes: z.number().min(0).max(1440),
  due_date: z.string(), scheduled_date: z.string(),
  skill_id: z.string(), project_id: z.string(), goal_id: z.string(),
});
type Values = z.infer<typeof schema>;

export function TaskForm({ onClose, task, initialStatus = "backlog", initialTitle = "" }: { onClose: () => void; task?: Task; initialStatus?: TaskStatus; initialTitle?: string }) {
  const { data, add, update } = useStore();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? initialTitle, description: task?.description ?? "", type: task?.type ?? "Learn", status: task?.status ?? initialStatus,
      priority: task?.priority ?? "medium", estimated_minutes: task?.estimated_minutes ?? 45, due_date: task?.due_date ?? "",
      scheduled_date: task?.scheduled_date ?? (initialStatus === "today" ? localDay() : ""), skill_id: task?.skill_id ?? "", project_id: task?.project_id ?? "", goal_id: task?.goal_id ?? "",
    },
  });

  const save = handleSubmit(async (values) => {
    setSaving(true); setServerError("");
    const fields = { ...values, due_date: values.due_date || null, scheduled_date: values.scheduled_date || null,
      skill_id: values.skill_id || null, project_id: values.project_id || null, goal_id: values.goal_id || null };
    try {
      if (task) await update("tasks", task.id, fields);
      else await add("tasks", { ...fields, actual_minutes: 0, scheduled_start: null, scheduled_end: null, milestone_id: null, application_id: null, contact_id: null, completed_at: null, sort_order: data.tasks.length + 1, tags: [], recurrence: null, evidence_required: false });
      onClose();
    } catch (cause) { setServerError(cause instanceof Error ? cause.message : "Could not save task."); }
    finally { setSaving(false); }
  });

  return <Dialog title={task ? "Edit task" : "New task"} onClose={onClose}><form onSubmit={save}><div className="form-grid">
    <Field label="Task" name="task-title" full><input id="task-title" className="input" autoFocus {...register("title")} />{errors.title && <span className="error">{errors.title.message}</span>}</Field>
    <Field label="Description" name="task-description" full><textarea id="task-description" className="textarea" {...register("description")} /></Field>
    <Field label="Type" name="task-type"><select id="task-type" className="select" {...register("type")}>{taskTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
    <Field label="Stage" name="task-status"><select id="task-status" className="select" {...register("status")}>{statuses.map((value) => <option key={value} value={value}>{value === "month" ? "This month" : value === "week" ? "This week" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></Field>
    <Field label="Priority" name="task-priority"><select id="task-priority" className="select" {...register("priority")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
    <Field label="Estimate (minutes)" name="task-estimate"><input id="task-estimate" type="number" className="input" {...register("estimated_minutes", { valueAsNumber: true })} /></Field>
    <Field label="Scheduled day" name="task-scheduled"><input id="task-scheduled" type="date" className="input" {...register("scheduled_date")} /></Field>
    <Field label="Due date" name="task-due"><input id="task-due" type="date" className="input" {...register("due_date")} /></Field>
    <Field label="Skill" name="task-skill"><select id="task-skill" className="select" {...register("skill_id")}><option value="">None</option>{data.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></Field>
    <Field label="Project" name="task-project"><select id="task-project" className="select" {...register("project_id")}><option value="">None</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
    <Field label="Goal" name="task-goal" full><select id="task-goal" className="select" {...register("goal_id")}><option value="">None</option>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></Field>
  </div>{serverError && <p className="error">{serverError}</p>}<div className="form-actions"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={saving} type="submit">{saving ? "Saving…" : task ? "Save task" : "Create task"}</Button></div></form></Dialog>;
}

