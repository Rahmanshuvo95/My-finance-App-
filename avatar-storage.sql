-- Run once in Supabase SQL Editor to enable private profile photo storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ift-avatars',
  'ift-avatars',
  false,
  2097152,
  array['image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "IFT avatar owner access" on storage.objects;
create policy "IFT avatar owner access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'ift-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'ift-avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
