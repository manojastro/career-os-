-- Validate actual PostgreSQL timezone names, including DST-aware IANA zones.
alter table public.learning_preferences drop constraint learning_preferences_timezone_check;
create function public.learning_validate_timezone() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'invalid_timezone'; end if;
  if new.sync_time>=new.morning_time or new.morning_time>=new.evening_time then raise exception 'invalid_schedule_order'; end if;
  return new;
end $$;
create trigger learning_timezone before insert or update on public.learning_preferences for each row execute function public.learning_validate_timezone();
