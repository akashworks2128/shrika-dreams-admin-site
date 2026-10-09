-- Project image Storage RLS fix.
-- Does NOT change public.projects RLS, public.project_images RLS,
-- project permissions, or the project_images image_type CHECK constraint.
-- The Admin uses Supabase Auth, so only authenticated users may write files.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- Public website can display uploaded project files.
drop policy if exists "Public can read project image files" on storage.objects;
create policy "Public can read project image files"
on storage.objects
for select
to public
using (bucket_id = 'project-images');

-- Signed-in Admin users can upload project files.
drop policy if exists "Authenticated can upload project image files" on storage.objects;
create policy "Authenticated can upload project image files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-images');

-- Signed-in Admin users can replace/update project files.
drop policy if exists "Authenticated can update project image files" on storage.objects;
create policy "Authenticated can update project image files"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-images')
with check (bucket_id = 'project-images');

-- Signed-in Admin users can remove project files when images are replaced/deleted.
drop policy if exists "Authenticated can delete project image files" on storage.objects;
create policy "Authenticated can delete project image files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-images');
