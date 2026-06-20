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

-- Private no-login version uploads through server-side API using service role.
-- Keep the bucket private. Do not add anon upload policies for this pilot.

create index if not exists objects_learning_materials_owner_path_idx
on storage.objects(bucket_id, owner, name)
where bucket_id = 'learning-materials';
