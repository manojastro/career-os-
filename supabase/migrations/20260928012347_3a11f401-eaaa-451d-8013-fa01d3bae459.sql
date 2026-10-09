
create table public.agent_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  bound_at timestamptz not null default now()
);
grant select on public.agent_owner to authenticated;
grant all on public.agent_owner to service_role;
alter table public.agent_owner enable row level security;
create policy "owner reads binding" on public.agent_owner for select to authenticated using (user_id = auth.uid());

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow text not null check (length(workflow) between 1 and 80),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  status text not null check (status in ('running','succeeded','failed','skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  next_run_at timestamptz,
  error text not null default '',
  usage jsonb not null default '{}',
  delivery jsonb not null default '{}',
  source text not null default 'agent' check (source in ('agent')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create table public.career_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  target_roles text[] not null default '{}',
  locations text[] not null default '{}',
  work_types text[] not null default '{}',
  min_salary text not null default '',
  avoid_companies text[] not null default '{}',
  focus_skills text[] not null default '{}',
  briefing_time text not null default '07:30' check (briefing_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  timezone text not null default 'Asia/Kolkata',
  agent_paused boolean not null default false,
  paused_workflows text[] not null default '{}',
  notes text not null default '',
  source text not null default 'user' check (source in ('user','agent')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  kind text not null default 'other' check (kind in ('resume','job_description','certificate','article','note','transcript','other')),
  url text not null default '',
  storage_path text not null default '',
  summary text not null default '',
  status text not null default 'new' check (status in ('new','processing','processed','action_needed','archived')),
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.uncertain_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null check (length(claim) between 1 and 2000),
  context text not null default '',
  source_url text not null default '',
  verified_at timestamptz,
  confidence smallint not null default 50 check (confidence between 0 and 100),
  document_id uuid references public.source_documents(id) on delete set null,
  status text not null default 'open' check (status in ('open','confirmed','rejected','dismissed')),
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'agent' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  detail text not null default '',
  skill_id uuid references public.skills(id) on delete set null,
  resource_url text not null default '',
  estimated_minutes integer not null default 30 check (estimated_minutes between 0 and 1440),
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'queued' check (status in ('queued','in_progress','done','saved','dismissed')),
  is_inference boolean not null default false,
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.study_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_task_id uuid references public.study_tasks(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  minutes integer not null default 0 check (minutes between 0 and 1440),
  notes text not null default '',
  occurred_at timestamptz not null default now(),
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  kind text not null default 'task' check (kind in ('milestone','task','evidence')),
  detail text not null default '',
  evidence_url text not null default '',
  due_date date,
  status text not null default 'todo' check (status in ('todo','doing','done','saved','dismissed')),
  is_inference boolean not null default false,
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  website text not null default '',
  industry text not null default '',
  notes text not null default '',
  source_url text not null default '',
  verified_at timestamptz,
  status text not null default 'tracking' check (status in ('tracking','target','avoid','archived')),
  dedupe_key text generated always as (lower(trim(name))) stored,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.job_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company text not null check (length(trim(company)) between 1 and 200),
  title text not null check (length(trim(title)) between 1 and 300),
  location text not null default '',
  work_type text not null default '',
  salary_range text not null default '',
  official_url text not null check (official_url ~ '^https?://'),
  source_url text not null default '',
  verified_at timestamptz,
  posted_at timestamptz,
  summary text not null default '',
  fit_notes text not null default '',
  fit_is_inference boolean not null default true,
  application_id uuid references public.job_applications(id) on delete set null,
  status text not null default 'new' check (status in ('new','verified','saved','applied','dismissed','expired')),
  dedupe_key text generated always as (md5(lower(trim(company)) || '|' || lower(trim(title)) || '|' || lower(trim(location)) || '|' || lower(trim(official_url)))) stored,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'agent' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key),
  constraint job_leads_verified_requires_proof check (status <> 'verified' or verified_at is not null)
);

create table public.outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  recipient text not null default '',
  channel text not null default 'linkedin' check (channel in ('linkedin','email','other')),
  subject text not null default '',
  draft text not null default '',
  reason text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','sent_manually','saved','dismissed')),
  is_inference boolean not null default true,
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  organizer text not null default '',
  starts_at timestamptz,
  location text not null default '',
  url text not null default '',
  source_url text not null default '',
  verified_at timestamptz,
  summary text not null default '',
  status text not null default 'suggested' check (status in ('suggested','saved','registered_manually','attended','dismissed')),
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'user' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'action' check (kind in ('top_priority','briefing','action','insight')),
  title text not null check (length(title) between 1 and 300),
  body text not null default '',
  priority smallint not null default 50 check (priority between 0 and 100),
  briefing_date date,
  is_inference boolean not null default true,
  source_url text not null default '',
  verified_at timestamptz,
  status text not null default 'new' check (status in ('new','done','saved','dismissed')),
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'agent' check (source in ('user','agent','import')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.agent_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  channel text not null default 'in_app' check (channel in ('in_app','email','telegram','other')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','delivered','failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  dedupe_key text,
  run_id uuid references public.agent_runs(id) on delete set null,
  source text not null default 'agent' check (source in ('agent')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, dedupe_key)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('recommendation','job_lead','study_task','project_task','outreach','event','uncertain_claim','source_document','notification','general')),
  target_id uuid,
  action text not null check (action in ('done','save','dismiss','useful','not_useful','note')),
  note text not null default '',
  source text not null default 'user' check (source in ('user')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.agent_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null check (command in ('run_now','pause','resume','refresh_preferences','reprocess_document')),
  workflow text not null default 'all',
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','claimed','completed','failed','cancelled')),
  idempotency_key text,
  claimed_at timestamptz,
  completed_at timestamptz,
  result jsonb not null default '{}',
  source text not null default 'user' check (source in ('user')),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text not null check (actor in ('user','agent','system')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}',
  source text not null default 'system',
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- grants, RLS, timestamps
do $$
declare t text;
begin
  foreach t in array array['agent_runs','career_preferences','source_documents','uncertain_claims','study_tasks','study_history','project_tasks','companies','job_leads','outreach','events','recommendations','agent_notifications','feedback','agent_commands','audit_events'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create index %I on public.%I (user_id, updated_at desc)', t || '_user_updated_idx', t);
  end loop;
  foreach t in array array['career_preferences','source_documents','uncertain_claims','study_tasks','study_history','project_tasks','companies','job_leads','outreach','events','recommendations','feedback'] loop
    execute format('create policy "owner manages rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

create policy "owner reads runs" on public.agent_runs for select to authenticated using (user_id = auth.uid());
create policy "owner reads audit" on public.audit_events for select to authenticated using (user_id = auth.uid());
create policy "owner reads notifications" on public.agent_notifications for select to authenticated using (user_id = auth.uid());
create policy "owner marks notifications" on public.agent_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner reads commands" on public.agent_commands for select to authenticated using (user_id = auth.uid());
create policy "owner queues commands" on public.agent_commands for insert to authenticated with check (user_id = auth.uid());
create policy "owner cancels commands" on public.agent_commands for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- related-row ownership
create trigger uncertain_claims_document_owner before insert or update on public.uncertain_claims for each row execute function public.require_owned_link('document_id','source_documents');
create trigger study_tasks_skill_owner before insert or update on public.study_tasks for each row execute function public.require_owned_link('skill_id','skills');
create trigger study_history_task_owner before insert or update on public.study_history for each row execute function public.require_owned_link('study_task_id','study_tasks');
create trigger study_history_skill_owner before insert or update on public.study_history for each row execute function public.require_owned_link('skill_id','skills');
create trigger project_tasks_project_owner before insert or update on public.project_tasks for each row execute function public.require_owned_link('project_id','projects');
create trigger job_leads_company_owner before insert or update on public.job_leads for each row execute function public.require_owned_link('company_id','companies');
create trigger job_leads_application_owner before insert or update on public.job_leads for each row execute function public.require_owned_link('application_id','job_applications');
create trigger outreach_contact_owner before insert or update on public.outreach for each row execute function public.require_owned_link('contact_id','contacts');

create or replace function public.require_owned_run() returns trigger language plpgsql set search_path = public as $$
begin
  if new.run_id is not null and not exists (select 1 from public.agent_runs where id = new.run_id and user_id = new.user_id) then
    raise exception 'Referenced run must belong to the same user.' using errcode = '23503';
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['source_documents','uncertain_claims','study_tasks','project_tasks','companies','job_leads','outreach','events','recommendations','agent_notifications'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.require_owned_run()', t || '_run_owner', t);
  end loop;
end $$;

-- command state machine
create or replace function public.agent_command_transition() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'queued' then raise exception 'Commands must start queued.' using errcode = '23514'; end if;
    new.claimed_at := null; new.completed_at := null; new.result := '{}';
    return new;
  end if;
  if new.user_id <> old.user_id or new.command <> old.command then raise exception 'Command identity is immutable.' using errcode = '23514'; end if;
  if old.status = new.status then return new; end if;
  if not ((old.status = 'queued' and new.status in ('claimed','cancelled'))
       or (old.status = 'claimed' and new.status in ('completed','failed','queued'))) then
    raise exception 'Invalid command transition % -> %', old.status, new.status using errcode = '23514';
  end if;
  if auth.uid() is not null and new.status <> 'cancelled' then
    raise exception 'Users may only cancel queued commands.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger agent_command_transition before insert or update on public.agent_commands for each row execute function public.agent_command_transition();

-- audit of user and agent writes
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old)->>'status' is not distinct from to_jsonb(new)->>'status' and tg_table_name not in ('career_preferences') then
    return new;
  end if;
  insert into public.audit_events (user_id, actor, action, entity_type, entity_id, detail)
  values (new.user_id, case when auth.uid() is null then 'agent' else 'user' end, lower(tg_op), tg_table_name, new.id,
          jsonb_build_object('status', to_jsonb(new)->>'status', 'previous_status', case when tg_op = 'UPDATE' then to_jsonb(old)->>'status' end));
  return new;
end $$;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['career_preferences','job_leads','outreach','events','recommendations','study_tasks','project_tasks','uncertain_claims','source_documents','agent_commands','feedback'] loop
    execute format('create trigger %I after insert or update on public.%I for each row execute function public.audit_row_change()', t || '_audit', t);
  end loop;
end $$;

-- owner bootstrap
create or replace function public.claim_agent_owner() returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ok boolean; current_owner uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select user_id into current_owner from public.agent_owner where singleton;
  if current_owner is not null then
    if current_owner = uid then return uid; end if;
    raise exception 'The agent is already linked to another account.' using errcode = '42501';
  end if;
  select exists (select 1 from auth.users where id = uid and lower(email) = 'manojkumar9080@gmail.com' and email_confirmed_at is not null) into ok;
  if not ok then raise exception 'Only the designated owner account can link the agent.' using errcode = '42501'; end if;
  insert into public.agent_owner (singleton, user_id) values (true, uid) on conflict (singleton) do nothing;
  insert into public.audit_events (user_id, actor, action, entity_type, detail) values (uid, 'user', 'bind', 'agent_owner', '{}');
  return uid;
end $$;
revoke execute on function public.claim_agent_owner() from public, anon;
grant execute on function public.claim_agent_owner() to authenticated;

-- ingestion (service role only, single transaction)
create or replace function public.agent_ingest(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  owner uuid; r jsonb := p->'run'; e jsonb; rid uuid; fresh boolean; cid uuid; n int;
  counts jsonb := '{}';
begin
  select user_id into owner from public.agent_owner where singleton;
  if owner is null then raise exception 'agent_owner_not_bound' using errcode = 'P0001'; end if;

  insert into public.agent_runs (user_id, workflow, idempotency_key, status, started_at, finished_at, next_run_at, error, usage, delivery, provenance)
  values (owner, r->>'workflow', r->>'idempotency_key', r->>'status', coalesce((r->>'started_at')::timestamptz, now()),
          (r->>'finished_at')::timestamptz, (r->>'next_run_at')::timestamptz, coalesce(r->>'error',''),
          coalesce(r->'usage','{}'), coalesce(r->'delivery','{}'), coalesce(r->'provenance','{}'))
  on conflict (user_id, idempotency_key) do update set
    status = excluded.status, finished_at = excluded.finished_at, next_run_at = excluded.next_run_at,
    error = excluded.error, usage = excluded.usage, delivery = excluded.delivery
  where public.agent_runs.workflow = excluded.workflow
  returning id, (xmax = 0) into rid, fresh;
  if rid is null then raise exception 'idempotency_key_conflict' using errcode = 'P0001'; end if;

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'companies','[]')) loop
    insert into public.companies (user_id, name, website, industry, notes, source_url, verified_at, run_id, source, provenance)
    values (owner, e->>'name', coalesce(e->>'website',''), coalesce(e->>'industry',''), coalesce(e->>'notes',''),
            coalesce(e->>'source_url',''), (e->>'verified_at')::timestamptz, rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set
      website = coalesce(nullif(excluded.website,''), public.companies.website),
      industry = coalesce(nullif(excluded.industry,''), public.companies.industry),
      source_url = coalesce(nullif(excluded.source_url,''), public.companies.source_url),
      verified_at = coalesce(excluded.verified_at, public.companies.verified_at), run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('companies', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'job_leads','[]')) loop
    insert into public.companies (user_id, name, run_id, source) values (owner, e->>'company', rid, 'agent')
    on conflict (user_id, dedupe_key) do update set updated_at = now() returning id into cid;
    insert into public.job_leads (user_id, company_id, company, title, location, work_type, salary_range, official_url, source_url,
      verified_at, posted_at, summary, fit_notes, fit_is_inference, status, run_id, source, provenance)
    values (owner, cid, e->>'company', e->>'title', coalesce(e->>'location',''), coalesce(e->>'work_type',''), coalesce(e->>'salary_range',''),
      e->>'official_url', coalesce(e->>'source_url',''), (e->>'verified_at')::timestamptz, (e->>'posted_at')::timestamptz,
      coalesce(e->>'summary',''), coalesce(e->>'fit_notes',''), coalesce((e->>'fit_is_inference')::boolean, true),
      coalesce(e->>'status','new'), rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set
      company_id = excluded.company_id, work_type = excluded.work_type, salary_range = excluded.salary_range,
      source_url = excluded.source_url, verified_at = coalesce(excluded.verified_at, public.job_leads.verified_at),
      posted_at = coalesce(excluded.posted_at, public.job_leads.posted_at), summary = excluded.summary,
      fit_notes = excluded.fit_notes, fit_is_inference = excluded.fit_is_inference, run_id = excluded.run_id,
      provenance = excluded.provenance,
      status = case when public.job_leads.status in ('new','verified') then excluded.status else public.job_leads.status end;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('job_leads', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'recommendations','[]')) loop
    insert into public.recommendations (user_id, kind, title, body, priority, briefing_date, is_inference, source_url, verified_at, dedupe_key, run_id, source, provenance)
    values (owner, coalesce(e->>'kind','action'), e->>'title', coalesce(e->>'body',''), coalesce((e->>'priority')::smallint, 50),
      (e->>'briefing_date')::date, coalesce((e->>'is_inference')::boolean, true), coalesce(e->>'source_url',''),
      (e->>'verified_at')::timestamptz, e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set kind = excluded.kind, title = excluded.title, body = excluded.body,
      priority = excluded.priority, briefing_date = excluded.briefing_date, is_inference = excluded.is_inference,
      source_url = excluded.source_url, verified_at = excluded.verified_at, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('recommendations', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'study_tasks','[]')) loop
    insert into public.study_tasks (user_id, title, detail, skill_id, resource_url, estimated_minutes, due_date, priority, is_inference, dedupe_key, run_id, source, provenance)
    values (owner, e->>'title', coalesce(e->>'detail',''), (e->>'skill_id')::uuid, coalesce(e->>'resource_url',''),
      coalesce((e->>'estimated_minutes')::int, 30), (e->>'due_date')::date, coalesce(e->>'priority','medium'),
      coalesce((e->>'is_inference')::boolean, false), e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set title = excluded.title, detail = excluded.detail, resource_url = excluded.resource_url,
      estimated_minutes = excluded.estimated_minutes, due_date = excluded.due_date, priority = excluded.priority, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('study_tasks', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'project_tasks','[]')) loop
    insert into public.project_tasks (user_id, project_id, title, kind, detail, evidence_url, due_date, is_inference, dedupe_key, run_id, source, provenance)
    values (owner, (e->>'project_id')::uuid, e->>'title', coalesce(e->>'kind','task'), coalesce(e->>'detail',''),
      coalesce(e->>'evidence_url',''), (e->>'due_date')::date, coalesce((e->>'is_inference')::boolean, true), e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set title = excluded.title, kind = excluded.kind, detail = excluded.detail,
      evidence_url = excluded.evidence_url, due_date = excluded.due_date, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('project_tasks', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'outreach','[]')) loop
    insert into public.outreach (user_id, contact_id, recipient, channel, subject, draft, reason, is_inference, dedupe_key, run_id, source, provenance)
    values (owner, (e->>'contact_id')::uuid, coalesce(e->>'recipient',''), coalesce(e->>'channel','linkedin'), coalesce(e->>'subject',''),
      e->>'draft', coalesce(e->>'reason',''), coalesce((e->>'is_inference')::boolean, true), e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set
      subject = case when public.outreach.status = 'draft' then excluded.subject else public.outreach.subject end,
      draft = case when public.outreach.status = 'draft' then excluded.draft else public.outreach.draft end,
      reason = excluded.reason, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('outreach', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'events','[]')) loop
    insert into public.events (user_id, title, organizer, starts_at, location, url, source_url, verified_at, summary, dedupe_key, run_id, source, provenance)
    values (owner, e->>'title', coalesce(e->>'organizer',''), (e->>'starts_at')::timestamptz, coalesce(e->>'location',''),
      coalesce(e->>'url',''), e->>'source_url', (e->>'verified_at')::timestamptz, coalesce(e->>'summary',''), e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set title = excluded.title, organizer = excluded.organizer, starts_at = excluded.starts_at,
      location = excluded.location, url = excluded.url, source_url = excluded.source_url, verified_at = excluded.verified_at,
      summary = excluded.summary, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('events', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'source_documents','[]')) loop
    insert into public.source_documents (user_id, title, kind, url, summary, status, dedupe_key, run_id, source, provenance)
    values (owner, e->>'title', coalesce(e->>'kind','other'), coalesce(e->>'url',''), coalesce(e->>'summary',''),
      coalesce(e->>'status','processed'), e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set title = excluded.title, summary = excluded.summary,
      status = case when public.source_documents.status = 'archived' then 'archived' else excluded.status end, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('source_documents', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'uncertain_claims','[]')) loop
    insert into public.uncertain_claims (user_id, claim, context, source_url, verified_at, confidence, document_id, dedupe_key, run_id, source, provenance)
    values (owner, e->>'claim', coalesce(e->>'context',''), coalesce(e->>'source_url',''), (e->>'verified_at')::timestamptz,
      coalesce((e->>'confidence')::smallint, 50), (e->>'document_id')::uuid, e->>'dedupe_key', rid, 'agent', coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set context = excluded.context, source_url = excluded.source_url,
      verified_at = excluded.verified_at, confidence = excluded.confidence, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('uncertain_claims', n);

  n := 0;
  for e in select * from jsonb_array_elements(coalesce(p->'notifications','[]')) loop
    insert into public.agent_notifications (user_id, title, body, channel, delivery_status, delivered_at, dedupe_key, run_id, provenance)
    values (owner, e->>'title', coalesce(e->>'body',''), coalesce(e->>'channel','in_app'), coalesce(e->>'delivery_status','pending'),
      (e->>'delivered_at')::timestamptz, e->>'dedupe_key', rid, coalesce(e->'provenance','{}'))
    on conflict (user_id, dedupe_key) do update set delivery_status = excluded.delivery_status,
      delivered_at = excluded.delivered_at, body = excluded.body, run_id = excluded.run_id;
    n := n + 1;
  end loop;
  counts := counts || jsonb_build_object('notifications', n);

  insert into public.audit_events (user_id, actor, action, entity_type, entity_id, detail)
  values (owner, 'agent', 'ingest', 'agent_runs', rid, jsonb_build_object('counts', counts, 'new_run', fresh));
  return jsonb_build_object('run_id', rid, 'new_run', fresh, 'counts', counts);
end $$;

create or replace function public.agent_poll(p_cursor timestamptz, p_limit int default 20) returns jsonb language plpgsql security definer set search_path = public as $$
declare owner uuid; ts timestamptz := now(); since timestamptz := coalesce(p_cursor, '-infinity'::timestamptz);
  cmds jsonb; fb jsonb; pref jsonb; ch jsonb;
begin
  select user_id into owner from public.agent_owner where singleton;
  if owner is null then raise exception 'agent_owner_not_bound' using errcode = 'P0001'; end if;
  with c as (
    select id from public.agent_commands where user_id = owner and status = 'queued'
    order by created_at limit greatest(1, least(coalesce(p_limit, 20), 100)) for update skip locked
  ), u as (
    update public.agent_commands a set status = 'claimed', claimed_at = ts from c where a.id = c.id
    returning a.id, a.command, a.workflow, a.payload, a.created_at, a.claimed_at
  )
  select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at), '[]') into cmds from u;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'target_type', target_type, 'target_id', target_id, 'action', action, 'note', note, 'created_at', created_at) order by created_at), '[]')
    into fb from public.feedback where user_id = owner and created_at > since and deleted_at is null;
  select to_jsonb(cp) - 'user_id' into pref from public.career_preferences cp where cp.user_id = owner and cp.updated_at > since;
  select coalesce(jsonb_agg(x order by x->>'updated_at'), '[]') into ch from (
    select jsonb_build_object('table','job_leads','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) x from public.job_leads where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','recommendations','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.recommendations where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','study_tasks','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.study_tasks where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','project_tasks','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.project_tasks where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','outreach','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.outreach where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','events','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.events where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','uncertain_claims','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at) from public.uncertain_claims where user_id = owner and updated_at > since
    union all select jsonb_build_object('table','source_documents','id',id,'dedupe_key',dedupe_key,'status',status,'updated_at',updated_at,'title',title,'kind',kind,'storage_path',storage_path) from public.source_documents where user_id = owner and updated_at > since
    limit 1000
  ) s;
  return jsonb_build_object('cursor', ts, 'commands', cmds, 'feedback', fb, 'preferences', pref, 'changes', ch);
end $$;

create or replace function public.agent_complete_command(p_id uuid, p_status text, p_result jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare owner uuid; done_id uuid;
begin
  if p_status not in ('completed','failed','queued') then raise exception 'invalid_status' using errcode = 'P0001'; end if;
  select user_id into owner from public.agent_owner where singleton;
  if owner is null then raise exception 'agent_owner_not_bound' using errcode = 'P0001'; end if;
  update public.agent_commands set status = p_status, result = coalesce(p_result, '{}'),
    completed_at = case when p_status = 'queued' then null else now() end,
    claimed_at = case when p_status = 'queued' then null else claimed_at end
  where id = p_id and user_id = owner and status = 'claimed' returning id into done_id;
  if done_id is null then raise exception 'command_not_claimed' using errcode = 'P0001'; end if;
  insert into public.audit_events (user_id, actor, action, entity_type, entity_id, detail)
  values (owner, 'agent', p_status, 'agent_commands', p_id, jsonb_build_object('result', p_result));
  return jsonb_build_object('id', done_id, 'status', p_status);
end $$;

revoke execute on function public.agent_ingest(jsonb) from public, anon, authenticated;
revoke execute on function public.agent_poll(timestamptz, int) from public, anon, authenticated;
revoke execute on function public.agent_complete_command(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.agent_ingest(jsonb) to service_role;
grant execute on function public.agent_poll(timestamptz, int) to service_role;
grant execute on function public.agent_complete_command(uuid, text, jsonb) to service_role;

