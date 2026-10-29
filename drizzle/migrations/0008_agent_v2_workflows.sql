-- Durable plans are owner-only retained execution records; no credentials/provider payloads.
CREATE TABLE public.agent_v2_kind_policy(kind text PRIMARY KEY,effect text NOT NULL CHECK(effect IN ('local','read','external_write')),approval boolean NOT NULL);
INSERT INTO public.agent_v2_kind_policy VALUES ('task.create','local',false),('task.update','local',false),('focus.transition','local',false),('memory.put','local',false),('memory.confirm','local',true),('document.register','local',false);
CREATE TABLE public.agent_v2_workflows(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),request_key text NOT NULL,
 instruction text NOT NULL,plan jsonb NOT NULL,plan_hash text NOT NULL,source text NOT NULL CHECK(source IN ('web','telegram')),chat_ref text,
 state text NOT NULL CHECK(state IN ('awaiting_confirmation','ready','running','partial','completed','cancelled','uncertain','dead_letter')),
 version integer NOT NULL DEFAULT 1,approval_id uuid NOT NULL DEFAULT gen_random_uuid(),approval_expires_at timestamptz NOT NULL,
 approved_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(user_id,request_key));
CREATE INDEX agent_v2_workflow_owner ON public.agent_v2_workflows(user_id,created_at DESC,id);
CREATE TABLE public.agent_v2_workflow_steps(
 workflow_id uuid NOT NULL REFERENCES public.agent_v2_workflows(id),id text NOT NULL,user_id uuid NOT NULL REFERENCES auth.users(id),ordinal integer NOT NULL,
 kind text NOT NULL REFERENCES public.agent_v2_kind_policy(kind),depends_on text[] NOT NULL,input jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','claimed','succeeded','failed','blocked','cancelled','uncertain','dead_letter')),
 attempts integer NOT NULL DEFAULT 0,lease_token uuid,lease_deadline timestamptz,next_attempt_at timestamptz,
 result jsonb,error_code text,permission_decision text NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(workflow_id,id));
CREATE INDEX agent_v2_steps_owner ON public.agent_v2_workflow_steps(user_id,workflow_id);
CREATE TABLE public.agent_v2_source_exposures(user_id uuid NOT NULL REFERENCES auth.users(id),chat_ref text NOT NULL,provenance_id uuid NOT NULL,content_hash text NOT NULL,observed_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(user_id,chat_ref));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['agent_v2_workflows','agent_v2_workflow_steps','agent_v2_source_exposures'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()))',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;

