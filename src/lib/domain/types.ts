export type TaskStatus = "backlog" | "month" | "week" | "today" | "doing" | "completed";
export type TaskType =
  | "Learn"
  | "Build"
  | "Practice"
  | "Interview"
  | "Network"
  | "Apply"
  | "Research"
  | "Document"
  | "Admin";
export type Priority = "low" | "medium" | "high";
export const APPLICATION_STAGES = [
  "Saved",
  "Planning to Apply",
  "Applied",
  "Recruiter Contact",
  "Screening",
  "Technical Interview",
  "Hiring Manager",
  "Final Round",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export type ApplicationStatus =
  | "Saved"
  | "Planning to Apply"
  | "Applied"
  | "Recruiter Contact"
  | "Screening"
  | "Technical Interview"
  | "Hiring Manager"
  | "Final Round"
  | "Offer"
  | "Rejected"
  | "Withdrawn";
export type SkillStatus = "Not Started" | "Learning" | "Practicing" | "Applied" | "Interview Ready";

export interface RowBase {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface Task extends RowBase {
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  estimated_minutes: number;
  actual_minutes: number;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  skill_id: string | null;
  project_id: string | null;
  goal_id: string | null;
  milestone_id: string | null;
  application_id: string | null;
  contact_id: string | null;
  completed_at: string | null;
  sort_order: number;
  tags: string[];
  recurrence: string | null;
  evidence_required: boolean;
  skill_topic_id?: string | null;
  repeat_child_id?: string | null;
}

export interface Goal extends RowBase {
  title: string;
  description: string;
  goal_type: "career" | "quarter" | "monthly";
  parent_goal_id: string | null;
  target_date: string | null;
  status: "active" | "completed" | "paused";
  reason: string;
  success_criteria: string;
}

export interface Milestone extends RowBase {
  goal_id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed";
  success_criteria: string;
}

export interface Skill extends RowBase {
  name: string;
  status: SkillStatus;
  category: string;
  knowledge: number;
  hands_on: number;
  project_proof: number;
  production: number;
  interview: number;
  last_activity: string | null;
}

export interface SkillTopic extends RowBase {
  skill_id: string;
  parent_topic_id: string | null;
  title: string;
  status: SkillStatus;
}

export interface Project extends RowBase {
  name: string;
  description: string;
  problem: string;
  business_value: string;
  architecture: string;
  technologies: string[];
  github_url: string;
  deployment_url: string;
  status: "Idea" | "Planning" | "Building" | "Testing" | "Deployed" | "Archived";
  start_date: string | null;
  target_date: string | null;
}

export interface Contact extends RowBase {
  name: string;
  company: string;
  role: string;
  linkedin_url: string;
  email: string;
  location: string;
  relationship_stage:
    | "New"
    | "Connected"
    | "Conversation Started"
    | "Active"
    | "Warm"
    | "Recruiter"
    | "Mentor"
    | "Archived";
  topics: string[];
  notes: string;
  date_connected: string | null;
  last_interaction: string | null;
  next_followup: string | null;
}

export interface NetworkInteraction extends RowBase {
  contact_id: string;
  kind:
    | "LinkedIn connection"
    | "LinkedIn message"
    | "email"
    | "call"
    | "meeting"
    | "comment"
    | "referral"
    | "follow-up";
  occurred_at: string;
  notes: string;
}

export interface InterviewQuestion extends RowBase {
  question: string;
  answer: string;
  category:
    | "Technical"
    | "Coding"
    | "System Design"
    | "Project"
    | "Behavioral"
    | "Architecture"
    | "Debugging"
    | "Cloud"
    | "AI/LLM";
  difficulty: "Easy" | "Medium" | "Hard";
  status: "New" | "Learning" | "Practiced" | "Strong";
  confidence: number;
  skill_id: string | null;
  last_practiced: string | null;
  practice_count: number;
}

export interface InterviewPractice extends RowBase {
  question_id: string;
  practiced_at: string;
  confidence: number;
  notes: string;
}

export interface InterviewStory extends RowBase {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  lessons: string;
  project_id: string | null;
  tags: string[];
}

export interface JobApplication extends RowBase {
  company: string;
  role: string;
  location: string;
  work_type: string;
  job_url: string;
  job_description: string;
  salary_range: string;
  date_found: string | null;
  date_applied: string | null;
  status: ApplicationStatus;
  recruiter: string;
  recruiter_linkedin: string;
  resume_version: string;
  notes: string;
  followup_date: string | null;
  priority: Priority;
}

export interface JobSkillRequirement extends RowBase {
  application_id: string;
  skill_name: string;
  requirement_type: string;
  skill_id: string | null;
  assessment: string;
}

export interface FocusSession extends RowBase {
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  note: string;
}

export interface Note extends RowBase {
  title: string;
  content: string;
  entity_type: string | null;
  entity_id: string | null;
  source_url: string;
  tags: string[];
}

export interface Resource extends RowBase {
  title: string;
  url: string;
  source_type: string;
  skill_id: string | null;
  project_id: string | null;
  status: "Inbox" | "To Review" | "Learning" | "Completed" | "Archived";
  priority: Priority;
  notes: string;
}

export interface Evidence extends RowBase {
  title: string;
  kind: string;
  url: string;
  description: string;
  skill_id: string | null;
  project_id: string | null;
  goal_id: string | null;
}

export interface InboxItem extends RowBase {
  content: string;
  kind: "unprocessed" | "task" | "note" | "resource" | "idea";
  archived: boolean;
}

export interface Activity extends RowBase {
  entity_type: string;
  entity_id: string;
  action: string;
  summary: string;
  occurred_at: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface DailyLog extends RowBase {
  log_date: string;
  journal: string;
}

export interface PlannerBlock extends RowBase {
  task_id: string | null;
  title: string;
  block_date: string;
  start_time: string;
  end_time: string;
}

/** Descriptive learning record. Time is ledgered in focus_sessions; these minutes are never summed. */
export interface LearningSession extends RowBase {
  skill_id: string | null;
  task_id: string | null;
  minutes: number;
  learned: string;
  occurred_at: string;
  /** Set when this row mirrors a focus_sessions ledger row; its minutes are already counted there. */
  focus_session_id?: string | null;
}

export interface AppNotification extends RowBase {
  title: string;
  body: string;
  read_at: string | null;
}

export interface EntityMap {
  task_subtasks: RowBase & { task_id: string; title: string; completed_at: string | null };
  task_dependencies: RowBase & { task_id: string; depends_on_id: string };
  project_milestones: RowBase & Record<string, unknown>;
  project_decisions: RowBase & Record<string, unknown>;
  project_tasks: RowBase & Record<string, unknown>;
  mock_interviews: RowBase & Record<string, unknown>;
  job_interviews: RowBase & Record<string, unknown>;
  followups: RowBase & Record<string, unknown>;
  companies: RowBase & Record<string, unknown>;
  job_leads: RowBase & Record<string, unknown>;
  outreach: RowBase & Record<string, unknown>;
  events: RowBase & Record<string, unknown>;
  tasks: Task;
  goals: Goal;
  milestones: Milestone;
  skills: Skill;
  skill_topics: SkillTopic;
  projects: Project;
  contacts: Contact;
  network_interactions: NetworkInteraction;
  interview_questions: InterviewQuestion;
  interview_practice: InterviewPractice;
  interview_stories: InterviewStory;
  job_applications: JobApplication;
  job_skill_requirements: JobSkillRequirement;
  focus_sessions: FocusSession;
  notes: Note;
  resources: Resource;
  evidence: Evidence;
  inbox_items: InboxItem;
  activity_log: Activity;
  daily_logs: DailyLog;
  planner_blocks: PlannerBlock;
  learning_sessions: LearningSession;
  notifications: AppNotification;
}

export type EntityName = keyof EntityMap;
export type AppData = { [K in EntityName]: EntityMap[K][] };

export const ENTITY_NAMES: EntityName[] = [
  "task_subtasks",
  "task_dependencies",
  "project_milestones",
  "project_decisions",
  "project_tasks",
  "mock_interviews",
  "job_interviews",
  "followups",
  "companies",
  "job_leads",
  "outreach",
  "events",
  "tasks",
  "goals",
  "milestones",
  "skills",
  "skill_topics",
  "projects",
  "contacts",
  "network_interactions",
  "interview_questions",
  "interview_practice",
  "interview_stories",
  "job_applications",
  "job_skill_requirements",
  "focus_sessions",
  "notes",
  "resources",
  "evidence",
  "inbox_items",
  "activity_log",
  "daily_logs",
  "planner_blocks",
  "learning_sessions",
  "notifications",
];

export function emptyData(): AppData {
  return Object.fromEntries(ENTITY_NAMES.map((name) => [name, []])) as unknown as AppData;
}
