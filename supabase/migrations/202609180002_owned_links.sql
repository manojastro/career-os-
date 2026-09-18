-- Prevent a user from attaching their row to another user's UUID, even if an ID leaks.
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
