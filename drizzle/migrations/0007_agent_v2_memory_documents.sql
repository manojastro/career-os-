-- Owner-serialized registry mutations; remote document access is deliberately unverified.
CREATE TABLE public.agent_v2_memories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN ('preference','project','knowledge','conversation','execution')),
 key text NOT NULL CHECK(length(key) BETWEEN 1 AND 100), value jsonb,
 version integer NOT NULL DEFAULT 1, confirmed boolean NOT NULL DEFAULT false CHECK(NOT confirmed),
 source text NOT NULL CHECK(source IN ('web','telegram')), source_message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, deleted_at timestamptz,
 UNIQUE(user_id,key)
);
CREATE INDEX agent_v2_memories_page ON public.agent_v2_memories(user_id,key) WHERE deleted_at IS NULL;
CREATE TABLE public.agent_v2_documents_registry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 file_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('doc','sheet','folder')), title text NOT NULL, category text NOT NULL,
 project_id uuid REFERENCES public.projects(id), topic_id uuid REFERENCES public.curriculum_topics(id), parent_folder_id text,
 permitted_operations text[] NOT NULL DEFAULT ARRAY['read']::text[], version integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'unverified' CHECK(status='unverified'), last_revision text, last_sync timestamptz,
 source text NOT NULL, source_message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 UNIQUE(user_id,file_id)
);
CREATE INDEX agent_v2_documents_page ON public.agent_v2_documents_registry(user_id,id) WHERE deleted_at IS NULL;
CREATE TABLE public.agent_v2_document_aliases (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, alias text NOT NULL, document_id uuid NOT NULL REFERENCES public.agent_v2_documents_registry(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,alias)
);
CREATE INDEX agent_v2_alias_document ON public.agent_v2_document_aliases(document_id);
-- Hashes detect changed retries without retaining raw memory/document contents.
CREATE TABLE public.agent_v2_registry_receipts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, operation text NOT NULL, request_key text NOT NULL,
 payload_hash text NOT NULL, record_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,operation,request_key)
);
ALTER TABLE public.agent_v2_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_v2_documents_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_v2_document_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_v2_registry_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_v2_memories_read ON public.agent_v2_memories FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY agent_v2_documents_read ON public.agent_v2_documents_registry FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY agent_v2_aliases_read ON public.agent_v2_document_aliases FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY agent_v2_registry_receipts_read ON public.agent_v2_registry_receipts FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.agent_v2_memories,public.agent_v2_documents_registry,public.agent_v2_document_aliases,public.agent_v2_registry_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.agent_v2_memories,public.agent_v2_documents_registry,public.agent_v2_document_aliases,public.agent_v2_registry_receipts TO authenticated;

