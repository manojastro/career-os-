-- Active intervals are coordination state, never an additional time ledger.
CREATE TABLE public.agent_v2_focus_intervals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 task_id uuid NOT NULL REFERENCES public.tasks(id),
 state text NOT NULL CHECK(state IN ('running','paused','finished','cancelled')),
 started_at timestamptz NOT NULL DEFAULT now(),
 running_since timestamptz,
 paused_at timestamptz,
 finished_at timestamptz,
 elapsed_ms bigint NOT NULL DEFAULT 0 CHECK(elapsed_ms>=0),
 complete boolean,
 source text NOT NULL CHECK(source IN ('web','telegram')),
 request_key text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agent_v2_focus_one_active ON public.agent_v2_focus_intervals(user_id) WHERE state IN ('running','paused');
CREATE INDEX agent_v2_focus_owner_history ON public.agent_v2_focus_intervals(user_id,started_at DESC);
CREATE TABLE public.agent_v2_focus_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_key text NOT NULL,
 payload jsonb NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_key)
);
ALTER TABLE public.agent_v2_focus_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_v2_focus_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_v2_focus_read ON public.agent_v2_focus_intervals FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY agent_v2_focus_receipts_read ON public.agent_v2_focus_receipts FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.agent_v2_focus_intervals,public.agent_v2_focus_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.agent_v2_focus_intervals,public.agent_v2_focus_receipts TO authenticated;
GRANT ALL ON public.agent_v2_focus_intervals,public.agent_v2_focus_receipts TO service_role;

-- Every ledger writer takes the existing owner lock before checking active state.
CREATE FUNCTION public.agent_v2_focus_ledger_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.learning_assert_user(NEW.user_id);
 IF EXISTS(SELECT 1 FROM public.agent_v2_focus_intervals WHERE user_id=NEW.user_id AND task_id=NEW.task_id AND state IN ('running','paused') AND id<>NEW.id) THEN
  RAISE EXCEPTION 'active_focus_conflict';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.agent_v2_focus_intervals WHERE user_id=NEW.user_id AND id=NEW.id) AND EXISTS(SELECT 1 FROM public.agent_v2_focus_intervals WHERE user_id=NEW.user_id AND id<>NEW.id AND state<>'cancelled' AND started_at<NEW.ended_at AND coalesce(finished_at,clock_timestamp())>NEW.started_at) THEN
  RAISE EXCEPTION 'legacy_focus_overlap';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agent_v2_focus_ledger_guard BEFORE INSERT ON public.focus_sessions FOR EACH ROW EXECUTE FUNCTION public.agent_v2_focus_ledger_guard();