CREATE FUNCTION public.agent_v2_workflow_finish(p_uid uuid,p_id uuid,p_step text,p_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.agent_v2_workflows; s public.agent_v2_workflow_steps; inp jsonb; b record; linked jsonb; outcome jsonb; stamp timestamptz; journal text; err text; oldrow jsonb;
BEGIN
 PERFORM learning_assert_user(p_uid);
 -- Owner admission precedes task/time and workflow rows; never acquire legacy advisory lock 713.
 SELECT * INTO w FROM agent_v2_workflows WHERE id=p_id AND user_id=p_uid;
 SELECT * INTO s FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND id=p_step AND user_id=p_uid;
 IF w.id IS NULL OR s.id IS NULL THEN RAISE EXCEPTION 'workflow_not_found'; END IF;
 IF s.status='succeeded' AND s.lease_token=p_token THEN RETURN s.result; END IF;
 stamp:=clock_timestamp();
 IF s.status<>'claimed' OR s.lease_token IS DISTINCT FROM p_token OR s.lease_deadline<=stamp THEN RAISE EXCEPTION 'stale_lease'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agent_v2_kind_policy WHERE kind=s.kind AND effect='local') THEN RAISE EXCEPTION 'trusted_provider_required'; END IF;
 inp:=s.input;
 FOR b IN SELECT key,value FROM jsonb_each(inp) WHERE jsonb_typeof(value)='object' AND value ? 'step' LOOP
  SELECT result INTO linked FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND user_id=p_uid AND id=b.value->>'step' AND status='succeeded';
  IF linked->>'id' IS NULL THEN RAISE EXCEPTION 'invalid_binding'; END IF;
  inp:=jsonb_set(inp,ARRAY[b.key],linked->'id');
 END LOOP;
 journal:=CASE WHEN w.source='telegram' THEN 'tg:' ELSE 'web:' END||'workflow:'||p_id||':'||p_step;
 BEGIN
  IF s.kind IN ('task.create','task.update') THEN
   IF (s.kind='task.create' AND inp-'title'-'description'-'project_id'-'type'-'priority'<>'{}') OR (s.kind='task.update' AND inp-'id'-'expected_updated_at'-'title'-'description'-'project_id'-'type'-'priority'-'status'<>'{}') THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF inp ? 'project_id' AND inp->'project_id'<>'null' AND NOT EXISTS(SELECT 1 FROM projects WHERE id=(inp->>'project_id')::uuid AND user_id=p_uid AND deleted_at IS NULL) THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
   IF s.kind='task.create' AND (jsonb_typeof(inp->'title') IS DISTINCT FROM 'string' OR length(trim(inp->>'title')) NOT BETWEEN 1 AND 500) THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF s.kind='task.update' THEN
    SELECT to_jsonb(t) INTO oldrow FROM tasks t WHERE id=(inp->>'id')::uuid AND user_id=p_uid AND deleted_at IS NULL FOR UPDATE;
    IF oldrow IS NULL THEN RAISE EXCEPTION 'task_not_found'; END IF;
    IF (oldrow->>'updated_at')::timestamptz IS DISTINCT FROM (inp->>'expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'version_conflict'; END IF;
   END IF;
   PERFORM set_config('career.control_key',journal,true);
   outcome:=control_apply(p_uid,jsonb_build_array(jsonb_build_object('entity','tasks','action',split_part(s.kind,'.',2),'id',inp->'id','values',inp-'id'-'expected_updated_at')));
   outcome:=jsonb_build_object('id',outcome->0->'record'->'id','updated_at',outcome->0->'record'->'updated_at');
  ELSIF s.kind='memory.put' THEN
   outcome:=agent_v2_memory(p_uid,journal,inp||'{"action":"put"}');outcome:=jsonb_build_object('id',outcome->'item'->'id','version',outcome->'item'->'version');
  ELSIF s.kind='document.register' THEN
   outcome:=agent_v2_documents(p_uid,journal,inp||'{"action":"register"}');outcome:=jsonb_build_object('id',outcome->'item'->'id','version',outcome->'item'->'version');
  ELSIF s.kind='focus.transition' THEN
   outcome:=agent_v2_focus(p_uid,journal,inp);outcome:=jsonb_build_object('id',outcome->'session'->'id','state',outcome->'session'->'state');
  ELSE RAISE EXCEPTION 'unsupported_kind';
  END IF;
  UPDATE agent_v2_workflow_steps SET status='succeeded',result=outcome,error_code=NULL,updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 EXCEPTION WHEN OTHERS THEN
  err:=CASE WHEN SQLERRM IN ('version_conflict','task_not_found','linked_record_not_found','invalid_request','evidence_required','dependencies_incomplete','record_forgotten','alias_conflict','active_focus_conflict','unsupported_kind') THEN SQLERRM ELSE 'step_rejected' END;
  UPDATE agent_v2_workflow_steps SET status=CASE WHEN attempts>=3 THEN 'dead_letter' ELSE 'failed' END,error_code=err,next_attempt_at=clock_timestamp()+make_interval(secs=>attempts*2),updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 END;
 UPDATE agent_v2_workflows SET state=CASE WHEN state='cancelled' THEN state WHEN NOT EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status<>'succeeded') THEN 'completed' WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='dead_letter') THEN 'dead_letter' WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='failed') THEN 'partial' ELSE 'running' END,version=version+1,updated_at=clock_timestamp() WHERE id=p_id;
 RETURN agent_v2_workflow_view(p_uid,p_id);
END $$;


