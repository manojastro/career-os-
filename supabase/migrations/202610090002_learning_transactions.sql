-- Serialize each learner's side effects; API retries and focus/Telegram races are transactional.
alter table public.learning_assignments add column request_payload jsonb;
alter table public.learning_feedback add column request_payload jsonb;
alter table public.learning_sessions add column focus_session_id uuid references public.focus_sessions(id);
create unique index learning_session_focus_unique on public.learning_sessions(focus_session_id) where focus_session_id is not null;
create trigger learning_session_focus_owner before insert or update of focus_session_id on public.learning_sessions
  for each row execute function public.require_owned_link('focus_session_id','focus_sessions');
alter table public.scheduler_runs add column lease_until timestamptz;
alter table public.scheduler_runs add column attempt integer not null default 1;

create or replace function public.learning_assert_user(p_user_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is distinct from p_user_id and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'learning_access_denied' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':learning',0));
end $$;

create or replace function public.learning_create_assignment(p_user_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  pref public.learning_preferences; topic public.curriculum_topics; prior public.learning_assignments;
  carry public.learning_assignments; created public.learning_assignments; task_id uuid;
  wanted_date date := (p_input->>'assignment_date')::date; total integer; goal_id uuid;
begin
  perform public.learning_assert_user(p_user_id);
  select * into prior from public.learning_assignments where user_id=p_user_id and idempotency_key=p_input->>'idempotency_key';
  if found then
    if prior.request_payload is not null and prior.request_payload <> p_input then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('assignment',to_jsonb(prior),'replayed',true);
  end if;
  select * into pref from public.learning_preferences where user_id=p_user_id and deleted_at is null for update;
  if not found or pref.baseline_completed_at is null then raise exception 'baseline_required'; end if;
  if pref.paused then raise exception 'learning_paused'; end if;
  if wanted_date <> (now() at time zone pref.timezone)::date then raise exception 'invalid_assignment_date'; end if;
  if exists(select 1 from public.learning_assignments where user_id=p_user_id and assignment_date=wanted_date and status <> 'cancelled' and deleted_at is null) then raise exception 'assignment_exists_for_date'; end if;
  select * into topic from public.curriculum_topics where id=(p_input->>'topic_id')::uuid and user_id=p_user_id and deleted_at is null and removed_at is null;
  if not found then raise exception 'topic_not_in_curriculum'; end if;
  if coalesce(length(trim(p_input->>'completion_criteria')),0)=0 then raise exception 'missing_completion_criteria'; end if;
  if jsonb_typeof(p_input->'plan') <> 'array' or jsonb_array_length(p_input->'plan') not between 1 and 8 then raise exception 'invalid_plan'; end if;
  select sum((item->>'minutes')::integer) into total from jsonb_array_elements(p_input->'plan') item;
  if total is null or total<1 or total>pref.daily_minutes or exists(select 1 from jsonb_array_elements(p_input->'plan') item where (item->>'minutes')::integer<1 or coalesce(length(trim(item->>'step')),0)=0) then raise exception 'invalid_plan'; end if;
  if total + coalesce((select sum(planned_minutes) from public.learning_assignments where user_id=p_user_id and assignment_date>=date_trunc('week',wanted_date::timestamp)::date and assignment_date<date_trunc('week',wanted_date::timestamp)::date+7 and status not in ('cancelled','rescheduled') and deleted_at is null),0)>pref.weekly_minutes then raise exception 'weekly_budget_exceeded'; end if;
  if exists(select 1 from public.learning_assignments a left join public.tasks t on t.id=a.task_id where a.user_id=p_user_id and a.topic_id=topic.id and (a.status='completed' or t.status='completed') and a.deleted_at is null)
    or exists(select 1 from public.learning_baselines where user_id=p_user_id and topic_id=topic.id and level in ('Practiced','Applied') and deleted_at is null) then raise exception 'topic_already_completed'; end if;
  if exists(select 1 from public.curriculum_prerequisites p where p.user_id=p_user_id and p.topic_id=topic.id and p.deleted_at is null
    and not exists(select 1 from public.learning_baselines b where b.user_id=p_user_id and b.topic_id=p.prerequisite_topic_id and b.level in ('Familiar','Practiced','Applied') and b.deleted_at is null)
    and not exists(select 1 from public.learning_assignments a join public.tasks t on t.id=a.task_id where a.user_id=p_user_id and a.topic_id=p.prerequisite_topic_id and (a.status='completed' or t.status='completed') and a.deleted_at is null)) then raise exception 'prerequisites_incomplete'; end if;
  select a.* into carry from public.learning_assignments a join public.tasks t on t.id=a.task_id
    where a.user_id=p_user_id and a.assignment_date<wanted_date and a.status in ('planned','delivered','partial','not_started') and a.deleted_at is null and t.deleted_at is null and t.status<>'completed'
    order by a.assignment_date desc limit 1;
  if found and carry.topic_id<>topic.id then raise exception 'carry_over_required'; end if;
  if carry.id is not null then
    task_id:=carry.task_id;
    update public.tasks set status='today',scheduled_date=wanted_date,due_date=wanted_date,estimated_minutes=total where id=task_id and user_id=p_user_id;
  else
    -- Only link a goal already associated with this skill's tasks; never choose an unrelated goal.
    select t.goal_id into goal_id from public.tasks t join public.goals g on g.id=t.goal_id where t.user_id=p_user_id and t.skill_id=topic.skill_id and g.user_id=p_user_id and g.status='active' and g.deleted_at is null and t.deleted_at is null order by t.updated_at desc limit 1;
    insert into public.tasks(user_id,title,description,type,status,priority,estimated_minutes,scheduled_date,due_date,skill_id,skill_topic_id,goal_id,tags,evidence_required)
      values(p_user_id,'Learn '||topic.stable_topic_id||': '||topic.title, 'Source: '||topic.source_reference||E'\nWhy today: '||coalesce(p_input->>'rationale','')||E'\nPlan: '||(p_input->'plan')::text||E'\nCompletion: '||(p_input->>'completion_criteria'),'Learn','today',case topic.priority when 'MUST' then 'high' when 'OPTIONAL' then 'low' else 'medium' end,total,wanted_date,wanted_date,topic.skill_id,topic.skill_topic_id,goal_id,array['learning-manager',lower(topic.priority)],true) returning id into task_id;
  end if;
  insert into public.learning_assignments(user_id,topic_id,task_id,assignment_date,planned_minutes,plan,rationale,practical_outcome,completion_criteria,source,idempotency_key,request_payload)
    values(p_user_id,topic.id,task_id,wanted_date,total,p_input->'plan',coalesce(p_input->>'rationale',''),coalesce(p_input->>'practical_outcome',topic.practical_exercise),p_input->>'completion_criteria',coalesce(p_input->>'source','agent'),p_input->>'idempotency_key',p_input) returning * into created;
  if carry.id is not null then update public.learning_assignments set status='rescheduled' where id=carry.id and user_id=p_user_id; end if;
  update public.skill_topics set status='Learning' where id=topic.skill_topic_id and user_id=p_user_id and status='Not Started';
  insert into public.activity_log(user_id,entity_type,entity_id,action,summary,metadata) values(p_user_id,'tasks',task_id,'learning_assignment','Assigned '||topic.title,jsonb_build_object('assignment_id',created.id));
  return jsonb_build_object('assignment',to_jsonb(created),'replayed',false);
end $$;

create or replace function public.learning_apply_feedback(p_user_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare
  a public.learning_assignments; t public.tasks; prior public.learning_feedback;
  topic public.curriculum_topics; pref public.learning_preferences; feedback_result jsonb; fb_id uuid; session_id uuid;
  kind text:=p_input->>'kind'; minutes integer:=nullif(p_input->>'minutes','')::integer;
  target date; mapped uuid; stamp timestamptz:=now(); notes text:=coalesce(p_input->>'notes','');
begin
  perform public.learning_assert_user(p_user_id);
  select * into prior from public.learning_feedback where user_id=p_user_id and idempotency_key=p_input->>'idempotency_key';
  if found then
    if prior.request_payload is not null and prior.request_payload<>p_input then raise exception 'idempotency_conflict'; end if;
    return prior.result||jsonb_build_object('replayed',true);
  end if;
  if kind not in ('completed','partial','not_started','reschedule','help','minutes') then raise exception 'needs_clarification'; end if;
  if minutes is not null and (minutes<1 or minutes>600) then raise exception 'invalid_minutes'; end if;
  if kind in ('not_started','help') and minutes is not null then raise exception 'unexpected_minutes'; end if;
  select * into pref from public.learning_preferences where user_id=p_user_id;
  if p_input->>'channel'='telegram' then
    select assignment_id into mapped from public.telegram_message_map where user_id=p_user_id and chat_ref=p_input->'telegram'->>'chat_ref' and message_id=p_input->'telegram'->>'reply_to_message_id' and direction='outbound' and delivery_status='sent' and deleted_at is null;
    if not found or mapped is null then raise exception 'telegram_reply_not_mapped'; end if;
    if p_input->>'assignment_id' is not null and (p_input->>'assignment_id')::uuid<>mapped then raise exception 'telegram_assignment_mismatch'; end if;
  else mapped:=nullif(p_input->>'assignment_id','')::uuid; end if;
  select * into a from public.learning_assignments where user_id=p_user_id and deleted_at is null and status<>'cancelled'
    and (case when mapped is not null then id=mapped else assignment_date=coalesce(nullif(p_input->>'date','')::date,(stamp at time zone coalesce(pref.timezone,'Asia/Kolkata'))::date) end) order by created_at desc limit 1 for update;
  if not found then raise exception 'assignment_not_found'; end if;
  select * into t from public.tasks where id=a.task_id and user_id=p_user_id and deleted_at is null for update;
  if not found then raise exception 'task_not_found'; end if;
  select * into topic from public.curriculum_topics where id=a.topic_id and user_id=p_user_id;
  if t.status='completed' and kind in ('partial','not_started','reschedule') then raise exception 'task_already_completed'; end if;
  if kind='reschedule' then
    target:=coalesce(nullif(p_input->>'new_date','')::date,(stamp at time zone coalesce(pref.timezone,'Asia/Kolkata'))::date+1);
    if target<=(stamp at time zone coalesce(pref.timezone,'Asia/Kolkata'))::date then raise exception 'invalid_reschedule_date'; end if;
    if exists(select 1 from public.learning_assignments where user_id=p_user_id and assignment_date=target and id<>a.id and status<>'cancelled' and deleted_at is null) then raise exception 'assignment_exists_for_date'; end if;
  end if;
  -- "total" includes previously recorded timer minutes; "additional" explicitly does not.
  if minutes is not null then
    if coalesce(p_input->>'minutes_mode','total')='total' then
      if minutes<t.actual_minutes then raise exception 'reported_total_below_recorded'; end if;
      minutes:=minutes-t.actual_minutes;
    elsif p_input->>'minutes_mode'<>'additional' then raise exception 'invalid_minutes_mode'; end if;
  end if;
  insert into public.learning_feedback(user_id,assignment_id,kind,channel,raw_text,minutes,notes,new_date,idempotency_key,request_payload)
    values(p_user_id,a.id,kind,coalesce(p_input->>'channel','agent'),coalesce(p_input->>'text',''),minutes,notes,target,p_input->>'idempotency_key',p_input) returning id into fb_id;
  if coalesce(minutes,0)>0 then
    -- Reported duration has no invented start timestamp: occurred_at is the receipt time.
    insert into public.focus_sessions(user_id,task_id,started_at,ended_at,duration_minutes,note)
      values(p_user_id,t.id,stamp,stamp,minutes,'Learner-reported duration; start time unknown. Feedback '||fb_id::text) returning id into session_id;
    insert into public.learning_sessions(user_id,task_id,skill_id,minutes,learned,occurred_at,focus_session_id)
      values(p_user_id,t.id,topic.skill_id,minutes,left(topic.stable_topic_id||' '||notes,2000),stamp,session_id);
    update public.tasks set actual_minutes=actual_minutes+minutes where id=t.id and user_id=p_user_id;
  end if;
  if kind='completed' then
    update public.tasks set status='completed',completed_at=coalesce(completed_at,stamp) where id=t.id and user_id=p_user_id;
    update public.learning_assignments set status='completed',completed_at=coalesce(completed_at,stamp) where id=a.id and user_id=p_user_id;
    update public.skill_topics set status='Practicing' where id=topic.skill_topic_id and user_id=p_user_id and status in ('Not Started','Learning');
  elsif kind='partial' then update public.learning_assignments set status='partial',progress_notes=left(concat_ws(E'\n',nullif(progress_notes,''),notes),4000) where id=a.id and user_id=p_user_id;
  elsif kind='not_started' then update public.learning_assignments set status='not_started' where id=a.id and user_id=p_user_id;
  elsif kind='reschedule' then
    update public.learning_assignments set status='planned',assignment_date=target where id=a.id and user_id=p_user_id;
    update public.tasks set status='week',scheduled_date=target,due_date=target where id=t.id and user_id=p_user_id;
  elsif kind='help' then update public.learning_assignments set help_requested=true where id=a.id and user_id=p_user_id;
  end if;
  update public.learning_assignments set recorded_minutes=recorded_minutes+coalesce(minutes,0) where id=a.id and user_id=p_user_id;
  feedback_result:=jsonb_build_object('assignment_id',a.id,'kind',kind,'minutes_recorded',coalesce(minutes,0),'status',(select status from public.learning_assignments where id=a.id),'help',case when kind='help' then jsonb_build_object('topic',topic.title,'source_reference',topic.source_reference,'guide_excerpt',left(topic.body,3000)) else null end);
  update public.learning_feedback set result=feedback_result where id=fb_id and user_id=p_user_id;
  if p_input->>'channel'='telegram' then
    insert into public.telegram_message_map(user_id,assignment_id,kind,direction,chat_ref,message_id,delivery_status) values(p_user_id,a.id,'reply','inbound',p_input->'telegram'->>'chat_ref',p_input->'telegram'->>'message_id','received');
    update public.learning_preferences set telegram_status='reply_ok',telegram_status_at=stamp where user_id=p_user_id;
  end if;
  insert into public.activity_log(user_id,entity_type,entity_id,action,summary,metadata) values(p_user_id,'tasks',t.id,'learning_feedback','Learning: '||kind||' · '||topic.title,jsonb_build_object('feedback_id',fb_id,'minutes',minutes));
  return feedback_result||jsonb_build_object('replayed',false);
end $$;

create or replace function public.learning_record_focus(p_user_id uuid,p_task_id uuid,p_session_id uuid,p_started_at timestamptz,p_ended_at timestamptz,p_minutes integer,p_complete boolean) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare t public.tasks; prior public.focus_sessions;
begin
  perform public.learning_assert_user(p_user_id);
  select * into prior from public.focus_sessions where id=p_session_id;
  if found then
    if prior.user_id<>p_user_id or prior.task_id<>p_task_id then raise exception 'focus_identity_conflict'; end if;
    return jsonb_build_object('replayed',true);
  end if;
  if p_minutes not between 1 and 600 or p_ended_at<p_started_at or p_ended_at>now()+interval '1 minute' then raise exception 'invalid_focus_session'; end if;
  select * into t from public.tasks where id=p_task_id and user_id=p_user_id and deleted_at is null for update;
  if not found then raise exception 'task_not_found'; end if;
  insert into public.focus_sessions(id,user_id,task_id,started_at,ended_at,duration_minutes,note) values(p_session_id,p_user_id,p_task_id,p_started_at,p_ended_at,p_minutes,'');
  if t.type='Learn' then insert into public.learning_sessions(user_id,skill_id,task_id,minutes,learned,occurred_at,focus_session_id) values(p_user_id,t.skill_id,t.id,p_minutes,'Focus session',p_ended_at,p_session_id); end if;
  update public.tasks set actual_minutes=actual_minutes+p_minutes,status=case when p_complete or status='completed' then 'completed' else 'today' end,completed_at=case when p_complete then coalesce(completed_at,p_ended_at) else completed_at end where id=t.id and user_id=p_user_id;
  if p_complete then update public.learning_assignments set status='completed',completed_at=coalesce(completed_at,p_ended_at),recorded_minutes=recorded_minutes+p_minutes where task_id=t.id and user_id=p_user_id and status not in ('cancelled','rescheduled'); end if;
  return jsonb_build_object('replayed',false);
end $$;

revoke all on function public.learning_assert_user(uuid), public.learning_create_assignment(uuid,jsonb),public.learning_apply_feedback(uuid,jsonb),public.learning_record_focus(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean) from public;
grant execute on function public.learning_assert_user(uuid), public.learning_create_assignment(uuid,jsonb),public.learning_apply_feedback(uuid,jsonb),public.learning_record_focus(uuid,uuid,uuid,timestamptz,timestamptz,integer,boolean) to authenticated,service_role;