REVOKE ALL ON FUNCTION public.agent_v2_focus_ledger_guard() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.agent_v2_focus(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.agent_v2_focus_intervals; receipt public.agent_v2_focus_receipts; a text:=p_input->>'action'; stamp timestamptz:=clock_timestamp(); result jsonb; mins integer; src text;
BEGIN
 PERFORM public.learning_assert_user(p_uid);
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 5 AND 200 OR p_key !~ '^(web|tg):[A-Za-z0-9:._-]+$' THEN RAISE EXCEPTION 'invalid_request'; END IF;
 src:=CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END;
 IF src='telegram' AND coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
 IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR a IS NULL OR a NOT IN ('status','start','pause','resume','finish','cancel') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF (a='status' AND p_input-'action'<>'{}') OR
    (a='start' AND (p_input-'action'-'task_id'<>'{}' OR jsonb_typeof(p_input->'task_id') IS DISTINCT FROM 'string')) OR
    (a IN ('pause','resume','cancel') AND (p_input-'action'-'session_id'<>'{}' OR jsonb_typeof(p_input->'session_id') IS DISTINCT FROM 'string')) OR
    (a='finish' AND (p_input-'action'-'session_id'-'complete'<>'{}' OR jsonb_typeof(p_input->'session_id') IS DISTINCT FROM 'string' OR jsonb_typeof(p_input->'complete') IS DISTINCT FROM 'boolean')) THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a='status' THEN
  SELECT * INTO s FROM public.agent_v2_focus_intervals WHERE user_id=p_uid AND state IN ('running','paused');
  RETURN jsonb_build_object('session',CASE WHEN s.id IS NULL THEN NULL ELSE to_jsonb(s) END,'server_now',stamp);
 END IF;
 SELECT * INTO receipt FROM public.agent_v2_focus_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF FOUND THEN
  IF receipt.payload<>p_input THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN receipt.result;
 END IF;
 IF a='start' THEN
  PERFORM 1 FROM public.tasks WHERE id=(p_input->>'task_id')::uuid AND user_id=p_uid AND deleted_at IS NULL AND status<>'completed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  SELECT * INTO s FROM public.agent_v2_focus_intervals WHERE user_id=p_uid AND state IN ('running','paused') FOR UPDATE;
  IF s.id IS NOT NULL AND s.task_id<>(p_input->>'task_id')::uuid THEN RAISE EXCEPTION 'active_focus_conflict'; END IF;
  IF s.id IS NULL THEN
   INSERT INTO public.agent_v2_focus_intervals(user_id,task_id,state,started_at,running_since,source,request_key) VALUES(p_uid,(p_input->>'task_id')::uuid,'running',stamp,stamp,src,p_key) RETURNING * INTO s;
   UPDATE public.tasks SET status='doing' WHERE id=s.task_id AND user_id=p_uid;
  END IF;
 ELSE
  SELECT * INTO s FROM public.agent_v2_focus_intervals WHERE id=(p_input->>'session_id')::uuid AND user_id=p_uid FOR UPDATE;
  IF s.id IS NULL OR s.state NOT IN ('running','paused') THEN RAISE EXCEPTION 'stale_session'; END IF;
  IF a<>'cancel' THEN
   PERFORM 1 FROM public.tasks WHERE id=s.task_id AND user_id=p_uid AND deleted_at IS NULL FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  END IF;
  IF s.running_since IS NOT NULL THEN s.elapsed_ms:=s.elapsed_ms+greatest(0,floor(extract(epoch FROM stamp-s.running_since)*1000))::bigint; END IF;
  s.running_since:=NULL;
  IF a='pause' THEN s.state:='paused'; s.paused_at:=stamp;
  ELSIF a='resume' THEN s.state:='running'; s.running_since:=stamp;
  ELSE
   s.state:=CASE WHEN a='finish' THEN 'finished' ELSE 'cancelled' END; s.finished_at:=stamp;
   s.complete:=CASE WHEN a='finish' THEN (p_input->>'complete')::boolean ELSE false END;
   IF a='finish' THEN
    mins:=least(600,floor(s.elapsed_ms/60000.0))::integer;
    IF mins>0 THEN
     PERFORM public.learning_record_focus(p_uid,s.task_id,s.id,s.started_at,stamp,mins,s.complete);
    ELSIF s.complete THEN
     UPDATE public.tasks SET status='completed',completed_at=coalesce(completed_at,stamp) WHERE id=s.task_id AND user_id=p_uid;
     UPDATE public.learning_assignments SET status='completed',completed_at=coalesce(completed_at,stamp) WHERE task_id=s.task_id AND user_id=p_uid AND deleted_at IS NULL AND status NOT IN ('cancelled','rescheduled');
    END IF;
   END IF;
  END IF;
  UPDATE public.agent_v2_focus_intervals SET state=s.state,running_since=s.running_since,paused_at=s.paused_at,finished_at=s.finished_at,elapsed_ms=s.elapsed_ms,complete=s.complete,updated_at=stamp WHERE id=s.id RETURNING * INTO s;
 END IF;
 result:=jsonb_build_object('session',to_jsonb(s),'server_now',stamp);
 INSERT INTO public.agent_v2_focus_receipts(user_id,request_key,payload,result) VALUES(p_uid,p_key,p_input,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_focus(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agent_v2_focus(uuid,text,jsonb) TO authenticated,service_role;

-- Instruction receipts retain hashes and canonical IDs, not owner prose.
CREATE TABLE public.agent_v2_instruction_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_key text NOT NULL, payload_hash text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,request_key)
);
ALTER TABLE public.agent_v2_instruction_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_v2_instruction_receipts_read ON public.agent_v2_instruction_receipts FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.agent_v2_instruction_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.agent_v2_instruction_receipts TO authenticated;
GRANT ALL ON public.agent_v2_instruction_receipts TO service_role;
CREATE FUNCTION public.agent_v2_instruction(p_uid uuid,p_key text,p_input jsonb,p_chat text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text:=p_input->>'action'; q text:=lower(btrim(p_input->>'query')); candidates jsonb; pid uuid; tid uuid; selected uuid; s public.agent_v2_focus_intervals; old public.agent_v2_instruction_receipts; result jsonb; v_title text; payload_hash text:=md5(p_input::text||coalesce(p_chat,''));
BEGIN
 PERFORM public.learning_assert_user(p_uid);
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 5 AND 180 OR p_key !~ '^(web|tg):[A-Za-z0-9:._-]+$' OR (p_key LIKE 'tg:%' AND coalesce(auth.role(),'')<>'service_role') OR (p_chat IS NOT NULL AND coalesce(auth.role(),'')<>'service_role') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a IS NULL OR a NOT IN ('start','finish','add') OR q IS NULL OR length(q)>300 OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR
  (a IN ('start','finish') AND p_input-'action'-'query'<>'{}') OR
  (a='add' AND (p_input-'action'-'query'-'title'-'type'<>'{}' OR p_input->>'type' NOT IN ('Build','Learn') OR length(btrim(p_input->>'title')) NOT BETWEEN 2 AND 200)) THEN RAISE EXCEPTION 'invalid_request'; END IF;
 SELECT * INTO old FROM public.agent_v2_instruction_receipts WHERE user_id=p_uid AND request_key=p_key;
 IF FOUND THEN
  IF old.payload_hash<>payload_hash THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN old.result;
 END IF;
 SELECT * INTO s FROM public.agent_v2_focus_intervals WHERE user_id=p_uid AND state IN ('running','paused');
 IF p_chat IS NOT NULL THEN SELECT selected_id INTO selected FROM public.control_context WHERE user_id=p_uid AND chat_ref=p_chat AND updated_at>now()-interval '30 minutes'; END IF;
 IF a='finish' THEN
  IF s.id IS NOT NULL AND (q='' OR EXISTS(SELECT 1 FROM tasks t LEFT JOIN projects p ON p.id=t.project_id AND p.user_id=p_uid AND p.deleted_at IS NULL WHERE t.id=s.task_id AND t.user_id=p_uid AND t.deleted_at IS NULL AND (lower(t.title)=q OR lower(p.name)=q OR t.id::text=q))) THEN
   result:=public.agent_v2_focus(p_uid,p_key||':focus',jsonb_build_object('action','finish','session_id',s.id,'complete',true));
  ELSE RETURN jsonb_build_object('status','needs_clarification','message','Select the active task to finish.','candidates',CASE WHEN s.id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('id',s.task_id,'session_id',s.id)) END); END IF;
 ELSE
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',name)),'[]') INTO candidates FROM (SELECT id,name FROM projects WHERE user_id=p_uid AND deleted_at IS NULL AND (q='' OR lower(name)=q OR id::text=q) ORDER BY name LIMIT 100) p;
  IF q='' AND s.id IS NOT NULL THEN SELECT project_id INTO pid FROM tasks WHERE id=s.task_id AND user_id=p_uid AND deleted_at IS NULL; END IF;
  IF pid IS NULL AND q='' AND selected IS NOT NULL THEN
   SELECT id INTO pid FROM projects WHERE id=selected AND user_id=p_uid AND deleted_at IS NULL;
   IF pid IS NULL THEN SELECT project_id INTO pid FROM tasks WHERE id=selected AND user_id=p_uid AND deleted_at IS NULL; END IF;
  END IF;
  IF pid IS NULL AND jsonb_array_length(candidates)=1 THEN pid:=(candidates->0->>'id')::uuid; END IF;
  IF a='add' THEN
   IF pid IS NULL THEN RETURN jsonb_build_object('status','needs_clarification','message','Choose one project.','candidates',candidates); END IF;
   v_title:=regexp_replace(btrim(p_input->>'title'),'\s+',' ','g');
   SELECT id INTO tid FROM tasks WHERE user_id=p_uid AND project_id=pid AND deleted_at IS NULL AND lower(regexp_replace(btrim(tasks.title),'\s+',' ','g'))=lower(v_title) ORDER BY created_at LIMIT 1;
   IF tid IS NULL THEN INSERT INTO tasks(user_id,project_id,title,type) VALUES(p_uid,pid,v_title,p_input->>'type') RETURNING id INTO tid; END IF;
   result:=jsonb_build_object('status','completed','task_id',tid,'project_id',pid);
  ELSE
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'label',title)),'[]') INTO candidates FROM (SELECT id,title FROM tasks WHERE user_id=p_uid AND deleted_at IS NULL AND status<>'completed' AND (lower(title)=q OR id::text=q OR project_id=pid OR (q='' AND id=selected)) ORDER BY title LIMIT 100) t;
   IF jsonb_array_length(candidates)<>1 THEN RETURN jsonb_build_object('status','needs_clarification','message','Choose one existing task.','candidates',candidates); END IF;
   result:=public.agent_v2_focus(p_uid,p_key||':focus',jsonb_build_object('action','start','task_id',candidates->0->>'id'));
  END IF;
 END IF;
 INSERT INTO public.agent_v2_instruction_receipts(user_id,request_key,payload_hash,result) VALUES(p_uid,p_key,payload_hash,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_instruction(uuid,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agent_v2_instruction(uuid,text,jsonb,text) TO authenticated,service_role;

-- Legacy retries must match the actual original ledger payload.
ALTER TABLE public.focus_sessions ADD COLUMN completion_requested boolean;
create or replace function public.learning_record_focus(p_user_id uuid, p_task_id uuid, p_session_id uuid, p_started_at timestamptz, p_ended_at timestamptz, p_minutes integer, p_complete boolean) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare t public.tasks; prior public.focus_sessions;
begin
  perform public.learning_assert_user(p_user_id);
  select * into prior from public.focus_sessions where id = p_session_id;
  if found then
    if prior.user_id <> p_user_id or prior.task_id is distinct from p_task_id or prior.started_at is distinct from p_started_at or prior.ended_at is distinct from p_ended_at or prior.duration_minutes is distinct from p_minutes or prior.completion_requested is distinct from p_complete then raise exception 'focus_identity_conflict'; end if;
    return jsonb_build_object('replayed', true);
  end if;
  if p_minutes is null or p_minutes not between 1 and 600 or p_ended_at < p_started_at or p_ended_at > now() + interval '1 minute' then raise exception 'invalid_focus_session'; end if;
  select * into t from public.tasks where id = p_task_id and user_id = p_user_id and deleted_at is null for update;
  if not found then raise exception 'task_not_found'; end if;
  insert into public.focus_sessions(id, user_id, task_id, started_at, ended_at, duration_minutes, note,completion_requested) values (p_session_id, p_user_id, p_task_id, p_started_at, p_ended_at, p_minutes, '',p_complete);
  if t.type = 'Learn' then
    insert into public.learning_sessions(user_id, skill_id, task_id, minutes, learned, occurred_at, focus_session_id)
      values (p_user_id, t.skill_id, t.id, p_minutes, 'Focus session', p_ended_at, p_session_id);
  end if;
  update public.tasks set actual_minutes = actual_minutes + p_minutes,
    status = case when p_complete or status = 'completed' then 'completed' else 'today' end,
    completed_at = case when p_complete then coalesce(completed_at, p_ended_at) else completed_at end
    where id = t.id and user_id = p_user_id;
  update public.learning_assignments set recorded_minutes = recorded_minutes + p_minutes,
    status = case when p_complete then 'completed' else status end,
    completed_at = case when p_complete then coalesce(completed_at, p_ended_at) else completed_at end
    where task_id = t.id and user_id = p_user_id and status not in ('cancelled', 'rescheduled') and deleted_at is null;
  return jsonb_build_object('replayed', false);
end $$;