REVOKE ALL ON public.agent_v2_kind_policy FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.agent_v2_workflow_view(p_uid uuid,p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT to_jsonb(w)-'user_id'-'request_key' || jsonb_build_object('steps',(SELECT coalesce(jsonb_agg(to_jsonb(s)-'user_id'-'workflow_id'-'lease_token' ORDER BY ordinal),'[]') FROM agent_v2_workflow_steps s WHERE workflow_id=w.id AND user_id=p_uid)) FROM agent_v2_workflows w WHERE w.id=p_id AND w.user_id=p_uid
$$;
CREATE FUNCTION public.agent_v2_workflow(p_uid uuid,p_key text,p_input jsonb,p_instruction text,p_chat text DEFAULT NULL,p_message text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text:=p_input->>'action'; w public.agent_v2_workflows; s jsonb; dep text; seen text[]:='{}'; h text; src text; original text; needs boolean; i integer:=0; pol public.agent_v2_kind_policy; b record;
BEGIN
 PERFORM public.learning_assert_user(p_uid);
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 5 AND 200 OR p_key !~ '^(web|tg):[A-Za-z0-9:._-]+$' OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR octet_length(p_input::text)>100000 THEN RAISE EXCEPTION 'invalid_request'; END IF;
 src:=CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END;
 IF src='telegram' THEN
  IF coalesce(auth.role(),'')<>'service_role' OR p_chat IS NULL OR p_key NOT LIKE 'tg:'||p_chat||':'||p_message||':%' THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
  SELECT text INTO original FROM public.control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND created_at>clock_timestamp()-interval '30 minutes';
  IF original IS NULL THEN RAISE EXCEPTION 'inbound_context_required'; END IF;
 ELSE
  IF auth.uid() IS DISTINCT FROM p_uid OR p_chat IS NOT NULL OR p_message IS NOT NULL THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
  original:=p_instruction;
 END IF;
 IF a='prepare' THEN
  IF p_input-'action'-'steps'<>'{}' OR jsonb_typeof(p_input->'steps') IS DISTINCT FROM 'array' OR jsonb_array_length(p_input->'steps') NOT BETWEEN 1 AND 12 OR length(original) NOT BETWEEN 1 AND 20000 OR NOT agent_v2_safe_json(to_jsonb(original)) THEN RAISE EXCEPTION 'invalid_request'; END IF;
  h:=encode(sha256(convert_to((p_input->'steps')::text,'UTF8')),'hex');
  SELECT * INTO w FROM agent_v2_workflows WHERE user_id=p_uid AND request_key=p_key;
  IF w.id IS NOT NULL THEN
   IF w.plan_hash<>h OR w.instruction<>original OR w.source<>src OR w.chat_ref IS DISTINCT FROM p_chat THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
   RETURN agent_v2_workflow_view(p_uid,w.id);
  END IF;
  needs:=jsonb_array_length(p_input->'steps')>1 OR EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=p_chat AND expires_at>clock_timestamp());
  FOR s IN SELECT value FROM jsonb_array_elements(p_input->'steps') LOOP
   SELECT * INTO pol FROM agent_v2_kind_policy WHERE kind=s->>'kind';
   IF pol.kind IS NULL OR s-'id'-'kind'-'depends_on'-'input'<>'{}' OR coalesce(s->>'id','')!~'^[a-z][a-z0-9_]{0,39}$' OR s->>'id'=ANY(seen) OR jsonb_typeof(s->'depends_on') IS DISTINCT FROM 'array' OR jsonb_typeof(s->'input') IS DISTINCT FROM 'object' OR octet_length((s->'input')::text)>12000 OR NOT agent_v2_safe_json(s->'input') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
   FOR dep IN SELECT jsonb_array_elements_text(s->'depends_on') LOOP
    IF NOT dep=ANY(seen) THEN RAISE EXCEPTION 'invalid_dependency'; END IF;
   END LOOP;
   -- Bindings are direct typed ID slots only; never templates, nested code or expressions.
   FOR b IN SELECT key,value FROM jsonb_each(s->'input') WHERE jsonb_typeof(value)='object' AND value ? 'step' LOOP
    IF b.key NOT IN ('id','task_id','session_id','project_id') OR b.value-'step'-'alias'<>'{}' OR b.value->>'alias'<>'id' OR NOT (s->'depends_on' ? (b.value->>'step')) THEN RAISE EXCEPTION 'invalid_binding'; END IF;
   END LOOP;
   seen:=array_append(seen,s->>'id'); needs:=needs OR pol.approval OR pol.effect='external_write';
  END LOOP;
  INSERT INTO agent_v2_workflows(user_id,request_key,instruction,plan,plan_hash,source,chat_ref,state,approval_expires_at,approved_at)
  VALUES(p_uid,p_key,original,p_input->'steps',h,src,p_chat,CASE WHEN needs THEN 'awaiting_confirmation' ELSE 'ready' END,clock_timestamp()+interval '10 minutes',CASE WHEN needs THEN NULL ELSE clock_timestamp() END) RETURNING * INTO w;
  FOR s IN SELECT value FROM jsonb_array_elements(w.plan) LOOP
   INSERT INTO agent_v2_workflow_steps(workflow_id,id,user_id,ordinal,kind,depends_on,input,permission_decision) VALUES(w.id,s->>'id',p_uid,i,s->>'kind',ARRAY(SELECT jsonb_array_elements_text(s->'depends_on')),s->'input',CASE WHEN needs THEN 'approval_required' ELSE 'local_allowed' END);i:=i+1;
  END LOOP;
 ELSIF a='list' THEN
  IF p_input-'action'-'limit'<>'{}' OR coalesce((p_input->>'limit')::integer,50) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_request'; END IF;
  RETURN jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT id,state,version,plan_hash,created_at,updated_at FROM agent_v2_workflows WHERE user_id=p_uid ORDER BY created_at DESC,id LIMIT coalesce((p_input->>'limit')::integer,50)) x));
 ELSE
  SELECT * INTO w FROM agent_v2_workflows WHERE id=(p_input->>'id')::uuid AND user_id=p_uid FOR UPDATE;
  IF w.id IS NULL THEN RAISE EXCEPTION 'workflow_not_found'; END IF;
  IF a='confirm' THEN
   IF p_input-'action'-'id'-'approval_id'-'expected_plan_hash'-'confirm'<>'{}' OR p_input->'confirm' IS DISTINCT FROM 'true'::jsonb OR w.state<>'awaiting_confirmation' OR w.approved_at IS NOT NULL OR w.approval_expires_at<=clock_timestamp() OR w.approval_id::text IS DISTINCT FROM p_input->>'approval_id' OR w.plan_hash IS DISTINCT FROM p_input->>'expected_plan_hash' OR w.source<>src OR w.chat_ref IS DISTINCT FROM p_chat OR (src='telegram' AND original IS DISTINCT FROM 'confirm v2 '||w.approval_id::text) THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
   UPDATE agent_v2_workflows SET state='ready',approved_at=clock_timestamp(),version=version+1 WHERE id=w.id;
   UPDATE agent_v2_workflow_steps SET permission_decision='approved_plan' WHERE workflow_id=w.id;
  ELSIF a='cancel' THEN
   IF p_input-'action'-'id'<>'{}' THEN RAISE EXCEPTION 'invalid_request'; END IF;
   UPDATE agent_v2_workflows SET state='cancelled',version=version+1 WHERE id=w.id AND state<>'completed';
   UPDATE agent_v2_workflow_steps SET status='cancelled' WHERE workflow_id=w.id AND status IN ('pending','failed','blocked');
  ELSIF a NOT IN ('get','run','resume') OR p_input-'action'-'id'<>'{}' THEN RAISE EXCEPTION 'invalid_request';
  END IF;
 END IF;
 RETURN agent_v2_workflow_view(p_uid,w.id);
