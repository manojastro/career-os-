import { useState } from "react";
import { Play, Pencil } from "lucide-react";
import { Task } from "@/lib/domain/types";
import { useStore } from "@/lib/store";
import { Button, Badge, minutesLabel } from "@/components/ui";
import { useFocus } from "@/features/focus/FocusProvider";
import { TaskForm } from "./TaskForm";

export function TaskRow({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { data, update } = useStore();
  const { start } = useFocus();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const linked =
    data.projects.find((item) => item.id === task.project_id)?.name ??
    data.skills.find((item) => item.id === task.skill_id)?.name ??
    data.goals.find((item) => item.id === task.goal_id)?.title;
  return (
    <>
      <div className="task-row">
        <input
          className="checkbox"
          type="checkbox"
          checked={task.status === "completed"}
          aria-label={`Complete ${task.title}`}
          onChange={(event) =>
            void update("tasks", task.id, {
              status: event.target.checked ? "completed" : "today",
              completed_at: event.target.checked ? new Date().toISOString() : null,
            }).catch((cause) =>
              setError(cause instanceof Error ? cause.message : "Could not update this task."),
            )
          }
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="task-title"
            style={{ textDecoration: task.status === "completed" ? "line-through" : undefined }}
          >
            {task.title}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="task-meta">
            {task.type}
            {linked ? ` · ${linked}` : ""} · {minutesLabel(task.estimated_minutes)}
            {task.actual_minutes ? ` planned / ${minutesLabel(task.actual_minutes)} actual` : ""}
          </div>
        </div>
        {!compact && (
          <Badge tone={task.priority === "high" ? "amber" : "default"}>{task.priority}</Badge>
        )}
        <div className="task-actions">
          <Button
            variant="quiet"
            className="btn-icon"
            aria-label={`Edit ${task.title}`}
            onClick={() => setEditing(true)}
          >
            <Pencil size={14} />
          </Button>
          {task.status !== "completed" && (
            <Button
              variant="quiet"
              aria-label={`Focus on ${task.title}`}
              onClick={() => start(task)}
            >
              <Play size={14} />
              <span className="hide-mobile">Focus</span>
            </Button>
          )}
        </div>
      </div>
      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
    </>
  );
}
