-- Run this in Supabase SQL Editor.
-- If your bucket name is not "photos", replace every "photos" below with the bucket name
-- used by EXPO_PUBLIC_SUPABASE_PROFILE_BUCKET.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

create policy "Public read photos"
on storage.objects
for select
to anon
using (bucket_id = 'photos');

create policy "Anon upload app photos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'photos'
  and (
    name like 'events/%'
    or name like 'news/%'
    or name like 'icon-profiles/%'
  )
);

create policy "Anon update app photos"
on storage.objects
for update
to anon
using (
  bucket_id = 'photos'
  and (
    name like 'events/%'
    or name like 'news/%'
    or name like 'icon-profiles/%'
  )
)
with check (
  bucket_id = 'photos'
  and (
    name like 'events/%'
    or name like 'news/%'
    or name like 'icon-profiles/%'
  )
);
