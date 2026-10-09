import type { RowBase } from "../domain/types";

export interface LearningPreferences extends RowBase {
  guide_url: string; sync_time: string; morning_time: string; evening_time: string;
  timezone: string; daily_minutes: number; weekly_minutes: number; paused: boolean;
  baseline_completed_at: string | null; hermes_last_seen_at: string | null;
  telegram_status: "unknown" | "sent_ok" | "send_failed" | "reply_ok";
  telegram_status_at: string | null;
}
export interface CurriculumSource extends RowBase {
  url: string; document_id: string; title: string; status: "never_synced" | "ok" | "incomplete" | "failed";
  active_version_id: string | null; last_checked_at: string | null; last_synced_at: string | null; last_error: string;
}
export interface CurriculumVersion extends RowBase {
  source_id: string; content_hash: string; status: "validated" | "incomplete" | "failed" | "unchanged";
  applied: boolean; topic_count: number; report: Record<string, unknown>;
}
export interface CurriculumTopic extends RowBase {
  source_id: string; stable_topic_id: string; volume: string; volume_title: string;
  title: string; description: string; parent_topic_id: string | null;
  priority: "MUST" | "SHOULD" | "OPTIONAL"; priority_source: "guide_label" | "inferred";
  sequence: number; recommended_minutes: number; practical_exercise: string; completion_criteria: string;
  interview_notes: string; body: string; source_reference: string; content_hash: string;
  first_version_id: string | null; last_version_id: string | null;
  skill_id: string | null; skill_topic_id: string | null; removed_at: string | null;
}
export interface CurriculumPrerequisite extends RowBase {
  topic_id: string; prerequisite_topic_id: string; basis: "sequence_inferred" | "guide_explicit" | "manual";
}
export interface LearningBaseline extends RowBase {
  topic_id: string; level: "Not Started" | "Familiar" | "Learning" | "Practiced" | "Applied"; basis: "manual" | "evidence";
}
export interface LearningAssignment extends RowBase {
  topic_id: string; task_id: string | null; assignment_date: string;
  status: "planned" | "delivered" | "completed" | "partial" | "not_started" | "rescheduled" | "cancelled";
  help_requested: boolean; planned_minutes: number; recorded_minutes: number;
  plan: { step: string; minutes: number }[]; rationale: string; practical_outcome: string;
  completion_criteria: string; progress_notes: string; is_inference: boolean;
  source: "app" | "agent"; idempotency_key: string; completed_at: string | null;
}
export interface LearningFeedback extends RowBase {
  assignment_id: string; kind: "completed" | "partial" | "not_started" | "reschedule" | "help" | "minutes";
  channel: "app" | "telegram" | "agent"; raw_text: string; minutes: number | null; notes: string;
  new_date: string | null; idempotency_key: string; result: Record<string, unknown>;
}
export interface TelegramMapping extends RowBase {
  assignment_id: string | null; kind: "morning_plan" | "evening_check" | "test" | "reply" | "help";
  direction: "outbound" | "inbound"; chat_ref: string; message_id: string;
  delivery_status: "sent" | "failed" | "received"; error: string;
}
export interface SchedulerRun extends RowBase {
  job: "curriculum_sync" | "morning_plan" | "evening_check"; run_date: string;
  status: "claimed" | "succeeded" | "failed" | "skipped"; catch_up: boolean;
  detail: Record<string, unknown>; started_at: string; finished_at: string | null;
  lease_until: string | null; attempt: number;
}
