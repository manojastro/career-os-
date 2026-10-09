create table public.learning_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  guide_url text not null default '',
  sync_time text not null default '10:30' check (sync_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  morning_time text not null default '11:00' check (morning_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  evening_time text not null default '20:30' check (evening_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  daily_minutes integer not null default 90 check (daily_minutes between 15 and 480),
  weekly_minutes integer not null default 600 check (weekly_minutes between 0 and 3360),
  paused boolean not null default false,
  baseline_completed_at timestamptz,
  hermes_last_seen_at timestamptz,
  telegram_status text not null default 'unknown' check (telegram_status in ('unknown','sent_ok','send_failed','reply_ok')),
  telegram_status_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.curriculum_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  document_id text not null,
  title text not null default '',
  status text not null default 'never_synced' check (status in ('never_synced','ok','incomplete','failed')),
  active_version_id uuid,
  last_checked_at timestamptz, last_synced_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, document_id)
);

create table public.curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.curriculum_sources(id) on delete cascade,
  content_hash text not null,
  status text not null check (status in ('validated','incomplete','failed','unchanged')),
  applied boolean not null default false,
  topic_count integer not null default 0,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index curriculum_versions_source_idx on public.curriculum_versions (source_id, created_at desc);
alter table public.curriculum_sources add constraint curriculum_sources_active_fk foreign key (active_version_id) references public.curriculum_versions(id) on delete set null;

create table public.curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid not null references public.curriculum_sources(id) on delete cascade,
  stable_topic_id text not null,
  volume text not null,
  volume_title text not null default '',
  title text not null,
  description text not null default '',
  parent_topic_id uuid references public.curriculum_topics(id) on delete set null,
  priority text not null default 'SHOULD' check (priority in ('MUST','SHOULD','OPTIONAL')),
  priority_source text not null default 'inferred' check (priority_source in ('guide_label','inferred')),
  sequence integer not null default 0,
  recommended_minutes integer not null default 90 check (recommended_minutes between 15 and 600),
  practical_exercise text not null default '',
  completion_criteria text not null default '',
  interview_notes text not null default '',
  body text not null default '',
  source_reference text not null default '',
  content_hash text not null default '',
  first_version_id uuid references public.curriculum_versions(id) on delete set null,
  last_version_id uuid references public.curriculum_versions(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  skill_topic_id uuid references public.skill_topics(id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, source_id, stable_topic_id)
);

create table public.curriculum_prerequisites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  prerequisite_topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  basis text not null default 'sequence_inferred' check (basis in ('sequence_inferred','guide_explicit','manual')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (topic_id, prerequisite_topic_id), check (topic_id <> prerequisite_topic_id)
);

create table public.learning_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  level text not null check (level in ('Not Started','Familiar','Learning','Practiced','Applied')),
  basis text not null default 'manual' check (basis in ('manual','evidence')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, topic_id)
);

create table public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid not null references public.curriculum_topics(id) on delete restrict,
  task_id uuid references public.tasks(id) on delete set null,
  assignment_date date not null,
  status text not null default 'planned' check (status in ('planned','delivered','completed','partial','not_started','rescheduled','cancelled')),
  help_requested boolean not null default false,
  planned_minutes integer not null default 0 check (planned_minutes between 0 and 600),
  recorded_minutes integer not null default 0 check (recorded_minutes >= 0),
  plan jsonb not null default '[]'::jsonb,
  rationale text not null default '',
  practical_outcome text not null default '',
  completion_criteria text not null default '',
  progress_notes text not null default '',
  is_inference boolean not null default true,
  source text not null default 'app' check (source in ('app','agent')),
  idempotency_key text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, idempotency_key)
);
create unique index learning_assignments_one_per_day on public.learning_assignments (user_id, assignment_date) where status not in ('cancelled') and deleted_at is null;

create table public.learning_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  assignment_id uuid not null references public.learning_assignments(id) on delete cascade,
  kind text not null check (kind in ('completed','partial','not_started','reschedule','help','minutes')),
  channel text not null check (channel in ('app','telegram','agent')),
  raw_text text not null default '' check (char_length(raw_text) <= 4000),
  minutes integer check (minutes between 0 and 600),
  notes text not null default '' check (char_length(notes) <= 4000),
  new_date date,
  idempotency_key text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create table public.telegram_message_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  assignment_id uuid references public.learning_assignments(id) on delete set null,
  kind text not null check (kind in ('morning_plan','evening_check','test','reply','help')),
  direction text not null check (direction in ('outbound','inbound')),
  chat_ref text not null default '',
  message_id text not null default '',
  delivery_status text not null check (delivery_status in ('sent','failed','received')),
  error text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index telegram_message_map_unique on public.telegram_message_map (user_id, chat_ref, message_id, direction) where message_id <> '';

create table public.scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job text not null check (job in ('curriculum_sync','morning_plan','evening_check')),
  run_date date not null,
  status text not null default 'claimed' check (status in ('claimed','succeeded','failed','skipped')),
  catch_up boolean not null default false,
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(), finished_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (user_id, job, run_date)
);

alter table public.tasks add column if not exists skill_topic_id uuid references public.skill_topics(id) on delete set null;
alter table public.study_tasks add column if not exists consolidated_task_id uuid references public.tasks(id) on delete set null;

do $$ declare t text; begin
  foreach t in array array['learning_preferences','curriculum_sources','curriculum_versions','curriculum_topics','curriculum_prerequisites','learning_baselines','learning_assignments','learning_feedback','telegram_message_map','scheduler_runs'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner manages rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create index %I on public.%I (user_id, updated_at desc)', t || '_user_updated_idx', t);
  end loop;
end $$;

do $$ declare r record; begin
  for r in select * from (values
    ('tasks','skill_topic_id','skill_topics'), ('study_tasks','consolidated_task_id','tasks'),
    ('curriculum_versions','source_id','curriculum_sources'),
    ('curriculum_topics','source_id','curriculum_sources'), ('curriculum_topics','skill_id','skills'),
    ('curriculum_topics','skill_topic_id','skill_topics'), ('curriculum_topics','parent_topic_id','curriculum_topics'),
    ('curriculum_prerequisites','topic_id','curriculum_topics'), ('curriculum_prerequisites','prerequisite_topic_id','curriculum_topics'),
    ('learning_baselines','topic_id','curriculum_topics'),
    ('learning_assignments','topic_id','curriculum_topics'), ('learning_assignments','task_id','tasks'),
    ('learning_feedback','assignment_id','learning_assignments'), ('telegram_message_map','assignment_id','learning_assignments')
  ) as v(table_name, column_name, reference_table) loop
    execute format('create trigger %I before insert or update of %I on public.%I for each row execute function public.require_owned_link(%L,%L)',
      r.table_name || '_' || r.column_name || '_owner', r.column_name, r.table_name, r.column_name, r.reference_table);
  end loop;
end $$;

-- Non-destructive consolidation: open study_tasks get a linked Learn task; originals are kept.
do $$ declare s record; new_id uuid; begin
  for s in select * from public.study_tasks where consolidated_task_id is null and deleted_at is null and status in ('todo','doing','saved') loop
    insert into public.tasks (user_id, title, description, type, status, priority, estimated_minutes, due_date, skill_id, tags)
    values (s.user_id, s.title, s.detail, 'Learn', 'backlog', coalesce(nullif(s.priority,''),'medium'), s.estimated_minutes, s.due_date, s.skill_id, array['study-task'])
    returning id into new_id;
    update public.study_tasks set consolidated_task_id = new_id where id = s.id;
  end loop;
end $$;
