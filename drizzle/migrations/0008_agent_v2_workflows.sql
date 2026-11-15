-- Durable plans are owner-only retained execution records; no credentials/provider payloads.
CREATE TABLE public.agent_v2_kind_policy(kind text PRIMARY KEY,effect text NOT NULL CHECK(effect IN ('local','read','external_write')),approval boolean NOT NULL);
INSERT INTO public.agent_v2_kind_policy VALUES ('task.create','local',false),('task.update','local',false),('focus.transition','local',false),('memory.put','local',false),('memory.confirm','local',true),('document.register','local',false);
CREATE TABLE public.agent_v2_workflows(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),request_key text NOT NULL,
 instruction text NOT NULL,plan jsonb NOT NULL,preview jsonb NOT NULL,plan_hash text NOT NULL,source text NOT NULL CHECK(source IN ('web','telegram')),chat_ref text,
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
DECLARE w public.agent_v2_workflows; s public.agent_v2_workflow_steps; inp jsonb; b record; linked jsonb; outcome jsonb; stamp timestamptz; journal text; err text; oldrow jsonb; matches integer;
BEGIN
 PERFORM learning_assert_user(p_uid);
 -- Owner admission precedes task/time and workflow rows; never acquire legacy advisory lock 713.
 SELECT * INTO w FROM agent_v2_workflows WHERE id=p_id AND user_id=p_uid;
 SELECT * INTO s FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND id=p_step AND user_id=p_uid;
 IF w.id IS NULL OR s.id IS NULL THEN RAISE EXCEPTION 'workflow_not_found'; END IF;
 IF s.status='succeeded' AND s.lease_token=p_token THEN RETURN agent_v2_workflow_view(p_uid,p_id); END IF;
 stamp:=clock_timestamp();
 IF s.status<>'claimed' OR s.lease_token IS DISTINCT FROM p_token OR s.lease_deadline<=stamp THEN RAISE EXCEPTION 'stale_lease'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agent_v2_kind_policy WHERE kind=s.kind AND effect='local') THEN RAISE EXCEPTION 'trusted_provider_required'; END IF;
 IF w.source='telegram' AND s.permission_decision='local_allowed' AND EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=w.chat_ref AND expires_at>stamp) THEN
  UPDATE agent_v2_workflow_steps SET status='pending',lease_token=NULL,lease_deadline=NULL,permission_decision='approval_required' WHERE workflow_id=p_id AND id=p_step;
  UPDATE agent_v2_workflows SET state='awaiting_confirmation',approved_at=NULL,approval_expires_at=stamp+interval '10 minutes' WHERE id=p_id;
  RETURN agent_v2_workflow_view(p_uid,p_id);
 END IF;

 inp:=s.input;
 FOR b IN SELECT key,value FROM jsonb_each(inp) WHERE key IN ('id','task_id','session_id','project_id','topic_id') AND jsonb_typeof(value)='object' AND value ? 'step' LOOP
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
   IF s.kind='task.create' THEN
    SELECT count(*) INTO matches FROM tasks WHERE user_id=p_uid AND deleted_at IS NULL AND agent_v2_normalize(title)=agent_v2_normalize(inp->>'title') AND project_id IS NOT DISTINCT FROM (inp->>'project_id')::uuid;
    IF matches>1 THEN RAISE EXCEPTION 'needs_clarification'; END IF;
    IF matches=1 THEN
     SELECT to_jsonb(t) INTO oldrow FROM tasks t WHERE user_id=p_uid AND deleted_at IS NULL AND agent_v2_normalize(title)=agent_v2_normalize(inp->>'title') AND project_id IS NOT DISTINCT FROM (inp->>'project_id')::uuid FOR UPDATE;
     IF NOT oldrow @> (inp-'title') THEN RAISE EXCEPTION 'needs_clarification'; END IF;
     outcome:=jsonb_build_object('id',oldrow->'id','updated_at',oldrow->'updated_at','already_exists',true);
    END IF;
   END IF;
   IF outcome IS NULL THEN
    PERFORM set_config('career.control_key',journal,true);
    outcome:=control_apply(p_uid,jsonb_build_array(jsonb_build_object('entity','tasks','action',split_part(s.kind,'.',2),'id',inp->'id','values',inp-'id'-'expected_updated_at')));
    outcome:=jsonb_build_object('id',outcome->0->'record'->'id','updated_at',outcome->0->'record'->'updated_at','already_exists',false);
   END IF;
  ELSIF s.kind='memory.put' THEN
   outcome:=agent_v2_memory(p_uid,journal,inp||'{"action":"put"}');outcome:=jsonb_build_object('id',outcome->'item'->'id','version',outcome->'item'->'version');
  ELSIF s.kind='document.register' THEN
   outcome:=agent_v2_documents(p_uid,journal,inp||'{"action":"register"}');outcome:=jsonb_build_object('id',outcome->'item'->'id','version',outcome->'item'->'version');
  ELSIF s.kind='focus.transition' THEN
   outcome:=agent_v2_focus(p_uid,journal,inp);outcome:=jsonb_build_object('id',outcome->'session'->'id','state',outcome->'session'->'state');
  ELSIF s.kind='memory.confirm' THEN
   IF inp-'key'-'expected_version'<>'{}' THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF NOT EXISTS(SELECT 1 FROM agent_v2_memories m WHERE m.user_id=p_uid AND m.key=agent_v2_normalize(inp->>'key') AND m.version=(inp->>'expected_version')::integer AND agent_v2_preference_valid(m)) THEN RAISE EXCEPTION 'version_conflict'; END IF;
   UPDATE agent_v2_memories SET confirmed=true WHERE user_id=p_uid AND key=agent_v2_normalize(inp->>'key') RETURNING jsonb_build_object('id',id,'version',version) INTO outcome;
  ELSE RAISE EXCEPTION 'unsupported_kind';
  END IF;
  UPDATE agent_v2_workflow_steps SET status='succeeded',result=outcome,error_code=NULL,updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 EXCEPTION WHEN OTHERS THEN
  err:=CASE WHEN SQLERRM IN ('needs_clarification','version_conflict','task_not_found','linked_record_not_found','invalid_request','evidence_required','dependencies_incomplete','record_forgotten','alias_conflict','active_focus_conflict','unsupported_kind') THEN SQLERRM ELSE 'step_rejected' END;
  UPDATE agent_v2_workflow_steps SET status=CASE WHEN attempts>=3 THEN 'dead_letter' ELSE 'failed' END,error_code=err,next_attempt_at=clock_timestamp()+make_interval(secs=>attempts*2),updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 END;
 PERFORM agent_v2_block_dependents(p_id);
 UPDATE agent_v2_workflows SET state=CASE WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='uncertain') THEN 'uncertain' WHEN state='cancelled' THEN state WHEN NOT EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status<>'succeeded') THEN 'completed' WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='dead_letter') THEN 'dead_letter' WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='failed') THEN 'partial' ELSE 'running' END,version=version+1,updated_at=clock_timestamp() WHERE id=p_id;
 RETURN agent_v2_workflow_view(p_uid,p_id);
