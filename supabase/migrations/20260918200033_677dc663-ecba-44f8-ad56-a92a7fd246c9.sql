create policy "Users read own evidence files"
on storage.objects for select to authenticated
using (bucket_id = 'career-evidence' and owner = auth.uid());

create policy "Users upload own evidence files"
on storage.objects for insert to authenticated
with check (bucket_id = 'career-evidence' and owner = auth.uid() and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own evidence files"
on storage.objects for update to authenticated
using (bucket_id = 'career-evidence' and owner = auth.uid());

create policy "Users delete own evidence files"
on storage.objects for delete to authenticated
using (bucket_id = 'career-evidence' and owner = auth.uid());
