alter table public.source_documents drop constraint if exists source_documents_status_check;
alter table public.source_documents add constraint source_documents_status_check check (status in ('new','pending','processing','processed','action_needed','failed','archived'));
alter table public.source_documents add column if not exists agent_summary text not null default '';
alter table public.source_documents add column if not exists processed_at timestamptz;
alter table public.recommendations add column if not exists document_id uuid references public.source_documents(id) on delete set null;
create index if not exists recommendations_document_id_idx on public.recommendations(document_id);

create or replace function public.agent_document_result(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_doc public.source_documents; v_id uuid; v_status text; v_summary text;
  c jsonb; a jsonb; n_claims int := 0; n_actions int := 0; v_changed boolean;
begin
  select user_id into v_owner from agent_owner where singleton;
  if v_owner is null then raise exception 'agent_owner_not_bound'; end if;
  v_id := (p->>'id')::uuid;
  v_status := p->>'status';
  v_summary := coalesce(p->>'summary','');
  if v_status not in ('processed','action_needed','failed') then raise exception 'invalid_status'; end if;
  select * into v_doc from source_documents where id = v_id and user_id = v_owner and deleted_at is null for update;
  if not found then raise exception 'document_not_found'; end if;
  v_changed := v_doc.status is distinct from v_status or v_doc.agent_summary is distinct from v_summary;
  -- Only agent result fields change; title, kind, url, storage_path, summary (original content), source stay as-is.
  update source_documents set status = v_status, agent_summary = v_summary,
    processed_at = case when v_changed or processed_at is null then now() else processed_at end,
    provenance = provenance || jsonb_build_object('last_agent_result', now())
  where id = v_id and v_changed;
  for c in select * from jsonb_array_elements(coalesce(p->'uncertain_claims','[]')) loop
    insert into uncertain_claims(user_id, claim, context, source_url, confidence, document_id, status, dedupe_key, source, provenance)
    values (v_owner, c->>'claim', 'From document: ' || v_doc.title, coalesce(c->>'source_url',''), (c->>'confidence')::smallint, v_id, 'open',
            'doc:' || v_id || ':claim:' || md5(lower(trim(c->>'claim'))), 'agent', jsonb_build_object('document_id', v_id))
    on conflict (user_id, dedupe_key) do update set confidence = excluded.confidence, source_url = excluded.source_url, updated_at = now()
      where uncertain_claims.status = 'open';
    n_claims := n_claims + 1;
  end loop;
  for a in select * from jsonb_array_elements(coalesce(p->'proposed_actions','[]')) loop
    insert into recommendations(user_id, kind, title, body, priority, is_inference, source_url, status, dedupe_key, source, provenance, document_id)
    values (v_owner, 'action', a->>'title', coalesce(a->>'body',''), coalesce((a->>'priority')::smallint, 50), true, '', 'new',
            'doc:' || v_id || ':action:' || md5(lower(trim(a->>'title'))), 'agent', jsonb_build_object('document_id', v_id, 'proposed', true), v_id)
    on conflict (user_id, dedupe_key) do update set body = excluded.body, priority = excluded.priority, updated_at = now()
      where recommendations.status = 'new';
    n_actions := n_actions + 1;
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status, 'changed', v_changed, 'uncertain_claims', n_claims, 'proposed_actions', n_actions);
end $$;
revoke all on function public.agent_document_result(jsonb) from public, anon, authenticated;
grant execute on function public.agent_document_result(jsonb) to service_role;