END $$;


REVOKE ALL ON public.agent_v2_kind_policy FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.agent_v2_workflow_view(p_uid uuid,p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT to_jsonb(w)-'user_id'-'request_key' || jsonb_build_object('reply',CASE WHEN w.state='awaiting_confirmation' THEN 'confirm v2 '||w.approval_id::text ELSE NULL END,'steps',(SELECT coalesce(jsonb_agg(to_jsonb(s)-'user_id'-'workflow_id'-'lease_token' ORDER BY ordinal),'[]') FROM agent_v2_workflow_steps s WHERE workflow_id=w.id AND user_id=p_uid)) FROM agent_v2_workflows w WHERE w.id=p_id AND w.user_id=p_uid
$$;
CREATE FUNCTION public.agent_v2_workflow(p_uid uuid,p_key text,p_input jsonb,p_instruction text,p_chat text DEFAULT NULL,p_message text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text:=p_input->>'action'; w public.agent_v2_workflows; s jsonb; dep text; seen text[]:='{}'; h text; src text; original text; needs boolean; i integer:=0; pol public.agent_v2_kind_policy; b record; preview jsonb:='[]'; fact jsonb;
BEGIN
 PERFORM public.learning_assert_user(p_uid);
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 5 AND 200 OR p_key !~ '^(web|tg):[A-Za-z0-9:._-]+$' OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR octet_length(p_input::text)>100000 THEN RAISE EXCEPTION 'invalid_request'; END IF;
 src:=CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END;
 IF src='telegram' THEN
  IF coalesce(auth.role(),'')<>'service_role' OR p_chat IS NULL OR p_key NOT LIKE 'tg:'||p_chat||':'||p_message||':%' THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
  SELECT text INTO original FROM public.control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND created_at>clock_timestamp()-interval '30 minutes';
  IF original IS NULL THEN RAISE EXCEPTION 'inbound_context_required'; END IF;
 ELSE
  IF auth.role() IS DISTINCT FROM 'authenticated' OR auth.uid() IS DISTINCT FROM p_uid OR p_chat IS NOT NULL OR p_message IS NOT NULL THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
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
  needs:=jsonb_array_length(p_input->'steps')>1 OR (src='telegram' AND EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=p_chat AND expires_at>clock_timestamp()));
  FOR s IN SELECT value FROM jsonb_array_elements(p_input->'steps') LOOP
   SELECT * INTO pol FROM agent_v2_kind_policy WHERE kind=s->>'kind';
   IF pol.kind IS NULL OR s-'id'-'kind'-'depends_on'-'input'<>'{}' OR coalesce(s->>'id','')!~'^[a-z][a-z0-9_]{0,39}$' OR s->>'id'=ANY(seen) OR jsonb_typeof(s->'depends_on') IS DISTINCT FROM 'array' OR jsonb_typeof(s->'input') IS DISTINCT FROM 'object' OR octet_length((s->'input')::text)>12000 OR NOT agent_v2_safe_json(s->'input') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
   FOR dep IN SELECT jsonb_array_elements_text(s->'depends_on') LOOP
    IF NOT dep=ANY(seen) THEN RAISE EXCEPTION 'invalid_dependency'; END IF;
   END LOOP;
   -- Bindings are direct typed ID slots only; never templates, nested code or expressions.
   FOR b IN SELECT key,value FROM jsonb_each(s->'input') WHERE key IN ('id','task_id','session_id','project_id','topic_id') AND jsonb_typeof(value)='object' AND value ? 'step' LOOP
    IF b.key NOT IN ('id','task_id','session_id','project_id','topic_id') OR b.value-'step'-'alias'<>'{}' OR b.value->>'alias' IS DISTINCT FROM 'id' OR NOT (s->'depends_on' ? (b.value->>'step')) THEN RAISE EXCEPTION 'invalid_binding'; END IF;
   END LOOP;
   PERFORM agent_v2_validate_step(s->>'kind',s->'input');
   fact:=NULL;
   IF s->>'kind'='memory.confirm' THEN
    SELECT jsonb_build_object('key',m.key,'value',m.value,'version',m.version,'category',m.category) INTO fact FROM agent_v2_memories m WHERE m.user_id=p_uid AND m.key=agent_v2_normalize(s->'input'->>'key') AND m.version=(s->'input'->>'expected_version')::integer AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>clock_timestamp());
    -- The owner must see the value being promoted: either it already exists at that version, or
    -- a prior step this one depends on puts the same key in this very plan (visible in the preview).
    IF fact IS NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_input->'steps') e WHERE e->>'kind'='memory.put' AND (s->'depends_on') ? (e->>'id') AND agent_v2_normalize(e->'input'->>'key')=agent_v2_normalize(s->'input'->>'key')) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
   END IF;
   preview:=preview||jsonb_build_array(s||CASE WHEN fact IS NOT NULL THEN jsonb_build_object('preference',fact) ELSE '{}'::jsonb END);
   seen:=array_append(seen,s->>'id'); needs:=needs OR pol.approval OR pol.effect='external_write';
  END LOOP;
  INSERT INTO agent_v2_workflows(user_id,request_key,instruction,plan,preview,plan_hash,source,chat_ref,state,approval_expires_at,approved_at)
  VALUES(p_uid,p_key,original,p_input->'steps',preview,h,src,p_chat,CASE WHEN needs THEN 'awaiting_confirmation' ELSE 'ready' END,clock_timestamp()+interval '10 minutes',CASE WHEN needs THEN NULL ELSE clock_timestamp() END) RETURNING * INTO w;
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
   FOR s IN SELECT value FROM jsonb_array_elements(w.plan) LOOP
    IF s->>'kind'='task.update' AND jsonb_typeof(s->'input'->'id')='string' AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=(s->'input'->>'id')::uuid AND user_id=p_uid AND deleted_at IS NULL AND updated_at=(s->'input'->>'expected_updated_at')::timestamptz) THEN RAISE EXCEPTION 'approval_stale_repreview'; END IF;
    IF s->>'kind' IN ('memory.put','memory.confirm') AND s->'input' ? 'expected_version' AND EXISTS(SELECT 1 FROM agent_v2_memories WHERE user_id=p_uid AND key=agent_v2_normalize(s->'input'->>'key') AND (version<>(s->'input'->>'expected_version')::integer OR deleted_at IS NOT NULL OR expires_at<=clock_timestamp())) THEN RAISE EXCEPTION 'approval_stale_repreview'; END IF;
   END LOOP;
   UPDATE agent_v2_workflows SET state='ready',approved_at=clock_timestamp(),version=version+1 WHERE id=w.id;
   UPDATE agent_v2_workflow_steps SET permission_decision='approved_plan' WHERE workflow_id=w.id;
  ELSIF a='cancel' THEN
   IF p_input-'action'-'id'<>'{}' THEN RAISE EXCEPTION 'invalid_request'; END IF;
   -- Cancellation stops unclaimed work but never hides an unknown external outcome or dead letter.
   UPDATE agent_v2_workflows SET state='cancelled',version=version+1 WHERE id=w.id AND state NOT IN ('completed','uncertain','dead_letter');
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
 IF w.source='telegram' AND w.state IN ('ready','running','partial') AND EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=w.chat_ref AND expires_at>stamp) AND EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND permission_decision='local_allowed' AND status IN ('pending','failed')) THEN
  UPDATE agent_v2_workflows SET state='awaiting_confirmation',approved_at=NULL,approval_expires_at=stamp+interval '10 minutes' WHERE id=p_id;
  UPDATE agent_v2_workflow_steps SET permission_decision='approval_required' WHERE workflow_id=p_id AND status IN ('pending','failed');RETURN NULL;
 END IF;
 -- A future external kind may be installed only with its real service adapter. Expiry is never replay authority.
 UPDATE agent_v2_workflow_steps st SET status=CASE WHEN p.effect='external_write' THEN 'uncertain' WHEN w.state='cancelled' THEN 'cancelled' WHEN attempts>=3 THEN 'dead_letter' ELSE 'pending' END,lease_token=NULL,lease_deadline=NULL,next_attempt_at=stamp+make_interval(secs=>attempts*2),error_code='lease_expired' FROM agent_v2_kind_policy p WHERE st.workflow_id=p_id AND p.kind=st.kind AND st.status='claimed' AND st.lease_deadline<=stamp;
 PERFORM agent_v2_block_dependents(p_id);
 IF EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='uncertain') THEN UPDATE agent_v2_workflows SET state='uncertain' WHERE id=p_id; RETURN NULL; END IF;
 -- A dead letter halts new claims, as when finish exhausts attempts.
 IF EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='dead_letter') THEN UPDATE agent_v2_workflows SET state=CASE WHEN state='cancelled' THEN state ELSE 'dead_letter' END WHERE id=p_id; RETURN NULL; END IF;
 IF w.state IN ('awaiting_confirmation','cancelled','completed','uncertain','dead_letter') THEN RETURN NULL; END IF;
 PERFORM agent_v2_block_dependents(p_id);
 SELECT * INTO s FROM agent_v2_workflow_steps st WHERE workflow_id=p_id AND status IN ('pending','failed') AND attempts<3 AND (next_attempt_at IS NULL OR next_attempt_at<=stamp) AND NOT EXISTS(SELECT 1 FROM agent_v2_workflow_steps d WHERE d.workflow_id=p_id AND d.id=ANY(st.depends_on) AND d.status<>'succeeded') ORDER BY ordinal LIMIT 1 FOR UPDATE;
 IF s.id IS NULL THEN RETURN NULL; END IF;
 UPDATE agent_v2_workflow_steps SET status='claimed',attempts=attempts+1,lease_token=gen_random_uuid(),lease_deadline=stamp+interval '60 seconds',updated_at=stamp WHERE workflow_id=p_id AND id=s.id RETURNING * INTO s;
 UPDATE agent_v2_workflows SET state='running',updated_at=stamp WHERE id=p_id;
 RETURN jsonb_build_object('step_id',s.id,'kind',s.kind,'token',s.lease_token,'lease_deadline',s.lease_deadline,'attempt',s.attempts);
