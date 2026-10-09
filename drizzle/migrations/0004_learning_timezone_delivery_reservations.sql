-- 0004: configurable IANA timezone, durable Telegram send reservations, learning command ack.

alter table public.learning_preferences drop constraint if exists learning_preferences_timezone_check;
create or replace function public.learning_valid_timezone(p_tz text) returns boolean
language sql stable set search_path = public as $$
  select p_tz is not null and length(p_tz) between 1 and 64 and p_tz ~ '^[A-Za-z0-9_+/-]+$'
    and exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz)
$$;
create or replace function public.learning_preferences_tz_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.learning_valid_timezone(new.timezone) then raise exception 'invalid_timezone' using errcode = '23514'; end if;
  return new;
end $$;
create trigger learning_preferences_tz_guard before insert or update of timezone on public.learning_preferences
  for each row execute function public.learning_preferences_tz_guard();

alter table public.telegram_message_map drop constraint if exists telegram_message_map_delivery_status_check;
alter table public.telegram_message_map add constraint telegram_message_map_delivery_status_check
  check (delivery_status in ('pending','sent','failed','unknown','received'));
alter table public.telegram_message_map add column if not exists reservation_token uuid;
alter table public.telegram_message_map add column if not exists reserved_at timestamptz;
alter table public.telegram_message_map add column if not exists finished_at timestamptz;
alter table public.telegram_message_map add column if not exists reconciled boolean not null default false;
comment on function public.learning_record_delivery(uuid, jsonb) is 'DEPRECATED: post-send dedupe only; use learning_begin_delivery + learning_finish_delivery.';

