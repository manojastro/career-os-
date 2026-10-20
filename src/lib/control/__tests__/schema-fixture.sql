CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS 'SELECT ''service_role''::text';
CREATE TABLE public.activity_log(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
entity_type text NOT NULL,
entity_id uuid NOT NULL,
action text NOT NULL,
summary text NOT NULL,
occurred_at timestamptz NOT NULL DEFAULT now(),
metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.agent_commands(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
command text NOT NULL,
workflow text NOT NULL DEFAULT 'all'::text,
payload jsonb NOT NULL DEFAULT '{}'::jsonb,
status text NOT NULL DEFAULT 'queued'::text,
idempotency_key text,
claimed_at timestamptz,
completed_at timestamptz,
result jsonb NOT NULL DEFAULT '{}'::jsonb,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.agent_notifications(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
body text NOT NULL DEFAULT ''::text,
channel text NOT NULL DEFAULT 'in_app'::text,
delivery_status text NOT NULL DEFAULT 'pending'::text,
delivered_at timestamptz,
read_at timestamptz,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'agent'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.agent_owner(
singleton bool NOT NULL DEFAULT true PRIMARY KEY,
user_id uuid NOT NULL,
bound_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.agent_rate_limits(
bucket text NOT NULL,
window_start timestamptz NOT NULL,
hits int4 NOT NULL DEFAULT 0,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.agent_runs(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
workflow text NOT NULL,
idempotency_key text NOT NULL,
status text NOT NULL,
started_at timestamptz NOT NULL DEFAULT now(),
finished_at timestamptz,
next_run_at timestamptz,
error text NOT NULL DEFAULT ''::text,
usage jsonb NOT NULL DEFAULT '{}'::jsonb,
delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
source text NOT NULL DEFAULT 'agent'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.audit_events(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
actor text NOT NULL,
action text NOT NULL,
entity_type text NOT NULL,
entity_id uuid,
detail jsonb NOT NULL DEFAULT '{}'::jsonb,
source text NOT NULL DEFAULT 'system'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.career_preferences(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
target_roles text[] NOT NULL DEFAULT '{}'::text[],
locations text[] NOT NULL DEFAULT '{}'::text[],
work_types text[] NOT NULL DEFAULT '{}'::text[],
min_salary text NOT NULL DEFAULT ''::text,
avoid_companies text[] NOT NULL DEFAULT '{}'::text[],
focus_skills text[] NOT NULL DEFAULT '{}'::text[],
briefing_time text NOT NULL DEFAULT '07:00'::text,
timezone text NOT NULL DEFAULT 'Asia/Kolkata'::text,
agent_paused bool NOT NULL DEFAULT false,
paused_workflows text[] NOT NULL DEFAULT '{}'::text[],
notes text NOT NULL DEFAULT ''::text,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
study_minutes int4 NOT NULL DEFAULT 45,
research_sources text[] NOT NULL DEFAULT '{}'::text[]);
CREATE TABLE public.companies(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
name text NOT NULL,
website text NOT NULL DEFAULT ''::text,
industry text NOT NULL DEFAULT ''::text,
notes text NOT NULL DEFAULT ''::text,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz,
status text NOT NULL DEFAULT 'tracking'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.contacts(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
name text NOT NULL,
company text NOT NULL DEFAULT ''::text,
role text NOT NULL DEFAULT ''::text,
linkedin_url text NOT NULL DEFAULT ''::text,
email text NOT NULL DEFAULT ''::text,
location text NOT NULL DEFAULT ''::text,
relationship_stage text NOT NULL DEFAULT 'New'::text,
topics text[] NOT NULL DEFAULT '{}'::text[],
notes text NOT NULL DEFAULT ''::text,
date_connected date,
last_interaction date,
next_followup date,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.curriculum_prerequisites(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
topic_id uuid NOT NULL,
prerequisite_topic_id uuid NOT NULL,
basis text NOT NULL DEFAULT 'sequence_inferred'::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.curriculum_sources(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
url text NOT NULL,
document_id text NOT NULL,
title text NOT NULL DEFAULT ''::text,
status text NOT NULL DEFAULT 'never_synced'::text,
active_version_id uuid,
last_checked_at timestamptz,
last_synced_at timestamptz,
last_error text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.curriculum_topics(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
source_id uuid NOT NULL,
stable_topic_id text NOT NULL,
volume text NOT NULL,
volume_title text NOT NULL DEFAULT ''::text,
title text NOT NULL,
description text NOT NULL DEFAULT ''::text,
parent_topic_id uuid,
priority text NOT NULL DEFAULT 'SHOULD'::text,
priority_source text NOT NULL DEFAULT 'inferred'::text,
sequence int4 NOT NULL DEFAULT 0,
recommended_minutes int4 NOT NULL DEFAULT 90,
practical_exercise text NOT NULL DEFAULT ''::text,
completion_criteria text NOT NULL DEFAULT ''::text,
interview_notes text NOT NULL DEFAULT ''::text,
body text NOT NULL DEFAULT ''::text,
source_reference text NOT NULL DEFAULT ''::text,
content_hash text NOT NULL DEFAULT ''::text,
first_version_id uuid,
last_version_id uuid,
skill_id uuid,
skill_topic_id uuid,
removed_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.curriculum_versions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
source_id uuid NOT NULL,
content_hash text NOT NULL,
status text NOT NULL,
applied bool NOT NULL DEFAULT false,
topic_count int4 NOT NULL DEFAULT 0,
report jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.daily_logs(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
log_date date NOT NULL,
journal text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.events(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
organizer text NOT NULL DEFAULT ''::text,
starts_at timestamptz,
location text NOT NULL DEFAULT ''::text,
url text NOT NULL DEFAULT ''::text,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz,
summary text NOT NULL DEFAULT ''::text,
status text NOT NULL DEFAULT 'suggested'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.evidence(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
kind text NOT NULL,
url text NOT NULL DEFAULT ''::text,
description text NOT NULL DEFAULT ''::text,
skill_id uuid,
project_id uuid,
goal_id uuid,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.feedback(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
target_type text NOT NULL,
target_id uuid,
action text NOT NULL,
note text NOT NULL DEFAULT ''::text,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.focus_sessions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
task_id uuid NOT NULL,
started_at timestamptz NOT NULL,
ended_at timestamptz,
duration_minutes int4 NOT NULL DEFAULT 0,
note text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.followups(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
contact_id uuid NOT NULL,
due_date date NOT NULL,
completed_at timestamptz,
note text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.goals(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
description text NOT NULL DEFAULT ''::text,
goal_type text NOT NULL DEFAULT 'quarter'::text,
parent_goal_id uuid,
target_date date,
status text NOT NULL DEFAULT 'active'::text,
reason text NOT NULL DEFAULT ''::text,
success_criteria text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.inbox_items(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
content text NOT NULL,
kind text NOT NULL DEFAULT 'unprocessed'::text,
archived bool NOT NULL DEFAULT false,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.interview_practice(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
question_id uuid NOT NULL,
practiced_at timestamptz NOT NULL DEFAULT now(),
confidence int2 NOT NULL DEFAULT 0,
notes text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
answer text NOT NULL DEFAULT ''::text,
weaknesses text NOT NULL DEFAULT ''::text,
recommendation_id uuid);
CREATE TABLE public.interview_questions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
question text NOT NULL,
answer text NOT NULL DEFAULT ''::text,
category text NOT NULL DEFAULT 'Technical'::text,
difficulty text NOT NULL DEFAULT 'Medium'::text,
status text NOT NULL DEFAULT 'New'::text,
confidence int2 NOT NULL DEFAULT 0,
skill_id uuid,
last_practiced date,
practice_count int4 NOT NULL DEFAULT 0,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
recommendation_id uuid);
CREATE TABLE public.interview_stories(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
situation text NOT NULL DEFAULT ''::text,
task text NOT NULL DEFAULT ''::text,
action text NOT NULL DEFAULT ''::text,
result text NOT NULL DEFAULT ''::text,
lessons text NOT NULL DEFAULT ''::text,
project_id uuid,
tags text[] NOT NULL DEFAULT '{}'::text[],
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.job_applications(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
company text NOT NULL,
role text NOT NULL,
location text NOT NULL DEFAULT ''::text,
work_type text NOT NULL DEFAULT ''::text,
job_url text NOT NULL DEFAULT ''::text,
job_description text NOT NULL DEFAULT ''::text,
salary_range text NOT NULL DEFAULT ''::text,
date_found date,
date_applied date,
status text NOT NULL DEFAULT 'Saved'::text,
recruiter text NOT NULL DEFAULT ''::text,
recruiter_linkedin text NOT NULL DEFAULT ''::text,
resume_version text NOT NULL DEFAULT ''::text,
notes text NOT NULL DEFAULT ''::text,
followup_date date,
priority text NOT NULL DEFAULT 'medium'::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.job_interviews(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
application_id uuid NOT NULL,
stage text NOT NULL,
scheduled_at timestamptz,
notes text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.job_leads(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
company_id uuid,
company text NOT NULL,
title text NOT NULL,
location text NOT NULL DEFAULT ''::text,
work_type text NOT NULL DEFAULT ''::text,
salary_range text NOT NULL DEFAULT ''::text,
official_url text NOT NULL,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz,
posted_at timestamptz,
summary text NOT NULL DEFAULT ''::text,
fit_notes text NOT NULL DEFAULT ''::text,
fit_is_inference bool NOT NULL DEFAULT true,
application_id uuid,
status text NOT NULL DEFAULT 'new'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'agent'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.job_skill_requirements(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
application_id uuid NOT NULL,
skill_name text NOT NULL,
requirement_type text NOT NULL DEFAULT 'required'::text,
skill_id uuid,
assessment text NOT NULL DEFAULT 'Unknown'::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.learning_assignments(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
topic_id uuid NOT NULL,
task_id uuid,
assignment_date date NOT NULL,
status text NOT NULL DEFAULT 'planned'::text,
help_requested bool NOT NULL DEFAULT false,
planned_minutes int4 NOT NULL DEFAULT 0,
recorded_minutes int4 NOT NULL DEFAULT 0,
plan jsonb NOT NULL DEFAULT '[]'::jsonb,
rationale text NOT NULL DEFAULT ''::text,
practical_outcome text NOT NULL DEFAULT ''::text,
completion_criteria text NOT NULL DEFAULT ''::text,
progress_notes text NOT NULL DEFAULT ''::text,
is_inference bool NOT NULL DEFAULT true,
source text NOT NULL DEFAULT 'app'::text,
idempotency_key text NOT NULL,
completed_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
request_payload jsonb);
CREATE TABLE public.learning_baselines(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
topic_id uuid NOT NULL,
level text NOT NULL,
basis text NOT NULL DEFAULT 'manual'::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.learning_feedback(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
assignment_id uuid NOT NULL,
kind text NOT NULL,
channel text NOT NULL,
raw_text text NOT NULL DEFAULT ''::text,
minutes int4,
notes text NOT NULL DEFAULT ''::text,
new_date date,
idempotency_key text NOT NULL,
result jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
request_payload jsonb);
CREATE TABLE public.learning_preferences(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
guide_url text NOT NULL DEFAULT ''::text,
sync_time text NOT NULL DEFAULT '10:30'::text,
morning_time text NOT NULL DEFAULT '11:00'::text,
evening_time text NOT NULL DEFAULT '20:30'::text,
timezone text NOT NULL DEFAULT 'Asia/Kolkata'::text,
daily_minutes int4 NOT NULL DEFAULT 90,
weekly_minutes int4 NOT NULL DEFAULT 600,
paused bool NOT NULL DEFAULT false,
baseline_completed_at timestamptz,
hermes_last_seen_at timestamptz,
telegram_status text NOT NULL DEFAULT 'unknown'::text,
telegram_status_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.learning_sessions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
skill_id uuid,
task_id uuid,
minutes int4 NOT NULL,
learned text NOT NULL DEFAULT ''::text,
occurred_at timestamptz NOT NULL DEFAULT now(),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
focus_session_id uuid);
CREATE TABLE public.milestones(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
goal_id uuid NOT NULL,
title text NOT NULL,
due_date date,
status text NOT NULL DEFAULT 'pending'::text,
success_criteria text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.mock_interviews(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
occurred_at timestamptz NOT NULL DEFAULT now(),
feedback text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.network_interactions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
contact_id uuid NOT NULL,
kind text NOT NULL,
occurred_at timestamptz NOT NULL DEFAULT now(),
notes text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.notes(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
content text NOT NULL DEFAULT ''::text,
entity_type text,
entity_id uuid,
source_url text NOT NULL DEFAULT ''::text,
tags text[] NOT NULL DEFAULT '{}'::text[],
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.notifications(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
body text NOT NULL DEFAULT ''::text,
read_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.outreach(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
contact_id uuid,
recipient text NOT NULL DEFAULT ''::text,
channel text NOT NULL DEFAULT 'linkedin'::text,
subject text NOT NULL DEFAULT ''::text,
draft text NOT NULL DEFAULT ''::text,
reason text NOT NULL DEFAULT ''::text,
status text NOT NULL DEFAULT 'draft'::text,
is_inference bool NOT NULL DEFAULT true,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
sent_at timestamptz,
response_received_at timestamptz,
response_notes text NOT NULL DEFAULT ''::text,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz);
CREATE TABLE public.planner_blocks(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
task_id uuid,
title text NOT NULL,
block_date date NOT NULL,
start_time time NOT NULL,
end_time time NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.profiles(
id uuid NOT NULL PRIMARY KEY,
display_name text NOT NULL DEFAULT ''::text,
career_target text NOT NULL DEFAULT ''::text,
weekly_hours int4 NOT NULL DEFAULT 10,
onboarded_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.project_decisions(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
project_id uuid NOT NULL,
title text NOT NULL,
context text NOT NULL DEFAULT ''::text,
decision text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.project_milestones(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
project_id uuid NOT NULL,
title text NOT NULL,
due_date date,
completed_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.project_tasks(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
project_id uuid NOT NULL,
title text NOT NULL,
kind text NOT NULL DEFAULT 'task'::text,
detail text NOT NULL DEFAULT ''::text,
evidence_url text NOT NULL DEFAULT ''::text,
due_date date,
status text NOT NULL DEFAULT 'todo'::text,
is_inference bool NOT NULL DEFAULT false,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.projects(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
name text NOT NULL,
description text NOT NULL DEFAULT ''::text,
problem text NOT NULL DEFAULT ''::text,
business_value text NOT NULL DEFAULT ''::text,
architecture text NOT NULL DEFAULT ''::text,
technologies text[] NOT NULL DEFAULT '{}'::text[],
github_url text NOT NULL DEFAULT ''::text,
deployment_url text NOT NULL DEFAULT ''::text,
status text NOT NULL DEFAULT 'Idea'::text,
start_date date,
target_date date,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.recommendations(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
kind text NOT NULL DEFAULT 'action'::text,
title text NOT NULL,
body text NOT NULL DEFAULT ''::text,
priority int2 NOT NULL DEFAULT 50,
briefing_date date,
is_inference bool NOT NULL DEFAULT true,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz,
status text NOT NULL DEFAULT 'new'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'agent'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
document_id uuid);
CREATE TABLE public.resources(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
url text NOT NULL DEFAULT ''::text,
source_type text NOT NULL DEFAULT 'URL'::text,
skill_id uuid,
project_id uuid,
status text NOT NULL DEFAULT 'Inbox'::text,
priority text NOT NULL DEFAULT 'medium'::text,
notes text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.scheduler_runs(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
job text NOT NULL,
run_date date NOT NULL,
status text NOT NULL DEFAULT 'claimed'::text,
catch_up bool NOT NULL DEFAULT false,
detail jsonb NOT NULL DEFAULT '{}'::jsonb,
started_at timestamptz NOT NULL DEFAULT now(),
finished_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
lease_until timestamptz,
attempt int4 NOT NULL DEFAULT 1,
attempt_token uuid);
CREATE TABLE public.skill_topics(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
skill_id uuid NOT NULL,
parent_topic_id uuid,
title text NOT NULL,
status text NOT NULL DEFAULT 'Not Started'::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.skills(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
name text NOT NULL,
status text NOT NULL DEFAULT 'Not Started'::text,
category text NOT NULL DEFAULT ''::text,
knowledge int2 NOT NULL DEFAULT 0,
hands_on int2 NOT NULL DEFAULT 0,
project_proof int2 NOT NULL DEFAULT 0,
production int2 NOT NULL DEFAULT 0,
interview int2 NOT NULL DEFAULT 0,
last_activity date,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.source_documents(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
kind text NOT NULL DEFAULT 'other'::text,
url text NOT NULL DEFAULT ''::text,
storage_path text NOT NULL DEFAULT ''::text,
summary text NOT NULL DEFAULT ''::text,
status text NOT NULL DEFAULT 'new'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
agent_summary text NOT NULL DEFAULT ''::text,
processed_at timestamptz);
CREATE TABLE public.study_history(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
study_task_id uuid,
skill_id uuid,
minutes int4 NOT NULL DEFAULT 0,
notes text NOT NULL DEFAULT ''::text,
occurred_at timestamptz NOT NULL DEFAULT now(),
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.study_tasks(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
detail text NOT NULL DEFAULT ''::text,
skill_id uuid,
resource_url text NOT NULL DEFAULT ''::text,
estimated_minutes int4 NOT NULL DEFAULT 30,
due_date date,
priority text NOT NULL DEFAULT 'medium'::text,
status text NOT NULL DEFAULT 'queued'::text,
is_inference bool NOT NULL DEFAULT false,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'user'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
consolidated_task_id uuid);
CREATE TABLE public.task_dependencies(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
task_id uuid NOT NULL,
depends_on_id uuid NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.task_subtasks(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
task_id uuid NOT NULL,
title text NOT NULL,
completed_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
CREATE TABLE public.tasks(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
title text NOT NULL,
description text NOT NULL DEFAULT ''::text,
type text NOT NULL DEFAULT 'Learn'::text,
status text NOT NULL DEFAULT 'backlog'::text,
priority text NOT NULL DEFAULT 'medium'::text,
estimated_minutes int4 NOT NULL DEFAULT 0,
actual_minutes int4 NOT NULL DEFAULT 0,
due_date date,
scheduled_date date,
scheduled_start time,
scheduled_end time,
skill_id uuid,
project_id uuid,
goal_id uuid,
milestone_id uuid,
application_id uuid,
contact_id uuid,
completed_at timestamptz,
sort_order int4 NOT NULL DEFAULT 0,
tags text[] NOT NULL DEFAULT '{}'::text[],
recurrence text,
evidence_required bool NOT NULL DEFAULT false,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
skill_topic_id uuid);
CREATE TABLE public.telegram_message_map(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
assignment_id uuid,
kind text NOT NULL,
direction text NOT NULL,
chat_ref text NOT NULL DEFAULT ''::text,
message_id text NOT NULL DEFAULT ''::text,
delivery_status text NOT NULL,
error text NOT NULL DEFAULT ''::text,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz,
idempotency_key text,
reply_to_message_id text NOT NULL DEFAULT ''::text,
reservation_token uuid,
reserved_at timestamptz,
finished_at timestamptz,
reconciled bool NOT NULL DEFAULT false);
CREATE TABLE public.uncertain_claims(
id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
user_id uuid NOT NULL,
claim text NOT NULL,
context text NOT NULL DEFAULT ''::text,
source_url text NOT NULL DEFAULT ''::text,
verified_at timestamptz,
confidence int2 NOT NULL DEFAULT 50,
document_id uuid,
status text NOT NULL DEFAULT 'open'::text,
dedupe_key text,
run_id uuid,
source text NOT NULL DEFAULT 'agent'::text,
provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
deleted_at timestamptz);
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_command_check CHECK ((command = ANY (ARRAY['run_now'::text, 'pause'::text, 'resume'::text, 'refresh_preferences'::text, 'reprocess_document'::text, 'ping_learning_manager'::text, 'send_test_telegram'::text])));
ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_source_check CHECK ((source = 'user'::text));
ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'claimed'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])));
ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'telegram'::text, 'other'::text])));
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text])));
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_source_check CHECK ((source = 'agent'::text));
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_owner ADD CONSTRAINT agent_owner_singleton_check CHECK (singleton);
ALTER TABLE public.agent_owner ADD CONSTRAINT agent_owner_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_idempotency_key_check CHECK (((length(idempotency_key) >= 8) AND (length(idempotency_key) <= 200)));
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_source_check CHECK ((source = 'agent'::text));
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text])));
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_workflow_check CHECK (((length(workflow) >= 1) AND (length(workflow) <= 80)));
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_actor_check CHECK ((actor = ANY (ARRAY['user'::text, 'agent'::text, 'system'::text])));
ALTER TABLE public.audit_events ADD CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.career_preferences ADD CONSTRAINT career_preferences_briefing_time_check CHECK ((briefing_time ~ '^[0-2][0-9]:[0-5][0-9]$'::text));
ALTER TABLE public.career_preferences ADD CONSTRAINT career_preferences_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text])));
ALTER TABLE public.career_preferences ADD CONSTRAINT career_preferences_study_minutes_check CHECK (((study_minutes >= 30) AND (study_minutes <= 60)));
ALTER TABLE public.career_preferences ADD CONSTRAINT career_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.companies ADD CONSTRAINT companies_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 200)));
ALTER TABLE public.companies ADD CONSTRAINT companies_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.companies ADD CONSTRAINT companies_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.companies ADD CONSTRAINT companies_status_check CHECK ((status = ANY (ARRAY['tracking'::text, 'target'::text, 'avoid'::text, 'archived'::text])));
ALTER TABLE public.companies ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_relationship_stage_check CHECK ((relationship_stage = ANY (ARRAY['New'::text, 'Connected'::text, 'Conversation Started'::text, 'Active'::text, 'Warm'::text, 'Recruiter'::text, 'Mentor'::text, 'Archived'::text])));
ALTER TABLE public.contacts ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_prerequisites ADD CONSTRAINT curriculum_prerequisites_basis_check CHECK ((basis = ANY (ARRAY['sequence_inferred'::text, 'guide_explicit'::text, 'manual'::text])));
ALTER TABLE public.curriculum_prerequisites ADD CONSTRAINT curriculum_prerequisites_check CHECK ((topic_id <> prerequisite_topic_id));
ALTER TABLE public.curriculum_prerequisites ADD CONSTRAINT curriculum_prerequisites_prerequisite_topic_id_fkey FOREIGN KEY (prerequisite_topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_prerequisites ADD CONSTRAINT curriculum_prerequisites_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_sources ADD CONSTRAINT curriculum_sources_active_fk FOREIGN KEY (active_version_id) REFERENCES curriculum_versions(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_sources ADD CONSTRAINT curriculum_sources_status_check CHECK ((status = ANY (ARRAY['never_synced'::text, 'ok'::text, 'incomplete'::text, 'failed'::text])));
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_first_version_id_fkey FOREIGN KEY (first_version_id) REFERENCES curriculum_versions(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_last_version_id_fkey FOREIGN KEY (last_version_id) REFERENCES curriculum_versions(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_parent_topic_id_fkey FOREIGN KEY (parent_topic_id) REFERENCES curriculum_topics(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_priority_check CHECK ((priority = ANY (ARRAY['MUST'::text, 'SHOULD'::text, 'OPTIONAL'::text])));
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_priority_source_check CHECK ((priority_source = ANY (ARRAY['guide_label'::text, 'inferred'::text])));
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_recommended_minutes_check CHECK (((recommended_minutes >= 15) AND (recommended_minutes <= 600)));
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_skill_topic_id_fkey FOREIGN KEY (skill_topic_id) REFERENCES skill_topics(id) ON DELETE SET NULL;
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_source_id_fkey FOREIGN KEY (source_id) REFERENCES curriculum_sources(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_versions ADD CONSTRAINT curriculum_versions_source_id_fkey FOREIGN KEY (source_id) REFERENCES curriculum_sources(id) ON DELETE CASCADE;
ALTER TABLE public.curriculum_versions ADD CONSTRAINT curriculum_versions_status_check CHECK ((status = ANY (ARRAY['validated'::text, 'incomplete'::text, 'failed'::text, 'unchanged'::text])));
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD CONSTRAINT events_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'saved'::text, 'registered_manually'::text, 'attended'::text, 'dismissed'::text])));
ALTER TABLE public.events ADD CONSTRAINT events_title_check CHECK (((length(title) >= 1) AND (length(title) <= 300)));
ALTER TABLE public.events ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.evidence ADD CONSTRAINT evidence_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE public.evidence ADD CONSTRAINT evidence_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public.evidence ADD CONSTRAINT evidence_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.evidence ADD CONSTRAINT evidence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_action_check CHECK ((action = ANY (ARRAY['done'::text, 'save'::text, 'dismiss'::text, 'useful'::text, 'not_useful'::text, 'note'::text])));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_source_check CHECK ((source = 'user'::text));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_target_type_check CHECK ((target_type = ANY (ARRAY['recommendation'::text, 'job_lead'::text, 'study_task'::text, 'project_task'::text, 'outreach'::text, 'event'::text, 'uncertain_claim'::text, 'source_document'::text, 'notification'::text, 'general'::text])));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.focus_sessions ADD CONSTRAINT focus_sessions_duration_minutes_check CHECK ((duration_minutes >= 0));
ALTER TABLE public.focus_sessions ADD CONSTRAINT focus_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE public.focus_sessions ADD CONSTRAINT focus_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.followups ADD CONSTRAINT followups_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE public.followups ADD CONSTRAINT followups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT goals_goal_type_check CHECK ((goal_type = ANY (ARRAY['career'::text, 'quarter'::text, 'monthly'::text])));
ALTER TABLE public.goals ADD CONSTRAINT goals_parent_goal_id_fkey FOREIGN KEY (parent_goal_id) REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD CONSTRAINT goals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text])));
ALTER TABLE public.goals ADD CONSTRAINT goals_title_check CHECK ((length(TRIM(BOTH FROM title)) > 1));
ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.inbox_items ADD CONSTRAINT inbox_items_kind_check CHECK ((kind = ANY (ARRAY['unprocessed'::text, 'task'::text, 'note'::text, 'resource'::text, 'idea'::text])));
ALTER TABLE public.inbox_items ADD CONSTRAINT inbox_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_answer_len CHECK (((length(answer) <= 20000) AND (length(weaknesses) <= 5000)));
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_confidence_check CHECK (((confidence >= 0) AND (confidence <= 4)));
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_question_id_fkey FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE;
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL;
ALTER TABLE public.interview_practice ADD CONSTRAINT interview_practice_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_confidence_check CHECK (((confidence >= 0) AND (confidence <= 4)));
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_difficulty_check CHECK ((difficulty = ANY (ARRAY['Easy'::text, 'Medium'::text, 'Hard'::text])));
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_practice_count_check CHECK ((practice_count >= 0));
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL;
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_status_check CHECK ((status = ANY (ARRAY['New'::text, 'Learning'::text, 'Practiced'::text, 'Strong'::text])));
ALTER TABLE public.interview_questions ADD CONSTRAINT interview_questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.interview_stories ADD CONSTRAINT interview_stories_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public.interview_stories ADD CONSTRAINT interview_stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check CHECK ((status = ANY (ARRAY['Saved'::text, 'Planning to Apply'::text, 'Applied'::text, 'Recruiter Contact'::text, 'Screening'::text, 'Technical Interview'::text, 'Hiring Manager'::text, 'Final Round'::text, 'Offer'::text, 'Rejected'::text, 'Withdrawn'::text])));
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_interviews ADD CONSTRAINT job_interviews_application_id_fkey FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE;
ALTER TABLE public.job_interviews ADD CONSTRAINT job_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_application_id_fkey FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE SET NULL;
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_company_check CHECK (((length(TRIM(BOTH FROM company)) >= 1) AND (length(TRIM(BOTH FROM company)) <= 200)));
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_official_url_check CHECK ((official_url ~ '^https?://'::text));
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'verified'::text, 'saved'::text, 'applied'::text, 'dismissed'::text, 'expired'::text])));
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 300)));
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_verified_requires_proof CHECK (((status <> 'verified'::text) OR (verified_at IS NOT NULL)));
ALTER TABLE public.job_skill_requirements ADD CONSTRAINT job_skill_requirements_application_id_fkey FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE;
ALTER TABLE public.job_skill_requirements ADD CONSTRAINT job_skill_requirements_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.job_skill_requirements ADD CONSTRAINT job_skill_requirements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_planned_minutes_check CHECK (((planned_minutes >= 0) AND (planned_minutes <= 600)));
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_recorded_minutes_check CHECK ((recorded_minutes >= 0));
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_source_check CHECK ((source = ANY (ARRAY['app'::text, 'agent'::text])));
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'delivered'::text, 'completed'::text, 'partial'::text, 'not_started'::text, 'rescheduled'::text, 'cancelled'::text])));
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE RESTRICT;
ALTER TABLE public.learning_baselines ADD CONSTRAINT learning_baselines_basis_check CHECK ((basis = ANY (ARRAY['manual'::text, 'evidence'::text])));
ALTER TABLE public.learning_baselines ADD CONSTRAINT learning_baselines_level_check CHECK ((level = ANY (ARRAY['Not Started'::text, 'Familiar'::text, 'Learning'::text, 'Practiced'::text, 'Applied'::text])));
ALTER TABLE public.learning_baselines ADD CONSTRAINT learning_baselines_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE;
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES learning_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_channel_check CHECK ((channel = ANY (ARRAY['app'::text, 'telegram'::text, 'agent'::text])));
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_kind_check CHECK ((kind = ANY (ARRAY['completed'::text, 'partial'::text, 'not_started'::text, 'reschedule'::text, 'help'::text, 'minutes'::text])));
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_minutes_check CHECK (((minutes >= 0) AND (minutes <= 600)));
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_notes_check CHECK ((char_length(notes) <= 4000));
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_raw_text_check CHECK ((char_length(raw_text) <= 4000));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_daily_minutes_check CHECK (((daily_minutes >= 15) AND (daily_minutes <= 480)));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_evening_time_check CHECK ((evening_time ~ '^[0-2][0-9]:[0-5][0-9]$'::text));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_morning_time_check CHECK ((morning_time ~ '^[0-2][0-9]:[0-5][0-9]$'::text));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_sync_time_check CHECK ((sync_time ~ '^[0-2][0-9]:[0-5][0-9]$'::text));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_telegram_status_check CHECK ((telegram_status = ANY (ARRAY['unknown'::text, 'sent_ok'::text, 'send_failed'::text, 'reply_ok'::text])));
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_weekly_minutes_check CHECK (((weekly_minutes >= 0) AND (weekly_minutes <= 3360)));
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_focus_session_id_fkey FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_minutes_check CHECK ((minutes > 0));
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE public.learning_sessions ADD CONSTRAINT learning_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])));
ALTER TABLE public.milestones ADD CONSTRAINT milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.mock_interviews ADD CONSTRAINT mock_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.network_interactions ADD CONSTRAINT network_interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE public.network_interactions ADD CONSTRAINT network_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.outreach ADD CONSTRAINT outreach_channel_check CHECK ((channel = ANY (ARRAY['linkedin'::text, 'email'::text, 'other'::text])));
ALTER TABLE public.outreach ADD CONSTRAINT outreach_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE public.outreach ADD CONSTRAINT outreach_response_notes_len CHECK ((length(response_notes) <= 5000));
ALTER TABLE public.outreach ADD CONSTRAINT outreach_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.outreach ADD CONSTRAINT outreach_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.outreach ADD CONSTRAINT outreach_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'sent_manually'::text, 'responded'::text, 'saved'::text, 'dismissed'::text])));
ALTER TABLE public.outreach ADD CONSTRAINT outreach_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.planner_blocks ADD CONSTRAINT planner_blocks_check CHECK ((end_time > start_time));
ALTER TABLE public.planner_blocks ADD CONSTRAINT planner_blocks_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE public.planner_blocks ADD CONSTRAINT planner_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_weekly_hours_check CHECK (((weekly_hours >= 0) AND (weekly_hours <= 168)));
ALTER TABLE public.project_decisions ADD CONSTRAINT project_decisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_decisions ADD CONSTRAINT project_decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.project_milestones ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_milestones ADD CONSTRAINT project_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_kind_check CHECK ((kind = ANY (ARRAY['milestone'::text, 'task'::text, 'evidence'::text])));
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'doing'::text, 'done'::text, 'saved'::text, 'dismissed'::text])));
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_title_check CHECK (((length(title) >= 1) AND (length(title) <= 300)));
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['Idea'::text, 'Planning'::text, 'Building'::text, 'Testing'::text, 'Deployed'::text, 'Archived'::text])));
ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_document_id_fkey FOREIGN KEY (document_id) REFERENCES source_documents(id) ON DELETE SET NULL;
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_kind_check CHECK ((kind = ANY (ARRAY['top_priority'::text, 'briefing'::text, 'action'::text, 'insight'::text, 'interview'::text])));
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_priority_check CHECK (((priority >= 0) AND (priority <= 100)));
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_status_check CHECK ((status = ANY (ARRAY['new'::text, 'done'::text, 'saved'::text, 'dismissed'::text])));
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_title_check CHECK (((length(title) >= 1) AND (length(title) <= 300)));
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.resources ADD CONSTRAINT resources_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.resources ADD CONSTRAINT resources_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public.resources ADD CONSTRAINT resources_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.resources ADD CONSTRAINT resources_status_check CHECK ((status = ANY (ARRAY['Inbox'::text, 'To Review'::text, 'Learning'::text, 'Completed'::text, 'Archived'::text])));
ALTER TABLE public.resources ADD CONSTRAINT resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.scheduler_runs ADD CONSTRAINT scheduler_runs_job_check CHECK ((job = ANY (ARRAY['curriculum_sync'::text, 'morning_plan'::text, 'evening_check'::text])));
ALTER TABLE public.scheduler_runs ADD CONSTRAINT scheduler_runs_status_check CHECK ((status = ANY (ARRAY['claimed'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text])));
ALTER TABLE public.skill_topics ADD CONSTRAINT skill_topics_parent_topic_id_fkey FOREIGN KEY (parent_topic_id) REFERENCES skill_topics(id) ON DELETE SET NULL;
ALTER TABLE public.skill_topics ADD CONSTRAINT skill_topics_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;
ALTER TABLE public.skill_topics ADD CONSTRAINT skill_topics_status_check CHECK ((status = ANY (ARRAY['Not Started'::text, 'Learning'::text, 'Practicing'::text, 'Applied'::text, 'Interview Ready'::text])));
ALTER TABLE public.skill_topics ADD CONSTRAINT skill_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.skills ADD CONSTRAINT skills_hands_on_check CHECK (((hands_on >= 0) AND (hands_on <= 4)));
ALTER TABLE public.skills ADD CONSTRAINT skills_interview_check CHECK (((interview >= 0) AND (interview <= 4)));
ALTER TABLE public.skills ADD CONSTRAINT skills_knowledge_check CHECK (((knowledge >= 0) AND (knowledge <= 4)));
ALTER TABLE public.skills ADD CONSTRAINT skills_production_check CHECK (((production >= 0) AND (production <= 4)));
ALTER TABLE public.skills ADD CONSTRAINT skills_project_proof_check CHECK (((project_proof >= 0) AND (project_proof <= 4)));
ALTER TABLE public.skills ADD CONSTRAINT skills_status_check CHECK ((status = ANY (ARRAY['Not Started'::text, 'Learning'::text, 'Practicing'::text, 'Applied'::text, 'Interview Ready'::text])));
ALTER TABLE public.skills ADD CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_kind_check CHECK ((kind = ANY (ARRAY['resume'::text, 'job_description'::text, 'certificate'::text, 'article'::text, 'note'::text, 'transcript'::text, 'other'::text])));
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_status_check CHECK ((status = ANY (ARRAY['new'::text, 'pending'::text, 'processing'::text, 'processed'::text, 'action_needed'::text, 'failed'::text, 'archived'::text])));
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_title_check CHECK (((length(title) >= 1) AND (length(title) <= 300)));
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.study_history ADD CONSTRAINT study_history_minutes_check CHECK (((minutes >= 0) AND (minutes <= 1440)));
ALTER TABLE public.study_history ADD CONSTRAINT study_history_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.study_history ADD CONSTRAINT study_history_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.study_history ADD CONSTRAINT study_history_study_task_id_fkey FOREIGN KEY (study_task_id) REFERENCES study_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.study_history ADD CONSTRAINT study_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_consolidated_task_id_fkey FOREIGN KEY (consolidated_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_estimated_minutes_check CHECK (((estimated_minutes >= 0) AND (estimated_minutes <= 1440)));
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'in_progress'::text, 'done'::text, 'saved'::text, 'dismissed'::text])));
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_title_check CHECK (((length(title) >= 1) AND (length(title) <= 300)));
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_check CHECK ((task_id <> depends_on_id));
ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_depends_on_id_fkey FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.task_subtasks ADD CONSTRAINT task_subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_subtasks ADD CONSTRAINT task_subtasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_actual_minutes_check CHECK ((actual_minutes >= 0));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_application_id_fkey FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_estimated_minutes_check CHECK ((estimated_minutes >= 0));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_skill_topic_id_fkey FOREIGN KEY (skill_topic_id) REFERENCES skill_topics(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['backlog'::text, 'month'::text, 'week'::text, 'today'::text, 'doing'::text, 'completed'::text])));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_title_check CHECK ((length(TRIM(BOTH FROM title)) > 1));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check CHECK ((type = ANY (ARRAY['Learn'::text, 'Build'::text, 'Practice'::text, 'Interview'::text, 'Network'::text, 'Apply'::text, 'Research'::text, 'Document'::text, 'Admin'::text])));
ALTER TABLE public.agent_commands ADD CONSTRAINT agent_commands_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
ALTER TABLE public.agent_notifications ADD CONSTRAINT agent_notifications_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.agent_owner ADD CONSTRAINT agent_owner_user_id_key UNIQUE (user_id);
ALTER TABLE public.agent_rate_limits ADD CONSTRAINT agent_rate_limits_pkey PRIMARY KEY (bucket, window_start);
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
ALTER TABLE public.career_preferences ADD CONSTRAINT career_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE public.companies ADD CONSTRAINT companies_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.curriculum_prerequisites ADD CONSTRAINT curriculum_prerequisites_topic_id_prerequisite_topic_id_key UNIQUE (topic_id, prerequisite_topic_id);
ALTER TABLE public.curriculum_sources ADD CONSTRAINT curriculum_sources_user_id_document_id_key UNIQUE (user_id, document_id);
ALTER TABLE public.curriculum_topics ADD CONSTRAINT curriculum_topics_user_id_source_id_stable_topic_id_key UNIQUE (user_id, source_id, stable_topic_id);
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_id_log_date_key UNIQUE (user_id, log_date);
ALTER TABLE public.events ADD CONSTRAINT events_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.job_leads ADD CONSTRAINT job_leads_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
ALTER TABLE public.learning_baselines ADD CONSTRAINT learning_baselines_user_id_topic_id_key UNIQUE (user_id, topic_id);
ALTER TABLE public.learning_feedback ADD CONSTRAINT learning_feedback_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
ALTER TABLE public.learning_preferences ADD CONSTRAINT learning_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE public.outreach ADD CONSTRAINT outreach_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.scheduler_runs ADD CONSTRAINT scheduler_runs_user_id_job_run_date_key UNIQUE (user_id, job, run_date);
ALTER TABLE public.skills ADD CONSTRAINT skills_user_id_name_key UNIQUE (user_id, name);
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.study_tasks ADD CONSTRAINT study_tasks_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_task_id_depends_on_id_key UNIQUE (task_id, depends_on_id);
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.telegram_message_map ADD CONSTRAINT telegram_message_map_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES learning_assignments(id) ON DELETE SET NULL;
ALTER TABLE public.telegram_message_map ADD CONSTRAINT telegram_message_map_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'unknown'::text, 'received'::text])));
ALTER TABLE public.telegram_message_map ADD CONSTRAINT telegram_message_map_direction_check CHECK ((direction = ANY (ARRAY['outbound'::text, 'inbound'::text])));
ALTER TABLE public.telegram_message_map ADD CONSTRAINT telegram_message_map_kind_check CHECK ((kind = ANY (ARRAY['morning_plan'::text, 'evening_check'::text, 'test'::text, 'reply'::text, 'help'::text])));
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_claim_check CHECK (((length(claim) >= 1) AND (length(claim) <= 2000)));
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100)));
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_document_id_fkey FOREIGN KEY (document_id) REFERENCES source_documents(id) ON DELETE SET NULL;
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_run_id_fkey FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_source_check CHECK ((source = ANY (ARRAY['user'::text, 'agent'::text, 'import'::text])));
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_status_check CHECK ((status = ANY (ARRAY['open'::text, 'confirmed'::text, 'rejected'::text, 'dismissed'::text])));
ALTER TABLE public.uncertain_claims ADD CONSTRAINT uncertain_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