END $$;

REVOKE ALL ON FUNCTION public.agent_v2_workflow_view(uuid,uuid),public.agent_v2_workflow(uuid,text,jsonb,text,text,text),public.agent_v2_workflow_claim(uuid,uuid),public.agent_v2_workflow_finish(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_workflow(uuid,text,jsonb,text,text,text),public.agent_v2_workflow_claim(uuid,uuid),public.agent_v2_workflow_finish(uuid,uuid,text,uuid) TO authenticated,service_role;

ALTER TABLE public.agent_v2_memories DROP CONSTRAINT agent_v2_memories_confirmed_check;
CREATE FUNCTION public.agent_v2_preference_valid(m public.agent_v2_memories) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF m.category<>'preference' OR m.deleted_at IS NOT NULL OR m.expires_at<=clock_timestamp() OR jsonb_typeof(m.value) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 CASE m.key
 WHEN 'reminder_default_time' THEN RETURN (m.value#>>'{}') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';
 WHEN 'preferred_doc_format' THEN RETURN (m.value#>>'{}') IN ('plain_text','bullets','sections');
 WHEN 'default_project_id' THEN RETURN EXISTS(SELECT 1 FROM projects WHERE id=(m.value#>>'{}')::uuid AND user_id=m.user_id AND deleted_at IS NULL);
 WHEN 'default_document_id' THEN RETURN EXISTS(SELECT 1 FROM agent_v2_documents_registry WHERE id=(m.value#>>'{}')::uuid AND user_id=m.user_id AND deleted_at IS NULL);
 ELSE RETURN false;
 END CASE;
 EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END $$;
CREATE FUNCTION public.agent_v2_memory_revoke() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN IF NEW.version<>OLD.version OR NEW.value IS DISTINCT FROM OLD.value OR NEW.category<>OLD.category OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN NEW.confirmed:=false; END IF; RETURN NEW; END $$;
CREATE TRIGGER agent_v2_memory_revoke BEFORE UPDATE ON public.agent_v2_memories FOR EACH ROW EXECUTE FUNCTION public.agent_v2_memory_revoke();

-- Only a trusted reader calls this after actual external content entered an owned private chat.
CREATE FUNCTION public.agent_v2_mark_source_exposure(p_uid uuid,p_chat text,p_provenance uuid,p_hash text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM learning_assert_user(p_uid);
 IF coalesce(auth.role(),'')<>'service_role' OR p_chat !~ '^[a-f0-9]{64}$' OR p_hash !~ '^[a-f0-9]{64}$' OR p_provenance IS NULL OR NOT EXISTS(SELECT 1 FROM control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND created_at>clock_timestamp()-interval '30 minutes') THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
 INSERT INTO agent_v2_source_exposures VALUES(p_uid,p_chat,p_provenance,p_hash,clock_timestamp(),clock_timestamp()+interval '30 minutes') ON CONFLICT(user_id,chat_ref) DO UPDATE SET provenance_id=EXCLUDED.provenance_id,content_hash=EXCLUDED.content_hash,observed_at=EXCLUDED.observed_at,expires_at=EXCLUDED.expires_at;
END $$;
CREATE FUNCTION public.agent_v2_source_guard(p_uid uuid,p_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM learning_assert_user(p_uid);
 -- Actual signed-in browser is a separate owner surface. A service-role web key is not.
 IF auth.role()='authenticated' AND auth.uid()=p_uid AND p_key LIKE 'web:%' THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'source_approval_required'; END IF;
END $$;
ALTER FUNCTION public.agent_v2_memory(uuid,text,jsonb) RENAME TO agent_v2_memory_core;
ALTER FUNCTION public.agent_v2_documents(uuid,text,jsonb) RENAME TO agent_v2_documents_core;
ALTER FUNCTION public.agent_v2_focus(uuid,text,jsonb) RENAME TO agent_v2_focus_core;
ALTER FUNCTION public.agent_v2_instruction(uuid,text,jsonb,text) RENAME TO agent_v2_instruction_core;
CREATE FUNCTION public.agent_v2_memory(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r jsonb; eligible boolean; items jsonb;
BEGIN
 IF p_input->>'action' IN ('put','forget') THEN PERFORM agent_v2_source_guard(p_uid,p_key); END IF;
 r:=agent_v2_memory_core(p_uid,p_key,p_input);
 SELECT coalesce(m.confirmed AND agent_v2_preference_valid(m),false) INTO eligible FROM agent_v2_memories m WHERE m.user_id=p_uid AND m.id=(r->'item'->>'id')::uuid;
 IF r ? 'items' THEN
  SELECT coalesce(jsonb_agg(x.value||jsonb_build_object('operational',coalesce(m.confirmed AND agent_v2_preference_valid(m),false)) ORDER BY m.key),'[]') INTO items FROM jsonb_array_elements(r->'items') x LEFT JOIN agent_v2_memories m ON m.id=(x.value->>'id')::uuid AND m.user_id=p_uid;
  r:=jsonb_set(r,'{items}',items);
 END IF;
 RETURN r||jsonb_build_object('operational',coalesce(eligible,false));
END $$;
CREATE FUNCTION public.agent_v2_documents(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF p_input->>'action' IN ('register','update','forget') THEN PERFORM agent_v2_source_guard(p_uid,p_key); END IF; RETURN agent_v2_documents_core(p_uid,p_key,p_input); END $$;
CREATE FUNCTION public.agent_v2_focus(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN IF p_input->>'action'<>'status' THEN PERFORM agent_v2_source_guard(p_uid,p_key); END IF; RETURN agent_v2_focus_core(p_uid,p_key,p_input); END $$;
CREATE FUNCTION public.agent_v2_instruction(p_uid uuid,p_key text,p_input jsonb,p_chat text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN PERFORM agent_v2_source_guard(p_uid,p_key); RETURN agent_v2_instruction_core(p_uid,p_key,p_input,p_chat); END $$;
-- Preserve the exact V1 confirmation and journal implementation, changing only its decision predicate.
DO $$ DECLARE body text; BEGIN
 body:=pg_get_functiondef('public.control_execute(uuid,text,text,text,jsonb,uuid)'::regprocedure);
 IF strpos(body,'needs:=jsonb_array_length(p_ops)>1;')=0 THEN RAISE EXCEPTION 'control_execute_definition_changed'; END IF;
 body:=replace(body,'needs:=jsonb_array_length(p_ops)>1;','needs:=jsonb_array_length(p_ops)>1 OR EXISTS(SELECT 1 FROM public.agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=p_chat AND expires_at>clock_timestamp());');
 EXECUTE body;
 -- Approved immutable local steps use private core functions, never a caller-controlled bypass flag.
 body:=pg_get_functiondef('public.agent_v2_workflow_finish(uuid,uuid,text,uuid)'::regprocedure);
 IF strpos(body,'agent_v2_memory(p_uid')=0 OR strpos(body,'agent_v2_documents(p_uid')=0 OR strpos(body,'agent_v2_focus(p_uid')=0 THEN RAISE EXCEPTION 'workflow_finish_definition_changed'; END IF;
 body:=replace(replace(replace(body,'agent_v2_memory(p_uid','agent_v2_memory_core(p_uid'),'agent_v2_documents(p_uid','agent_v2_documents_core(p_uid'),'agent_v2_focus(p_uid','agent_v2_focus_core(p_uid');
 EXECUTE body;
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_preference_valid(public.agent_v2_memories),public.agent_v2_memory_revoke(),public.agent_v2_mark_source_exposure(uuid,text,uuid,text),public.agent_v2_source_guard(uuid,text),public.agent_v2_memory_core(uuid,text,jsonb),public.agent_v2_documents_core(uuid,text,jsonb),public.agent_v2_focus_core(uuid,text,jsonb),public.agent_v2_instruction_core(uuid,text,jsonb,text),public.agent_v2_memory(uuid,text,jsonb),public.agent_v2_documents(uuid,text,jsonb),public.agent_v2_focus(uuid,text,jsonb),public.agent_v2_instruction(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_memory(uuid,text,jsonb),public.agent_v2_documents(uuid,text,jsonb),public.agent_v2_focus(uuid,text,jsonb),public.agent_v2_instruction(uuid,text,jsonb,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_mark_source_exposure(uuid,text,uuid,text) TO service_role;

CREATE FUNCTION public.agent_v2_validate_step(k text,x jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE allowed text[]; required text[]; f text; v jsonb;
BEGIN
 CASE k
 WHEN 'task.create' THEN allowed:=ARRAY['title','description','project_id','type','priority'];required:=ARRAY['title'];
 WHEN 'task.update' THEN allowed:=ARRAY['id','expected_updated_at','title','description','project_id','type','priority','status'];required:=ARRAY['id','expected_updated_at'];
 WHEN 'memory.put' THEN allowed:=ARRAY['key','category','value','expected_version','ttl_hours'];required:=ARRAY['key','category','value'];
 WHEN 'memory.confirm' THEN allowed:=ARRAY['key','expected_version'];required:=allowed;
 WHEN 'document.register' THEN allowed:=ARRAY['file_id','kind','title','category','aliases','project_id','topic_id','parent_folder_id','permitted_operations'];required:=ARRAY['file_id','kind','title','category'];
 WHEN 'focus.transition' THEN
  IF x->>'action'='start' THEN allowed:=ARRAY['action','task_id'];ELSIF x->>'action'='finish' THEN allowed:=ARRAY['action','session_id','complete'];ELSIF x->>'action' IN ('pause','resume','cancel') THEN allowed:=ARRAY['action','session_id']; ELSE RAISE EXCEPTION 'invalid_plan'; END IF;required:=allowed;
 ELSE RAISE EXCEPTION 'unsupported_kind';
 END CASE;
 IF x-allowed<>'{}' OR NOT x ?& required THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 FOREACH f IN ARRAY ARRAY['id','task_id','session_id','project_id','topic_id'] LOOP
  IF x ? f AND x->f<>'null' THEN
   v:=x->f;
   IF jsonb_typeof(v)='string' THEN PERFORM (v#>>'{}')::uuid;
   ELSIF jsonb_typeof(v)<>'object' OR v-'step'-'alias'<>'{}' OR v->>'alias' IS DISTINCT FROM 'id' OR coalesce(v->>'step','')!~'^[a-z][a-z0-9_]{0,39}$' THEN RAISE EXCEPTION 'invalid_binding'; END IF;
  END IF;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['title','description','key','category','file_id','kind','type','priority','status','expected_updated_at'] LOOP
  IF x ? f AND (jsonb_typeof(x->f) IS DISTINCT FROM 'string' OR length(x->>f)>CASE WHEN f='description' THEN 4000 WHEN f='title' THEN 500 ELSE 200 END OR length(trim(x->>f))=0) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 END LOOP;
 IF x ? 'expected_updated_at' THEN PERFORM (x->>'expected_updated_at')::timestamptz; END IF;
 IF x ? 'expected_version' AND (jsonb_typeof(x->'expected_version')<>'number' OR (x->>'expected_version')::integer NOT BETWEEN 1 AND 999999999) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 IF x ? 'complete' AND jsonb_typeof(x->'complete')<>'boolean' THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 IF k='memory.confirm' AND x->>'key' NOT IN ('reminder_default_time','default_project_id','default_document_id','preferred_doc_format') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 IF k='memory.put' AND (x->>'category' NOT IN ('preference','project','knowledge','conversation','execution') OR length(x->>'key')>100) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 IF k='document.register' AND (x->>'kind' NOT IN ('doc','sheet','folder') OR x->>'file_id' !~ '^[A-Za-z0-9_-]{10,200}$') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 IF k='document.register' THEN
  IF length(x->>'title')>200 OR length(x->>'category')>100 THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  IF x ? 'aliases' AND (jsonb_typeof(x->'aliases')<>'array' OR jsonb_array_length(x->'aliases')>12 OR EXISTS(SELECT 1 FROM jsonb_array_elements(x->'aliases') a WHERE jsonb_typeof(a)<>'string' OR length(trim(a#>>'{}')) NOT BETWEEN 1 AND 100)) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  IF x ? 'permitted_operations' AND (jsonb_typeof(x->'permitted_operations')<>'array' OR jsonb_array_length(x->'permitted_operations') NOT BETWEEN 1 AND 4 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(x->'permitted_operations') a WHERE a NOT IN ('read','append','update','create_child'))) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
 END IF;
 IF k LIKE 'task.%' THEN
  FOREACH f IN ARRAY ARRAY['type','priority','status'] LOOP
   IF x ? f AND NOT EXISTS(SELECT 1 FROM control_registry WHERE entity='tasks' AND definition->'fields'->f->'enum' ? (x->>f)) THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  END LOOP;
 END IF;
END $$;
CREATE FUNCTION public.agent_v2_confirm_telegram(p_uid uuid,p_key text,p_approval uuid,p_chat text,p_message text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.agent_v2_workflows;
BEGIN
 PERFORM learning_assert_user(p_uid);
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
 SELECT * INTO w FROM agent_v2_workflows WHERE user_id=p_uid AND approval_id=p_approval AND source='telegram' AND chat_ref=p_chat;
 IF w.id IS NULL THEN RAISE EXCEPTION 'invalid_confirmation'; END IF;
 RETURN agent_v2_workflow(p_uid,p_key,jsonb_build_object('action','confirm','id',w.id,'approval_id',w.approval_id,'expected_plan_hash',w.plan_hash,'confirm',true),NULL,p_chat,p_message);
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_validate_step(text,jsonb),public.agent_v2_confirm_telegram(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_confirm_telegram(uuid,text,uuid,text,text) TO service_role;

-- Infrastructure for subsequently installed real provider adapters. No network kind is
-- registered here. Only the trusted server adapter may acknowledge verified results.
CREATE FUNCTION public.agent_v2_workflow_provider_finish(p_uid uuid,p_id uuid,p_step text,p_token uuid,p_result jsonb,p_error text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.agent_v2_workflow_steps; effect text;
BEGIN
 PERFORM learning_assert_user(p_uid);
 IF coalesce(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
 SELECT * INTO s FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND id=p_step AND user_id=p_uid FOR UPDATE;
 SELECT p.effect INTO effect FROM agent_v2_kind_policy p WHERE kind=s.kind;
 IF s.id IS NULL OR effect NOT IN ('read','external_write') THEN RAISE EXCEPTION 'unsupported_kind'; END IF;
 IF s.status='succeeded' AND s.lease_token=p_token THEN RETURN agent_v2_workflow_view(p_uid,p_id); END IF;
 IF s.status<>'claimed' OR s.lease_token IS DISTINCT FROM p_token OR s.lease_deadline<=clock_timestamp() THEN RAISE EXCEPTION 'stale_lease'; END IF;
 IF p_error IS NULL THEN
  IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR p_result-'id'-'verification_ref'<>'{}' OR jsonb_typeof(p_result->'id') IS DISTINCT FROM 'string' OR jsonb_typeof(p_result->'verification_ref') IS DISTINCT FROM 'string' OR length(p_result->>'verification_ref') NOT BETWEEN 1 AND 200 OR NOT agent_v2_safe_json(p_result) THEN RAISE EXCEPTION 'invalid_request'; END IF;
  PERFORM (p_result->>'id')::uuid;
  UPDATE agent_v2_workflow_steps SET status='succeeded',result=p_result,error_code=NULL,updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 ELSE
  IF p_result IS NOT NULL OR p_error NOT IN ('provider_rejected','provider_unavailable','provider_uncertain','permission_denied','version_conflict') THEN RAISE EXCEPTION 'invalid_request'; END IF;
  UPDATE agent_v2_workflow_steps SET status=CASE WHEN effect='external_write' THEN 'uncertain' WHEN attempts>=3 THEN 'dead_letter' ELSE 'failed' END,error_code=p_error,next_attempt_at=clock_timestamp()+make_interval(secs=>attempts*2),updated_at=clock_timestamp() WHERE workflow_id=p_id AND id=p_step;
 END IF;
 UPDATE agent_v2_workflows SET state=CASE WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='uncertain') THEN 'uncertain' WHEN state='cancelled' THEN 'cancelled' WHEN NOT EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status<>'succeeded') THEN 'completed' WHEN EXISTS(SELECT 1 FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status='dead_letter') THEN 'dead_letter' WHEN p_error IS NOT NULL THEN 'partial' ELSE 'running' END,version=version+1,updated_at=clock_timestamp() WHERE id=p_id;
 RETURN agent_v2_workflow_view(p_uid,p_id);
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_workflow_provider_finish(uuid,uuid,text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_workflow_provider_finish(uuid,uuid,text,uuid,jsonb,text) TO service_role;

CREATE FUNCTION public.agent_v2_block_dependents(p_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH RECURSIVE doomed(id) AS (
  SELECT id FROM agent_v2_workflow_steps WHERE workflow_id=p_id AND status IN ('dead_letter','blocked','cancelled','uncertain')
  UNION SELECT s.id FROM agent_v2_workflow_steps s JOIN doomed d ON d.id=ANY(s.depends_on) WHERE s.workflow_id=p_id AND s.status IN ('pending','failed')
 ) UPDATE agent_v2_workflow_steps SET status='blocked' WHERE workflow_id=p_id AND status IN ('pending','failed') AND id IN (SELECT id FROM doomed)
$$;
REVOKE ALL ON FUNCTION public.agent_v2_block_dependents(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.agent_v2_control_guard(p_uid uuid,p_chat text,p_message text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM learning_assert_user(p_uid);
 IF coalesce(auth.role(),'')<>'service_role' OR NOT EXISTS(SELECT 1 FROM control_messages WHERE user_id=p_uid AND chat_ref=p_chat AND message_ref=p_message AND created_at>clock_timestamp()-interval '30 minutes') THEN RAISE EXCEPTION 'learning_access_denied'; END IF;
 IF EXISTS(SELECT 1 FROM agent_v2_source_exposures WHERE user_id=p_uid AND chat_ref=p_chat AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'source_approval_required'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_control_guard(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_control_guard(uuid,text,text) TO service_role;