create or replace function public.learning_begin_delivery(p_user_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare existing public.telegram_message_map; created public.telegram_message_map; other public.telegram_message_map;
  v_assignment uuid := nullif(p_input->>'assignment_id', '')::uuid; v_kind text := p_input->>'kind'; token uuid := gen_random_uuid();
begin
  perform public.learning_assert_user(p_user_id);
  if coalesce(length(p_input->>'idempotency_key'), 0) < 8 then raise exception 'invalid_idempotency_key'; end if;
  if v_kind is null or v_kind not in ('morning_plan','evening_check','test','help') then raise exception 'invalid_kind'; end if;
  select * into existing from public.telegram_message_map where user_id = p_user_id and idempotency_key = p_input->>'idempotency_key' for update;
  if found then
    if existing.kind is distinct from v_kind or existing.assignment_id is distinct from v_assignment then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('send_allowed', false, 'delivery_id', existing.id, 'status', existing.delivery_status,
      'reason', case existing.delivery_status when 'pending' then 'reservation_pending' when 'unknown' then 'outcome_unknown_reconcile'
        when 'sent' then 'already_sent' else 'previous_attempt_failed' end);
  end if;
  if v_assignment is not null then
    if not exists (select 1 from public.learning_assignments where id = v_assignment and user_id = p_user_id and deleted_at is null) then raise exception 'assignment_not_found'; end if;
    select * into other from public.telegram_message_map where user_id = p_user_id and assignment_id = v_assignment and kind = v_kind
      and direction = 'outbound' and delivery_status in ('pending','sent','unknown') and deleted_at is null limit 1;
    if found then
      return jsonb_build_object('send_allowed', false, 'delivery_id', other.id, 'status', other.delivery_status, 'reason', 'assignment_already_reserved');
    end if;
  end if;
  insert into public.telegram_message_map(user_id, assignment_id, kind, direction, chat_ref, message_id, delivery_status, idempotency_key, reservation_token, reserved_at)
    values (p_user_id, v_assignment, v_kind, 'outbound', left(coalesce(p_input->>'chat_ref', ''), 80), '', 'pending', p_input->>'idempotency_key', token, now())
    returning * into created;
  return jsonb_build_object('send_allowed', true, 'delivery_id', created.id, 'reservation_token', token, 'status', 'pending');
end $$;

create or replace function public.learning_finish_delivery(p_user_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare r public.telegram_message_map; v_status text := p_input->>'status'; v_msg text := coalesce(p_input->>'message_id', '');
  v_chat text; v_reconcile boolean := coalesce((p_input->>'reconcile')::boolean, false); v_prev text;
begin
  perform public.learning_assert_user(p_user_id);
  if v_status is null or v_status not in ('sent','failed','unknown') then raise exception 'invalid_status'; end if;
  select * into r from public.telegram_message_map where id = nullif(p_input->>'delivery_id', '')::uuid and user_id = p_user_id and direction = 'outbound' and deleted_at is null for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if r.reservation_token is null or r.reservation_token::text is distinct from p_input->>'reservation_token' then raise exception 'reservation_token_mismatch'; end if;
  v_chat := coalesce(nullif(p_input->>'chat_ref', ''), r.chat_ref);
  if r.delivery_status = v_status and (v_status <> 'sent' or (r.message_id = v_msg and r.chat_ref = v_chat)) then
    return jsonb_build_object('delivery_id', r.id, 'status', r.delivery_status, 'replayed', true, 'reply_mappable', r.delivery_status = 'sent');
  end if;
  if not ((r.delivery_status = 'pending' and v_status in ('sent','failed','unknown'))
       or (r.delivery_status = 'unknown' and v_status in ('sent','failed') and v_reconcile)) then
    raise exception 'delivery_state_conflict';
  end if;
  if v_status = 'sent' and (v_msg = '' or coalesce(v_chat, '') = '') then raise exception 'message_ref_required'; end if;
  v_prev := r.delivery_status;
  begin
    update public.telegram_message_map set delivery_status = v_status, message_id = case when v_status = 'sent' then left(v_msg, 40) else message_id end,
      chat_ref = left(v_chat, 80), error = left(coalesce(p_input->>'error', ''), 300), finished_at = now(), reconciled = (v_prev = 'unknown')
      where id = r.id and delivery_status = v_prev returning * into r;
  exception when unique_violation then raise exception 'message_already_recorded';
  end;
  if v_status = 'sent' and r.kind = 'morning_plan' and r.assignment_id is not null then
    update public.learning_assignments set status = 'delivered' where id = r.assignment_id and user_id = p_user_id and status = 'planned';
  end if;
  if v_status in ('sent','failed') then
    update public.learning_preferences set telegram_status = case when v_status = 'sent' then 'sent_ok' else 'send_failed' end, telegram_status_at = now() where user_id = p_user_id;
  end if;
  return jsonb_build_object('delivery_id', r.id, 'status', r.delivery_status, 'replayed', false, 'reply_mappable', r.delivery_status = 'sent');
end $$;

create or replace function public.learning_ack_command(p_user_id uuid, p_id uuid, p_status text, p_result jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare c public.agent_commands;
begin
  perform public.learning_assert_user(p_user_id);
  if p_status is null or p_status not in ('completed','failed') then raise exception 'invalid_status'; end if;
  select * into c from public.agent_commands where id = p_id and user_id = p_user_id and deleted_at is null
    and command in ('ping_learning_manager','send_test_telegram') for update;
  if not found then raise exception 'command_not_found'; end if;
  if c.status = p_status then return jsonb_build_object('id', c.id, 'status', c.status, 'replayed', true); end if;
  if c.status = 'queued' then
    update public.agent_commands set status = 'claimed', claimed_at = now() where id = c.id;
  elsif c.status <> 'claimed' then raise exception 'command_state_conflict';
  end if;
  update public.agent_commands set status = p_status, completed_at = now(), result = coalesce(p_result, '{}'::jsonb) where id = c.id returning * into c;
  return jsonb_build_object('id', c.id, 'status', c.status, 'replayed', false);
end $$;

revoke all on function public.learning_valid_timezone(text) from public, anon;
grant execute on function public.learning_valid_timezone(text) to authenticated, service_role;
revoke all on function public.learning_begin_delivery(uuid, jsonb), public.learning_finish_delivery(uuid, jsonb), public.learning_ack_command(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.learning_begin_delivery(uuid, jsonb), public.learning_finish_delivery(uuid, jsonb), public.learning_ack_command(uuid, uuid, text, jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.agent_poll(p_cursor timestamp with time zone, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare owner uuid; ts timestamptz := now(); since timestamptz := coalesce(p_cursor, '-infinity'::timestamptz);
  cmds jsonb; fb jsonb; pref jsonb; ch jsonb;
begin
  select user_id into owner from public.agent_owner where singleton;
  if owner is null then raise exception 'agent_owner_not_bound' using errcode = 'P0001'; end if;
  with c as (
    select id from public.agent_commands where user_id = owner and status = 'queued' and command not in ('ping_learning_manager','send_test_telegram')
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
end $function$;
