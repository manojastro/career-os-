create table public.learning_agent_commands (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  command text not null check(command in ('ping_learning_manager','send_test_telegram')),
  status text not null default 'pending' check(status in ('pending','succeeded','failed')),
  result jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz
);
alter table public.learning_agent_commands enable row level security;
create policy learning_commands_owner on public.learning_agent_commands to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant all on public.learning_agent_commands to authenticated,service_role;
create trigger touch_updated_at before update on public.learning_agent_commands for each row execute function public.touch_updated_at();

create table public.learning_api_limits(user_id uuid not null,bucket text not null,window_at timestamptz not null,hits integer not null default 1,primary key(user_id,bucket,window_at));
alter table public.learning_api_limits enable row level security;
create policy learning_limits_owner on public.learning_api_limits to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant all on public.learning_api_limits to authenticated,service_role;
create or replace function public.learning_rate_limit(p_user_id uuid,p_bucket text,p_max integer default 60) returns boolean
language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
  perform public.learning_assert_user(p_user_id);
  delete from public.learning_api_limits where user_id=p_user_id and window_at<now()-interval '1 day';
  insert into public.learning_api_limits(user_id,bucket,window_at) values(p_user_id,p_bucket,date_trunc('minute',now()))
    on conflict(user_id,bucket,window_at) do update set hits=learning_api_limits.hits+1 returning hits into n;
  return n<=p_max;
end $$;
revoke all on function public.learning_rate_limit(uuid,text,integer) from public;
grant execute on function public.learning_rate_limit(uuid,text,integer) to authenticated,service_role;

alter table public.telegram_message_map add column delivery_key text;
create unique index learning_delivery_key on public.telegram_message_map(user_id,delivery_key) where delivery_key is not null;
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.telegram_message_map'::regclass and contype='c' and pg_get_constraintdef(oid) like '%delivery_status%' loop
    execute format('alter table public.telegram_message_map drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.telegram_message_map add constraint learning_delivery_status check(delivery_status in ('pending','unknown','sent','failed','received'));

create or replace function public.learning_begin_delivery(p_user_id uuid,p_assignment_id uuid,p_kind text,p_key text,p_chat_ref text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare previous public.telegram_message_map;
begin
  perform public.learning_assert_user(p_user_id);
  select * into previous from public.telegram_message_map where user_id=p_user_id and delivery_key=p_key for update;
  if found then return jsonb_build_object('send_allowed',false,'status',previous.delivery_status,'message_id',previous.message_id); end if;
  if p_kind not in ('morning_plan','evening_check','test','help') or coalesce(p_chat_ref,'')='' then raise exception 'invalid_delivery'; end if;
  insert into public.telegram_message_map(user_id,assignment_id,kind,direction,chat_ref,delivery_status,delivery_key)
    values(p_user_id,p_assignment_id,p_kind,'outbound',p_chat_ref,'pending',p_key);
  return jsonb_build_object('send_allowed',true,'status','pending');
end $$;

create or replace function public.learning_finish_delivery(p_user_id uuid,p_key text,p_status text,p_message_id text,p_error text default '') returns jsonb
language plpgsql security invoker set search_path=public as $$
declare prior public.telegram_message_map;
begin
  perform public.learning_assert_user(p_user_id);
  if p_status not in ('sent','failed','unknown') or (p_status='sent' and coalesce(p_message_id,'')='') then raise exception 'invalid_delivery_receipt'; end if;
  select * into prior from public.telegram_message_map where user_id=p_user_id and delivery_key=p_key for update;
  if not found then raise exception 'delivery_not_started'; end if;
  if prior.delivery_status='sent' then
    if p_status<>'sent' or prior.message_id<>p_message_id then raise exception 'delivery_receipt_conflict'; end if;
    return jsonb_build_object('ok',true,'replayed',true);
  end if;
  update public.telegram_message_map set delivery_status=p_status,message_id=coalesce(p_message_id,''),error=left(p_error,300) where id=prior.id;
  if p_status='sent' then
    update public.learning_assignments set status='delivered' where id=prior.assignment_id and user_id=p_user_id and status='planned';
    update public.learning_preferences set telegram_status='sent_ok',telegram_status_at=now() where user_id=p_user_id;
  elsif p_status='failed' then update public.learning_preferences set telegram_status='send_failed',telegram_status_at=now() where user_id=p_user_id;
  end if;
  return jsonb_build_object('ok',true,'replayed',false);
end $$;
revoke all on function public.learning_begin_delivery(uuid,uuid,text,text,text),public.learning_finish_delivery(uuid,text,text,text,text) from public;
grant execute on function public.learning_begin_delivery(uuid,uuid,text,text,text),public.learning_finish_delivery(uuid,text,text,text,text) to authenticated,service_role;
