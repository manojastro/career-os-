create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  career_target text not null default '',
  weekly_hours integer not null default 10 check (weekly_hours between 0 and 168),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 1), description text not null default '',
  goal_type text not null default 'quarter' check (goal_type in ('career','quarter','monthly')),
  parent_goal_id uuid references public.goals(id) on delete set null,
  target_date date, status text not null default 'active' check (status in ('active','completed','paused')),
  reason text not null default '', success_criteria text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.skills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, status text not null default 'Not Started' check (status in ('Not Started','Learning','Practicing','Applied','Interview Ready')),
  category text not null default '', knowledge smallint not null default 0 check (knowledge between 0 and 4),
  hands_on smallint not null default 0 check (hands_on between 0 and 4), project_proof smallint not null default 0 check (project_proof between 0 and 4),
  production smallint not null default 0 check (production between 0 and 4), interview smallint not null default 0 check (interview between 0 and 4),
  last_activity date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, name)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, description text not null default '', problem text not null default '', business_value text not null default '',
  architecture text not null default '', technologies text[] not null default '{}', github_url text not null default '', deployment_url text not null default '',
  status text not null default 'Idea' check (status in ('Idea','Planning','Building','Testing','Deployed','Archived')),
  start_date date, target_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, company text not null default '', role text not null default '', linkedin_url text not null default '',
  email text not null default '', location text not null default '', relationship_stage text not null default 'New'
    check (relationship_stage in ('New','Connected','Conversation Started','Active','Warm','Recruiter','Mentor','Archived')),
  topics text[] not null default '{}', notes text not null default '', date_connected date, last_interaction date, next_followup date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.job_applications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  company text not null, role text not null, location text not null default '', work_type text not null default '', job_url text not null default '',
  job_description text not null default '', salary_range text not null default '', date_found date, date_applied date,
  status text not null default 'Saved' check (status in ('Saved','Planning to Apply','Applied','Recruiter Contact','Screening','Technical Interview','Hiring Manager','Final Round','Offer','Rejected','Withdrawn')),
  recruiter text not null default '', recruiter_linkedin text not null default '', resume_version text not null default '', notes text not null default '',
  followup_date date, priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.milestones (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade, title text not null, due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  success_criteria text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.skill_topics (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade, parent_topic_id uuid references public.skill_topics(id) on delete set null,
  title text not null, status text not null default 'Not Started' check (status in ('Not Started','Learning','Practicing','Applied','Interview Ready')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 1), description text not null default '',
  type text not null default 'Learn' check (type in ('Learn','Build','Practice','Interview','Network','Apply','Research','Document','Admin')),
  status text not null default 'backlog' check (status in ('backlog','month','week','today','doing','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0), actual_minutes integer not null default 0 check (actual_minutes >= 0),
  due_date date, scheduled_date date, scheduled_start time, scheduled_end time,
  skill_id uuid references public.skills(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null, milestone_id uuid references public.milestones(id) on delete set null,
  application_id uuid references public.job_applications(id) on delete set null, contact_id uuid references public.contacts(id) on delete set null,
  completed_at timestamptz, sort_order integer not null default 0, tags text[] not null default '{}', recurrence text,
  evidence_required boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.planner_blocks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null, title text not null, block_date date not null, start_time time not null, end_time time not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (end_time > start_time)
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade, started_at timestamptz not null, ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0), note text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.network_interactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade, kind text not null, occurred_at timestamptz not null default now(), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.interview_questions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  question text not null, answer text not null default '', category text not null default 'Technical',
  difficulty text not null default 'Medium' check (difficulty in ('Easy','Medium','Hard')),
  status text not null default 'New' check (status in ('New','Learning','Practiced','Strong')),
  confidence smallint not null default 0 check (confidence between 0 and 4), skill_id uuid references public.skills(id) on delete set null,
  last_practiced date, practice_count integer not null default 0 check (practice_count >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.interview_practice (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade, practiced_at timestamptz not null default now(),
  confidence smallint not null default 0 check (confidence between 0 and 4), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, content text not null default '', entity_type text, entity_id uuid, source_url text not null default '', tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.resources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, url text not null default '', source_type text not null default 'URL',
  skill_id uuid references public.skills(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  status text not null default 'Inbox' check (status in ('Inbox','To Review','Learning','Completed','Archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high')), notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.evidence (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, kind text not null, url text not null default '', description text not null default '',
  skill_id uuid references public.skills(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  content text not null, kind text not null default 'unprocessed' check (kind in ('unprocessed','task','note','resource','idea')),
  archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.activity_log (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null, entity_id uuid not null, action text not null, summary text not null,
  occurred_at timestamptz not null default now(), metadata jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null, journal text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, log_date)
);

create table public.task_subtasks (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, task_id uuid not null references public.tasks(id) on delete cascade, title text not null, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.task_dependencies (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, task_id uuid not null references public.tasks(id) on delete cascade, depends_on_id uuid not null references public.tasks(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique (task_id,depends_on_id), check (task_id <> depends_on_id));
create table public.learning_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, skill_id uuid references public.skills(id) on delete set null, task_id uuid references public.tasks(id) on delete set null, minutes integer not null check (minutes > 0), learned text not null default '', occurred_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.project_milestones (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, project_id uuid not null references public.projects(id) on delete cascade, title text not null, due_date date, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.project_decisions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, project_id uuid not null references public.projects(id) on delete cascade, title text not null, context text not null default '', decision text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.followups (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, contact_id uuid not null references public.contacts(id) on delete cascade, due_date date not null, completed_at timestamptz, note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.mock_interviews (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, occurred_at timestamptz not null default now(), feedback text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.interview_stories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, situation text not null default '', task text not null default '', action text not null default '', result text not null default '', lessons text not null default '', project_id uuid references public.projects(id) on delete set null, tags text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.job_interviews (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, application_id uuid not null references public.job_applications(id) on delete cascade, stage text not null, scheduled_at timestamptz, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.job_skill_requirements (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, application_id uuid not null references public.job_applications(id) on delete cascade, skill_name text not null, requirement_type text not null default 'required', skill_id uuid references public.skills(id) on delete set null, assessment text not null default 'Unknown', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text not null, body text not null default '', read_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','goals','skills','projects','contacts','job_applications','milestones','skill_topics','tasks','planner_blocks','focus_sessions','network_interactions','interview_questions','interview_practice','notes','resources','evidence','inbox_items','activity_log','daily_logs','task_subtasks','task_dependencies','learning_sessions','project_milestones','project_decisions','followups','mock_interviews','interview_stories','job_interviews','job_skill_requirements','notifications'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['goals','skills','projects','contacts','job_applications','milestones','skill_topics','tasks','planner_blocks','focus_sessions','network_interactions','interview_questions','interview_practice','notes','resources','evidence','inbox_items','activity_log','daily_logs','task_subtasks','task_dependencies','learning_sessions','project_milestones','project_decisions','followups','mock_interviews','interview_stories','job_interviews','job_skill_requirements','notifications'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name || '_owner', table_name);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create index tasks_user_schedule on public.tasks(user_id, scheduled_date, status) where deleted_at is null;
create index tasks_user_due on public.tasks(user_id, due_date) where deleted_at is null;
create index tasks_user_links on public.tasks(user_id, goal_id, project_id, skill_id) where deleted_at is null;
create index blocks_user_date on public.planner_blocks(user_id, block_date) where deleted_at is null;
create index focus_user_start on public.focus_sessions(user_id, started_at desc) where deleted_at is null;
create index activity_user_time on public.activity_log(user_id, occurred_at desc) where deleted_at is null;
create index contacts_user_followup on public.contacts(user_id, next_followup) where deleted_at is null;
create index applications_user_status on public.job_applications(user_id, status) where deleted_at is null;
create index notes_user_updated on public.notes(user_id, updated_at desc) where deleted_at is null;

create or replace function public.require_owned_link() returns trigger language plpgsql set search_path = public as $$
declare reference_id uuid; owned boolean;
begin
  reference_id := nullif(to_jsonb(new)->>tg_argv[0], '')::uuid;
  if reference_id is null then return new; end if;
  execute format('select exists (select 1 from public.%I where id = $1 and user_id = $2 and deleted_at is null)', tg_argv[1])
    into owned using reference_id, new.user_id;
  if not owned then raise exception 'Referenced record must belong to the current user.' using errcode = '23503'; end if;
  return new;
end $$;

do $$ declare relation record; begin
  for relation in select * from (values
    ('goals','parent_goal_id','goals'),
    ('milestones','goal_id','goals'),
    ('skill_topics','skill_id','skills'), ('skill_topics','parent_topic_id','skill_topics'),
    ('tasks','skill_id','skills'), ('tasks','project_id','projects'), ('tasks','goal_id','goals'),
    ('tasks','milestone_id','milestones'), ('tasks','application_id','job_applications'), ('tasks','contact_id','contacts'),
    ('planner_blocks','task_id','tasks'), ('focus_sessions','task_id','tasks'),
    ('network_interactions','contact_id','contacts'), ('interview_questions','skill_id','skills'),
    ('interview_practice','question_id','interview_questions'),
    ('resources','skill_id','skills'), ('resources','project_id','projects'),
    ('evidence','skill_id','skills'), ('evidence','project_id','projects'), ('evidence','goal_id','goals'),
    ('task_subtasks','task_id','tasks'), ('task_dependencies','task_id','tasks'), ('task_dependencies','depends_on_id','tasks'),
    ('learning_sessions','skill_id','skills'), ('learning_sessions','task_id','tasks'),
    ('project_milestones','project_id','projects'), ('project_decisions','project_id','projects'),
    ('followups','contact_id','contacts'), ('interview_stories','project_id','projects'),
    ('job_interviews','application_id','job_applications'), ('job_skill_requirements','application_id','job_applications'),
    ('job_skill_requirements','skill_id','skills')
  ) as links(table_name, column_name, reference_table) loop
    execute format('create trigger %I before insert or update of %I on public.%I for each row execute function public.require_owned_link(%L,%L)',
      relation.table_name || '_' || relation.column_name || '_owner', relation.column_name, relation.table_name,
      relation.column_name, relation.reference_table);
  end loop;
end $$;
