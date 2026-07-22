-- Family Education Management System private storage setup
-- Run after docs/private-supabase-schema.sql.
-- The app currently stores learning material metadata in public.learning_materials.
-- File body upload will use this private bucket in the next integration step.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'learning-materials',
  'learning-materials',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private no-login version: application code no longer uploads through the
-- service-role admin client. It signs a short-lived JWT carrying family_id /
-- access_role claims (see src/lib/supabase-user-context.ts) and talks to
-- Storage as the "authenticated" role, so these RLS policies are the
-- database-level enforcement boundary. Object paths are always written as
-- "<family_id>/<child_id-or-family>/<filename>" (see
-- src/app/api/private/materials/route.ts), so the first path segment
-- (storage.foldername(name)[1]) is the family_id to match against the JWT.
-- Do not create indexes on storage.objects in Supabase hosted SQL Editor;
-- that system table is owned by Supabase internals.

drop policy if exists "learning materials objects select editor" on storage.objects;
drop policy if exists "learning materials objects insert editor" on storage.objects;
drop policy if exists "learning materials objects delete editor" on storage.objects;

create policy "learning materials objects select editor"
on storage.objects for select
using (
  bucket_id = 'learning-materials'
  and coalesce((auth.jwt() ->> 'family_id')::uuid, null) = (storage.foldername(name))[1]::uuid
  and coalesce(auth.jwt() ->> 'access_role', '') in ('parent', 'caregiver')
);

create policy "learning materials objects insert editor"
on storage.objects for insert
with check (
  bucket_id = 'learning-materials'
  and coalesce((auth.jwt() ->> 'family_id')::uuid, null) = (storage.foldername(name))[1]::uuid
  and coalesce(auth.jwt() ->> 'access_role', '') in ('parent', 'caregiver')
);

create policy "learning materials objects delete editor"
on storage.objects for delete
using (
  bucket_id = 'learning-materials'
  and coalesce((auth.jwt() ->> 'family_id')::uuid, null) = (storage.foldername(name))[1]::uuid
  and coalesce(auth.jwt() ->> 'access_role', '') in ('parent', 'caregiver')
);