CREATE FUNCTION public.agent_v2_normalize(p_text text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$ SELECT lower(regexp_replace(btrim(p_text),'\s+',' ','g')) $$;
-- Bounded traversal, conservative common-pattern detection, not a complete secret classifier.
CREATE FUNCTION public.agent_v2_safe_json(p_value jsonb,p_depth integer DEFAULT 0) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE pair record; child jsonb;
BEGIN
 IF p_depth>6 OR p_value IS NULL OR octet_length(p_value::text)>8000 THEN RETURN false; END IF;
 IF jsonb_typeof(p_value)='object' THEN
  FOR pair IN SELECT * FROM jsonb_each(p_value) LOOP
   IF pair.key ~* '(password|passwd|secret|credential|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|private[_ -]?key|authorization|cookie)' OR NOT public.agent_v2_safe_json(pair.value,p_depth+1) THEN RETURN false; END IF;
  END LOOP;
 ELSIF jsonb_typeof(p_value)='array' THEN
  FOR child IN SELECT * FROM jsonb_array_elements(p_value) LOOP IF NOT public.agent_v2_safe_json(child,p_depth+1) THEN RETURN false; END IF; END LOOP;
 ELSIF jsonb_typeof(p_value)='string' AND (p_value #>> '{}') ~* '(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN .*PRIVATE KEY|bearer[[:space:]]+[A-Za-z0-9._-]{12,}|(password|secret|token|api[_ -]?key)[[:space:]]*[:=][[:space:]]*[^[:space:]]+)' THEN RETURN false;
 END IF;
 RETURN true;
END $$;
CREATE FUNCTION public.agent_v2_registry_guard(p_uid uuid,p_key text,p_input jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.learning_assert_user(p_uid);
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 5 AND 200 OR p_key !~ '^(web|tg):[A-Za-z0-9:._-]+$' OR (p_key LIKE 'tg:%' AND coalesce(auth.role(),'')<>'service_role') OR jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR octet_length(p_input::text)>12000 THEN RAISE EXCEPTION 'invalid_request'; END IF;
END $$;

CREATE FUNCTION public.agent_v2_memory(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text:=p_input->>'action'; k text:=public.agent_v2_normalize(p_input->>'key'); cat text:=p_input->>'category'; m public.agent_v2_memories; r public.agent_v2_registry_receipts; h text:=encode(sha256(convert_to(p_input::text,'UTF8')),'hex'); lim integer; items jsonb; ttl integer; stamp timestamptz;
BEGIN
 PERFORM public.agent_v2_registry_guard(p_uid,p_key,p_input);
 stamp:=clock_timestamp();
 IF a IS NULL OR a NOT IN ('list','get','put','forget') OR
 (a='list' AND p_input-'action'-'limit'-'after'-'query'-'category'<>'{}') OR
 (a='get' AND p_input-'action'-'key'<>'{}') OR
 (a='forget' AND p_input-'action'-'key'-'expected_version'<>'{}') OR
 (a='put' AND p_input-'action'-'key'-'category'-'value'-'expected_version'-'ttl_hours'<>'{}') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a<>'list' AND (jsonb_typeof(p_input->'key') IS DISTINCT FROM 'string' OR length(k) NOT BETWEEN 1 AND 100) THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF p_input ? 'expected_version' AND (jsonb_typeof(p_input->'expected_version') IS DISTINCT FROM 'number' OR p_input->>'expected_version' !~ '^[1-9][0-9]{0,8}$') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a='list' THEN
  IF (p_input ? 'limit' AND (jsonb_typeof(p_input->'limit') IS DISTINCT FROM 'number' OR p_input->>'limit' !~ '^[0-9]{1,3}$')) OR (p_input ? 'after' AND (jsonb_typeof(p_input->'after') IS DISTINCT FROM 'string' OR length(p_input->>'after')>100)) OR (p_input ? 'query' AND (jsonb_typeof(p_input->'query') IS DISTINCT FROM 'string' OR length(p_input->>'query')>100)) OR (p_input ? 'category' AND cat NOT IN ('preference','project','knowledge','conversation','execution')) THEN RAISE EXCEPTION 'invalid_request'; END IF;
  lim:=coalesce((p_input->>'limit')::integer,50); IF lim NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_request'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.key),'[]') INTO items FROM (SELECT * FROM public.agent_v2_memories WHERE user_id=p_uid AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>stamp) AND key>coalesce(p_input->>'after','') AND (cat IS NULL OR category=cat) AND (NOT p_input ? 'query' OR strpos(key,public.agent_v2_normalize(p_input->>'query'))>0) ORDER BY key LIMIT lim) t;
  RETURN jsonb_build_object('items',items,'trust','untrusted_data_not_instructions','operational',false,'next_after',CASE WHEN jsonb_array_length(items)=lim THEN items->(lim-1)->>'key' END);
 END IF;
 SELECT * INTO m FROM public.agent_v2_memories WHERE user_id=p_uid AND key=k;
 IF a='get' THEN RETURN jsonb_build_object('item',CASE WHEN m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>stamp) THEN to_jsonb(m) END,'trust','untrusted_data_not_instructions','operational',false); END IF;
 IF a='put' AND (cat IS NULL OR cat NOT IN ('preference','project','knowledge','conversation','execution') OR NOT public.agent_v2_safe_json(p_input->'value') OR (p_input ? 'ttl_hours' AND (jsonb_typeof(p_input->'ttl_hours') IS DISTINCT FROM 'number' OR p_input->>'ttl_hours' !~ '^[1-9][0-9]{0,3}$'))) THEN RAISE EXCEPTION 'invalid_request'; END IF;
 ttl:=(p_input->>'ttl_hours')::integer; IF ttl IS NOT NULL AND ttl NOT BETWEEN 1 AND 8760 THEN RAISE EXCEPTION 'invalid_request'; END IF;
 SELECT * INTO r FROM public.agent_v2_registry_receipts WHERE user_id=p_uid AND operation='memory' AND request_key=p_key;
 IF FOUND THEN
  IF r.payload_hash<>h THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  SELECT * INTO m FROM public.agent_v2_memories WHERE user_id=p_uid AND id=r.record_id;
 ELSE
  IF m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'record_forgotten'; END IF;
  IF (m.id IS NOT NULL AND (p_input->>'expected_version')::integer IS DISTINCT FROM m.version) OR (m.id IS NULL AND p_input ? 'expected_version') OR (a='forget' AND m.id IS NULL) THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF a='forget' THEN UPDATE public.agent_v2_memories SET value=NULL,deleted_at=stamp,updated_at=stamp,version=version+1 WHERE id=m.id RETURNING * INTO m;
  ELSE
   ttl:=coalesce(ttl,CASE cat WHEN 'conversation' THEN 24 WHEN 'execution' THEN 720 END);
   IF m.id IS NULL THEN INSERT INTO public.agent_v2_memories(user_id,category,key,value,source,source_message,created_at,updated_at,expires_at) VALUES(p_uid,cat,k,p_input->'value',CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END,p_key,stamp,stamp,stamp+make_interval(hours=>ttl)) RETURNING * INTO m;
   ELSE UPDATE public.agent_v2_memories SET category=cat,value=p_input->'value',version=version+1,updated_at=stamp,expires_at=stamp+make_interval(hours=>ttl),source=CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END,source_message=p_key WHERE id=m.id RETURNING * INTO m; END IF;
  END IF;
  INSERT INTO public.agent_v2_registry_receipts(user_id,operation,request_key,payload_hash,record_id) VALUES(p_uid,'memory',p_key,h,m.id);
 END IF;
 -- Replay reads current state; no receipt stores an old value. Expired values are redacted.
 RETURN jsonb_build_object('item',CASE WHEN m.expires_at<=stamp AND m.deleted_at IS NULL THEN to_jsonb(m)||'{"value":null}'::jsonb ELSE to_jsonb(m) END,'trust','untrusted_data_not_instructions','operational',false);
END $$;
CREATE FUNCTION public.agent_v2_documents(p_uid uuid,p_key text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a text:=p_input->>'action'; d public.agent_v2_documents_registry; r public.agent_v2_registry_receipts; h text:=encode(sha256(convert_to(p_input::text,'UTF8')),'hex'); items jsonb; aliases jsonb; alias_value text; candidate_count integer; lim integer; merged jsonb; stamp timestamptz;
BEGIN
 PERFORM public.agent_v2_registry_guard(p_uid,p_key,p_input);
 stamp:=clock_timestamp();
 IF a IS NULL OR a NOT IN ('list','resolve','register','update','forget') OR
 (a='list' AND p_input-'action'-'limit'-'after'-'query'<>'{}') OR
 (a='resolve' AND p_input-'action'-'query'<>'{}') OR
 (a='register' AND p_input-'action'-'file_id'-'kind'-'title'-'aliases'-'category'-'project_id'-'topic_id'-'parent_folder_id'-'permitted_operations'<>'{}') OR
 (a='update' AND p_input-'action'-'id'-'expected_version'-'title'-'aliases'-'category'-'project_id'-'topic_id'-'parent_folder_id'-'permitted_operations'<>'{}') OR
 (a='forget' AND p_input-'action'-'id'-'expected_version'<>'{}') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a IN ('list','resolve') THEN
  IF (a='resolve' AND NOT p_input ? 'query') OR (p_input ? 'query' AND (jsonb_typeof(p_input->'query') IS DISTINCT FROM 'string' OR length(btrim(p_input->>'query')) NOT BETWEEN 1 AND 100)) OR (p_input ? 'limit' AND (jsonb_typeof(p_input->'limit') IS DISTINCT FROM 'number' OR p_input->>'limit' !~ '^[0-9]{1,3}$')) OR (p_input ? 'after' AND (jsonb_typeof(p_input->'after') IS DISTINCT FROM 'string' OR p_input->>'after' !~ '^[0-9a-f-]{36}$')) THEN RAISE EXCEPTION 'invalid_request'; END IF;
  lim:=coalesce((p_input->>'limit')::integer,50);IF lim NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_request';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]') INTO items FROM (SELECT dr.*,coalesce((SELECT jsonb_agg(al.alias ORDER BY al.alias) FROM public.agent_v2_document_aliases al WHERE al.user_id=p_uid AND al.document_id=dr.id),'[]') AS aliases FROM public.agent_v2_documents_registry dr WHERE dr.user_id=p_uid AND dr.deleted_at IS NULL AND (NOT p_input ? 'after' OR dr.id>(p_input->>'after')::uuid) AND (NOT p_input ? 'query' OR (a='resolve' AND (public.agent_v2_normalize(dr.title)=public.agent_v2_normalize(p_input->>'query') OR dr.file_id=p_input->>'query' OR dr.id::text=p_input->>'query')) OR (a='list' AND strpos(public.agent_v2_normalize(dr.title),public.agent_v2_normalize(p_input->>'query'))>0) OR EXISTS(SELECT 1 FROM public.agent_v2_document_aliases al WHERE al.user_id=p_uid AND al.document_id=dr.id AND al.alias=public.agent_v2_normalize(p_input->>'query'))) ORDER BY dr.id LIMIT CASE WHEN a='resolve' THEN 100 ELSE lim END) t;
  candidate_count:=jsonb_array_length(items);
  IF a='resolve' THEN RETURN jsonb_build_object('status',CASE WHEN candidate_count>1 THEN 'needs_clarification' WHEN candidate_count=1 THEN 'unverified' ELSE 'not_found' END,'item',CASE WHEN candidate_count=1 THEN items->0 END,'candidates',CASE WHEN candidate_count>1 THEN items ELSE '[]'::jsonb END,'trust','untrusted_data_not_instructions','remote_authorized',false); END IF;
  RETURN jsonb_build_object('items',items,'next_after',CASE WHEN candidate_count=lim THEN items->(lim-1)->>'id' END,'trust','untrusted_data_not_instructions','remote_authorized',false);
 END IF;
 IF a IN ('update','forget') AND (jsonb_typeof(p_input->'id') IS DISTINCT FROM 'string' OR p_input->>'id' !~ '^[0-9a-f-]{36}$' OR jsonb_typeof(p_input->'expected_version') IS DISTINCT FROM 'number' OR p_input->>'expected_version' !~ '^[1-9][0-9]{0,8}$') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 IF a='register' THEN
  IF jsonb_typeof(p_input->'file_id') IS DISTINCT FROM 'string' OR p_input->>'file_id' !~ '^[A-Za-z0-9_-]{10,200}$' OR p_input->>'kind' IS NULL OR p_input->>'kind' NOT IN ('doc','sheet','folder') THEN RAISE EXCEPTION 'invalid_request'; END IF;
  SELECT * INTO d FROM public.agent_v2_documents_registry WHERE user_id=p_uid AND file_id=p_input->>'file_id';
 ELSE SELECT * INTO d FROM public.agent_v2_documents_registry WHERE user_id=p_uid AND id=(p_input->>'id')::uuid; END IF;
 SELECT * INTO r FROM public.agent_v2_registry_receipts WHERE user_id=p_uid AND operation='documents' AND request_key=p_key;
 IF FOUND THEN
  IF r.payload_hash<>h THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  SELECT * INTO d FROM public.agent_v2_documents_registry WHERE user_id=p_uid AND id=r.record_id;
 ELSE
  IF d.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'record_forgotten'; END IF;
  IF a='register' AND d.id IS NOT NULL THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF a IN ('update','forget') AND (d.id IS NULL OR d.version IS DISTINCT FROM (p_input->>'expected_version')::integer) THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF a='forget' THEN
   DELETE FROM public.agent_v2_document_aliases WHERE user_id=p_uid AND document_id=d.id;
   UPDATE public.agent_v2_documents_registry SET deleted_at=stamp,updated_at=stamp,version=version+1 WHERE id=d.id RETURNING * INTO d;
  ELSE
   merged:=CASE WHEN a='register' THEN '{"permitted_operations":["read"]}'::jsonb ELSE to_jsonb(d) END || p_input;
   IF jsonb_typeof(merged->'title') IS DISTINCT FROM 'string' OR length(btrim(merged->>'title')) NOT BETWEEN 1 AND 200 OR jsonb_typeof(merged->'category') IS DISTINCT FROM 'string' OR length(btrim(merged->>'category')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF p_input ? 'aliases' AND (jsonb_typeof(p_input->'aliases') IS DISTINCT FROM 'array' OR jsonb_array_length(p_input->'aliases')>12) THEN RAISE EXCEPTION 'invalid_request'; END IF;
   aliases:=coalesce(p_input->'aliases',CASE WHEN a='register' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(alias ORDER BY alias),'[]') FROM public.agent_v2_document_aliases WHERE user_id=p_uid AND document_id=d.id) END);
   FOR alias_value IN SELECT value::text FROM jsonb_array_elements(aliases) LOOP
    IF jsonb_typeof(alias_value::jsonb)<>'string' OR length(public.agent_v2_normalize(alias_value::jsonb #>> '{}')) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_request'; END IF;
   END LOOP;
   IF (SELECT count(*)<>count(DISTINCT public.agent_v2_normalize(value)) FROM jsonb_array_elements_text(aliases)) THEN RAISE EXCEPTION 'alias_conflict'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(aliases) v JOIN public.agent_v2_document_aliases al ON al.user_id=p_uid AND al.alias=public.agent_v2_normalize(v.value) WHERE al.document_id IS DISTINCT FROM d.id) THEN RAISE EXCEPTION 'alias_conflict'; END IF;
   IF jsonb_typeof(merged->'permitted_operations') IS DISTINCT FROM 'array' OR jsonb_array_length(merged->'permitted_operations') NOT BETWEEN 1 AND 4 OR EXISTS(SELECT 1 FROM jsonb_array_elements(merged->'permitted_operations') v WHERE jsonb_typeof(v.value)<>'string' OR v.value #>> '{}' NOT IN ('read','append','update','create_child')) THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF merged->>'parent_folder_id' IS NOT NULL AND (jsonb_typeof(merged->'parent_folder_id')<>'string' OR merged->>'parent_folder_id' !~ '^[A-Za-z0-9_-]{10,200}$') THEN RAISE EXCEPTION 'invalid_request'; END IF;
   IF merged->>'project_id' IS NOT NULL THEN
    PERFORM 1 FROM public.projects WHERE id=(merged->>'project_id')::uuid AND user_id=p_uid AND deleted_at IS NULL FOR SHARE;IF NOT FOUND THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
   END IF;
   IF merged->>'topic_id' IS NOT NULL THEN
    PERFORM 1 FROM public.curriculum_topics WHERE id=(merged->>'topic_id')::uuid AND user_id=p_uid AND deleted_at IS NULL AND removed_at IS NULL FOR SHARE;IF NOT FOUND THEN RAISE EXCEPTION 'linked_record_not_found'; END IF;
   END IF;
   IF a='register' THEN
    INSERT INTO public.agent_v2_documents_registry(user_id,file_id,kind,title,category,project_id,topic_id,parent_folder_id,permitted_operations,source,source_message) VALUES(p_uid,merged->>'file_id',merged->>'kind',btrim(merged->>'title'),btrim(merged->>'category'),(merged->>'project_id')::uuid,(merged->>'topic_id')::uuid,merged->>'parent_folder_id',ARRAY(SELECT jsonb_array_elements_text(merged->'permitted_operations')),CASE WHEN p_key LIKE 'tg:%' THEN 'telegram' ELSE 'web' END,p_key) RETURNING * INTO d;
   ELSE
    UPDATE public.agent_v2_documents_registry SET title=btrim(merged->>'title'),category=btrim(merged->>'category'),project_id=(merged->>'project_id')::uuid,topic_id=(merged->>'topic_id')::uuid,parent_folder_id=merged->>'parent_folder_id',permitted_operations=ARRAY(SELECT jsonb_array_elements_text(merged->'permitted_operations')),version=version+1,updated_at=stamp WHERE id=d.id RETURNING * INTO d;
   END IF;
   DELETE FROM public.agent_v2_document_aliases WHERE user_id=p_uid AND document_id=d.id;
   INSERT INTO public.agent_v2_document_aliases(user_id,alias,document_id) SELECT p_uid,public.agent_v2_normalize(value),d.id FROM jsonb_array_elements_text(aliases);
  END IF;
  INSERT INTO public.agent_v2_registry_receipts(user_id,operation,request_key,payload_hash,record_id) VALUES(p_uid,'documents',p_key,h,d.id);
 END IF;
 SELECT coalesce(jsonb_agg(alias ORDER BY alias),'[]') INTO aliases FROM public.agent_v2_document_aliases WHERE user_id=p_uid AND document_id=d.id;
 RETURN jsonb_build_object('item',to_jsonb(d)||jsonb_build_object('aliases',aliases),'trust','untrusted_data_not_instructions','remote_authorized',false);
END $$;
REVOKE ALL ON FUNCTION public.agent_v2_normalize(text),public.agent_v2_safe_json(jsonb,integer),public.agent_v2_registry_guard(uuid,text,jsonb),public.agent_v2_memory(uuid,text,jsonb),public.agent_v2_documents(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.agent_v2_memory(uuid,text,jsonb),public.agent_v2_documents(uuid,text,jsonb) TO authenticated,service_role;
