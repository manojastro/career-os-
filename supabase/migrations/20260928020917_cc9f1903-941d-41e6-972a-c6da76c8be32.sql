create or replace function public.mark_job_lead_applied(p_lead uuid, p_notes text default '')
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
  l public.job_leads%rowtype;
  app_id uuid;
  today date := (now() at time zone 'Asia/Kolkata')::date;
  n text := left(coalesce(trim(p_notes), ''), 5000);
  already boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into l from public.job_leads where id = p_lead and user_id = uid and deleted_at is null for update;
  if not found then raise exception 'lead_not_found'; end if;
  already := l.status = 'applied';
  if l.application_id is not null then
    select id into app_id from public.job_applications where id = l.application_id and user_id = uid and deleted_at is null for update;
  end if;
  if app_id is null and coalesce(l.official_url,'') <> '' then
    select id into app_id from public.job_applications where user_id = uid and deleted_at is null and job_url = l.official_url order by created_at limit 1 for update;
  end if;
  if app_id is null then
    insert into public.job_applications (user_id, company, role, location, work_type, job_url, job_description, salary_range, date_found, date_applied, status, notes, priority)
    values (uid, l.company, l.title, l.location, l.work_type, l.official_url, l.summary, l.salary_range, today, today, 'Applied', n, 'medium')
    returning id into app_id;
  else
    update public.job_applications set
      date_applied = coalesce(date_applied, today),
      status = case when status in ('Saved','Planning to Apply') then 'Applied' else status end,
      job_url = case when job_url = '' then l.official_url else job_url end,
      notes = case when n = '' or position(n in notes) > 0 then notes when notes = '' then n else notes || E'\n' || n end
    where id = app_id;
  end if;
  update public.job_leads set status = 'applied', application_id = app_id where id = l.id;
  if not already then
    insert into public.feedback (user_id, target_type, target_id, action, note) values (uid, 'job_lead', l.id, 'done', 'applied manually by owner');
  end if;
  return jsonb_build_object('application_id', app_id, 'already_applied', already);
end $$;
revoke all on function public.mark_job_lead_applied(uuid, text) from public, anon;
grant execute on function public.mark_job_lead_applied(uuid, text) to authenticated;