END $$;

CREATE FUNCTION public.agent_v2_workflow_claim(p_uid uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.agent_v2_workflows; s public.agent_v2_workflow_steps; stamp timestamptz;
BEGIN
 PERFORM learning_assert_user(p_uid);stamp:=clock_timestamp();
 SELECT * INTO w FROM agent_v2_workflows WHERE id=p_id AND user_id=p_uid FOR UPDATE;
 IF w.id IS NULL THEN RAISE EXCEPTION 'workflow_not_found'; END IF;
 -- A future external kind may be installed only with its real service adapter. Expiry is never replay authority.
 UPDATE agent_v2_workflow_steps st SET status=CASE WHEN p.effect='external_write' THEN 'uncertain' WHEN w.state='cancelled' THEN 'cancelled' WHEN attempts>=3 THEN 'dead_letter' ELSE 'pending' END,lease_token=NULL,lease_deadline=NULL,error_code='lease_expired' FROM agent_v2_kind_policy p WHERE st.workflow_id=p_id AND p.kind=st.kind AND st.status='claimed' AND st.lease_deadline<=stamp;
 IF EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='uncertain') THEN UPDATE agent_v2_workflows SET state='uncertain' WHERE id=p_id; RETURN NULL; END IF;
 IF w.state IN ('awaiting_confirmation','cancelled','completed','uncertain','dead_letter') THEN RETURN NULL; END IF;
 UPDATE agent_v2_workflow_steps st SET status='blocked' WHERE workflow_id=p_id AND status='pending' AND EXISTS(SELECT 1 FROM agent_v2_workflow_steps d WHERE d.workflow_id=p_id AND d.id=ANY(st.depends_on) AND d.status IN ('dead_letter','blocked','cancelled','uncertain'));
 SELECT * INTO s FROM agent_v2_workflow_steps st WHERE workflow_id=p_id AND status IN ('pending','failed') AND attempts<3 AND (next_attempt_at IS NULL OR next_attempt_at<=stamp) AND NOT EXISTS(SELECT 1 FROM agent_v2_workflow_steps d WHERE d.workflow_id=p_id AND d.id=ANY(st.depends_on) AND d.status<>'succeeded') ORDER BY ordinal LIMIT 1 FOR UPDATE;
 IF s.id IS NULL THEN RETURN NULL; END IF;
 UPDATE agent_v2_workflow_steps SET status='claimed',attempts=attempts+1,lease_token=gen_random_uuid(),lease_deadline=stamp+interval '60 seconds',updated_at=stamp WHERE workflow_id=p_id AND id=s.id RETURNING * INTO s;
 UPDATE agent_v2_workflows SET state='running',updated_at=stamp WHERE id=p_id;
 RETURN jsonb_build_object('step_id',s.id,'kind',s.kind,'token',s.lease_token,'lease_deadline',s.lease_deadline,'attempt',s.attempts);
END $$;

REVOKE ALL ON FUNCTION public.agent_v2_workflow_view(uuid,uuid),public.agent_v2_workflow(uuid,text,jsonb,text,text,text),public.agent_v2_workflow_claim(uuid,uuid),public.agent_v2_workflow_finish(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_workflow(uuid,text,jsonb,text,text,text),public.agent_v2_workflow_claim(uuid,uuid),public.agent_v2_workflow_finish(uuid,uuid,text,uuid) TO authenticated,service_role;