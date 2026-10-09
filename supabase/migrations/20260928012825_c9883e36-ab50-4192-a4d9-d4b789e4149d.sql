create or replace function public.job_leads_keep_verified() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null and old.status = 'verified' and new.status = 'new' then new.status := 'verified'; end if;
  return new;
end $$;
create trigger job_leads_keep_verified before update on public.job_leads for each row execute function public.job_leads_keep_verified();
