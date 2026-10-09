create or replace function public.learning_import_curriculum(p_user_id uuid,p_source jsonb,p_topics jsonb,p_report jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare
  src public.curriculum_sources; active public.curriculum_versions; ver_id uuid; item jsonb;
  previous public.curriculum_topics; v_topic_id uuid; v_skill_id uuid; v_skill_topic_id uuid; skill_name text;
  added jsonb:='[]'; edited jsonb:='[]'; removed jsonb:='[]'; made_skills jsonb:='[]';
  applied boolean; complete boolean:=coalesce((p_report->>'complete')::boolean,false); ids uuid[]:='{}';
  outcome text; changes jsonb;
begin
  perform public.learning_assert_user(p_user_id);
  if jsonb_typeof(p_topics)<>'array' or jsonb_array_length(p_topics) not between 1 and 2000 then raise exception 'invalid_curriculum'; end if;
  if (select count(distinct value->>'stable_topic_id') from jsonb_array_elements(p_topics))<>jsonb_array_length(p_topics) then raise exception 'duplicate_topic'; end if;
  insert into public.curriculum_sources(user_id,url,document_id) values(p_user_id,p_source->>'url',p_source->>'document_id') on conflict(user_id,document_id) do nothing;
  select * into src from public.curriculum_sources where user_id=p_user_id and document_id=p_source->>'document_id' for update;
  select * into active from public.curriculum_versions where id=src.active_version_id and user_id=p_user_id;
  if active.content_hash=p_report->>'content_hash' then
    update public.curriculum_sources set last_checked_at=now() where id=src.id;
    return jsonb_build_object('outcome','unchanged','report',p_report,'changes',null);
  end if;
  applied:=complete or src.active_version_id is null;
  insert into public.curriculum_versions(user_id,source_id,content_hash,status,applied,topic_count,report)
    values(p_user_id,src.id,p_report->>'content_hash',case when complete then 'validated' else 'incomplete' end,false,jsonb_array_length(p_topics),p_report) returning id into ver_id;
  if not applied then
    update public.curriculum_sources set last_checked_at=now(),last_error='incomplete_import_kept_previous' where id=src.id;
    return jsonb_build_object('outcome','incomplete_kept_previous','report',p_report,'changes',null);
  end if;
  for item in select value from jsonb_array_elements(p_topics) loop
    skill_name:=item->>'skill_name';
    select id into v_skill_id from public.skills where user_id=p_user_id and deleted_at is null and (lower(name)=lower(skill_name) or lower(name) in (select lower(value) from jsonb_array_elements_text(coalesce(item->'skill_aliases','[]')))) order by created_at limit 1;
    if not found then
      insert into public.skills(user_id,name,category) values(p_user_id,skill_name,'Curriculum') returning id into v_skill_id;
      made_skills:=made_skills||jsonb_build_array(skill_name);
    end if;
    select * into previous from public.curriculum_topics where user_id=p_user_id and source_id=src.id and stable_topic_id=item->>'stable_topic_id';
    v_skill_topic_id:=previous.skill_topic_id;
    if v_skill_topic_id is null then
      select id into v_skill_topic_id from public.skill_topics where user_id=p_user_id and skill_id=v_skill_id and title in (item->>'title',(item->>'stable_topic_id')||' '||(item->>'title')) and deleted_at is null order by created_at limit 1;
      if not found then insert into public.skill_topics(user_id,skill_id,title) values(p_user_id,v_skill_id,(item->>'stable_topic_id')||' '||(item->>'title')) returning id into v_skill_topic_id; end if;
    end if;
    insert into public.curriculum_topics(user_id,source_id,stable_topic_id,volume,volume_title,title,description,priority,priority_source,sequence,recommended_minutes,practical_exercise,completion_criteria,interview_notes,body,source_reference,content_hash,first_version_id,last_version_id,skill_id,skill_topic_id)
      values(p_user_id,src.id,item->>'stable_topic_id',item->>'volume',item->>'volume_title',item->>'title',coalesce(item->>'description',''),item->>'priority',item->>'priority_source',(item->>'sequence')::integer,(item->>'recommended_minutes')::integer,coalesce(item->>'practical_exercise',''),coalesce(item->>'completion_criteria',''),coalesce(item->>'interview_notes',''),item->>'body',item->>'source_reference',item->>'content_hash',ver_id,ver_id,v_skill_id,v_skill_topic_id)
      on conflict(user_id,source_id,stable_topic_id) do update set volume=excluded.volume,volume_title=excluded.volume_title,title=excluded.title,description=excluded.description,priority=excluded.priority,priority_source=excluded.priority_source,sequence=excluded.sequence,recommended_minutes=excluded.recommended_minutes,practical_exercise=excluded.practical_exercise,completion_criteria=excluded.completion_criteria,interview_notes=excluded.interview_notes,body=excluded.body,source_reference=excluded.source_reference,content_hash=excluded.content_hash,last_version_id=ver_id,removed_at=null
      returning id into v_topic_id;
    ids:=array_append(ids,v_topic_id);
    if previous.id is null then added:=added||jsonb_build_array(item->>'stable_topic_id'); elsif previous.content_hash<>item->>'content_hash' then edited:=edited||jsonb_build_array(item->>'stable_topic_id'); end if;
    -- Reuse actual linked task completion as evidence, never promote every chapter of an Applied skill.
    if exists(select 1 from public.tasks where user_id=p_user_id and skill_topic_id=v_skill_topic_id and status='completed' and deleted_at is null) then
      insert into public.learning_baselines(user_id,topic_id,level,basis) values(p_user_id,v_topic_id,'Practiced','evidence') on conflict(user_id,topic_id) do nothing;
    end if;
  end loop;
  if complete then
    select coalesce(jsonb_agg(stable_topic_id),'[]') into removed from public.curriculum_topics where user_id=p_user_id and source_id=src.id and not(id=any(ids)) and removed_at is null;
    update public.curriculum_topics set removed_at=now() where user_id=p_user_id and source_id=src.id and not(id=any(ids)) and removed_at is null;
  end if;
  delete from public.curriculum_prerequisites where user_id=p_user_id and basis='sequence_inferred' and topic_id=any(ids);
  for item in select value from jsonb_array_elements(p_topics) loop
    select id into v_topic_id from public.curriculum_topics where user_id=p_user_id and source_id=src.id and stable_topic_id=item->>'stable_topic_id';
    insert into public.curriculum_prerequisites(user_id,topic_id,prerequisite_topic_id,basis)
      select p_user_id,v_topic_id,t.id,'sequence_inferred' from public.curriculum_topics t where t.user_id=p_user_id and t.source_id=src.id and t.stable_topic_id in (select value from jsonb_array_elements_text(item->'prerequisites'))
      on conflict(topic_id,prerequisite_topic_id) do nothing;
  end loop;
  changes:=jsonb_build_object('added',added,'edited',edited,'restored','[]'::jsonb,'removed',removed,'created_skills',made_skills);
  update public.curriculum_versions set applied=true,report=p_report||jsonb_build_object('changes',changes) where id=ver_id;
  update public.curriculum_sources set active_version_id=ver_id,status=case when complete then 'ok' else 'incomplete' end,title=p_report->>'title',url=p_source->>'url',last_checked_at=now(),last_synced_at=now(),last_error=case when complete then '' else 'guide_incomplete' end where id=src.id;
  outcome:=case when complete then 'applied' else 'applied_incomplete' end;
  return jsonb_build_object('outcome',outcome,'report',p_report,'changes',changes);
end $$;

create or replace function public.learning_claim_run(p_user_id uuid,p_job text,p_date date,p_attempt_token text,p_catch_up boolean default false) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare pref public.learning_preferences; prior public.scheduler_runs;
begin
  perform public.learning_assert_user(p_user_id);
  select * into pref from public.learning_preferences where user_id=p_user_id;
  if p_date<>(now() at time zone coalesce(pref.timezone,'Asia/Kolkata'))::date then raise exception 'stale_run_date'; end if;
  if pref.paused and p_job<>'curriculum_sync' then raise exception 'learning_paused'; end if;
  select * into prior from public.scheduler_runs where user_id=p_user_id and job=p_job and run_date=p_date for update;
  if found then
    if prior.status in ('succeeded','skipped') then return jsonb_build_object('claimed',false,'reason','already_finished'); end if;
    if prior.status='claimed' and prior.lease_until>now() then return jsonb_build_object('claimed',false,'reason','lease_active'); end if;
    if prior.attempt>=3 then return jsonb_build_object('claimed',false,'reason','retry_limit'); end if;
    -- Delivery receipts are authoritative. Never send again solely because a worker died.
    if p_job in ('morning_plan','evening_check') and exists(select 1 from public.telegram_message_map m join public.learning_assignments a on a.id=m.assignment_id where m.user_id=p_user_id and m.kind=p_job and m.direction='outbound' and m.delivery_status='sent' and a.assignment_date=p_date and m.deleted_at is null) then
      update public.scheduler_runs set status='succeeded',finished_at=now() where id=prior.id;
      return jsonb_build_object('claimed',false,'reason','delivery_already_recorded');
    end if;
    update public.scheduler_runs set status='claimed',attempt=attempt+1,started_at=now(),finished_at=null,lease_until=now()+interval '15 minutes',detail=jsonb_build_object('attempt_token',p_attempt_token) where id=prior.id;
  else
    insert into public.scheduler_runs(user_id,job,run_date,catch_up,lease_until,detail) values(p_user_id,p_job,p_date,p_catch_up,now()+interval '15 minutes',jsonb_build_object('attempt_token',p_attempt_token));
  end if;
  return jsonb_build_object('claimed',true,'attempt_token',p_attempt_token);
end $$;

create or replace function public.learning_finish_run(p_user_id uuid,p_job text,p_date date,p_attempt_token text,p_status text,p_detail jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path=public as $$
begin
  perform public.learning_assert_user(p_user_id);
  if p_status not in ('succeeded','failed','skipped') then raise exception 'invalid_run_status'; end if;
  update public.scheduler_runs set status=p_status,finished_at=now(),lease_until=null,detail=p_detail||jsonb_build_object('attempt_token',p_attempt_token) where user_id=p_user_id and job=p_job and run_date=p_date and status='claimed' and detail->>'attempt_token'=p_attempt_token;
  if not found then raise exception 'run_lease_lost'; end if;
  return jsonb_build_object('ok',true);
end $$;

revoke all on function public.learning_import_curriculum(uuid,jsonb,jsonb,jsonb),public.learning_claim_run(uuid,text,date,text,boolean),public.learning_finish_run(uuid,text,date,text,text,jsonb) from public;
grant execute on function public.learning_import_curriculum(uuid,jsonb,jsonb,jsonb),public.learning_claim_run(uuid,text,date,text,boolean),public.learning_finish_run(uuid,text,date,text,text,jsonb) to authenticated,service_role;

create or replace function public.learning_sync_failure(p_user_id uuid,p_document_id text,p_url text,p_error text) returns void
language plpgsql security invoker set search_path=public as $$
declare src public.curriculum_sources;
begin
  perform public.learning_assert_user(p_user_id);
  insert into public.curriculum_sources(user_id,url,document_id) values(p_user_id,p_url,p_document_id) on conflict(user_id,document_id) do nothing;
  select * into src from public.curriculum_sources where user_id=p_user_id and document_id=p_document_id for update;
  insert into public.curriculum_versions(user_id,source_id,content_hash,status,report) values(p_user_id,src.id,'','failed',jsonb_build_object('error',left(p_error,100)));
  update public.curriculum_sources set status=case when active_version_id is null then 'failed' else status end,last_checked_at=now(),last_error=left(p_error,100) where id=src.id;
end $$;
revoke all on function public.learning_sync_failure(uuid,text,text,text) from public;
grant execute on function public.learning_sync_failure(uuid,text,text,text) to authenticated,service_role;

-- TaskRow, the focus timer and Telegram all share the same completion event.
create or replace function public.learning_task_completed() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    update public.learning_assignments set status='completed',completed_at=coalesce(new.completed_at,now()) where user_id=new.user_id and task_id=new.id and status not in ('cancelled','rescheduled') and deleted_at is null;
    insert into public.learning_baselines(user_id,topic_id,level,basis)
      select new.user_id,id,'Practiced','evidence' from public.curriculum_topics where user_id=new.user_id and skill_topic_id=new.skill_topic_id and deleted_at is null
      on conflict(user_id,topic_id) do update set basis='evidence',level=case when learning_baselines.level='Applied' then 'Applied' else 'Practiced' end;
  end if;
  return new;
end $$;
create trigger learning_task_completion after update of status on public.tasks for each row execute function public.learning_task_completed();

-- Realtime is optional. Foreground refresh remains available if the publication is absent.
do $$ declare table_name text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach table_name in array array['tasks','focus_sessions','learning_sessions','learning_feedback','learning_assignments','skill_topics','learning_baselines','curriculum_sources'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
        execute format('alter publication supabase_realtime add table public.%I',table_name);
      end if;
    end loop;
  end if;
end $$;
