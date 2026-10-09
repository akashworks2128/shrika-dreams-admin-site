-- Run once in Supabase SQL Editor.
-- Creates the bucket used by the Admin Project image uploader and grants
-- authenticated admins access to image records/files while keeping images
-- publicly readable by the website.

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

-- project_images table access

grant select, insert, update, delete
on table public.project_images
to authenticated;

grant select
on table public.project_images
to anon;

drop policy if exists "Public can read project images" on public.project_images;
create policy "Public can read project images"
on public.project_images
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage project images" on public.project_images;
create policy "Authenticated can manage project images"
on public.project_images
for all
to authenticated
using (true)
with check (true);

-- Storage object access

drop policy if exists "Public can read project image files" on storage.objects;
create policy "Public can read project image files"
on storage.objects
for select
to public
using (bucket_id = 'project-images');

drop policy if exists "Authenticated can upload project image files" on storage.objects;
create policy "Authenticated can upload project image files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-images');

drop policy if exists "Authenticated can update project image files" on storage.objects;
create policy "Authenticated can update project image files"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-images')
with check (bucket_id = 'project-images');

drop policy if exists "Authenticated can delete project image files" on storage.objects;
create policy "Authenticated can delete project image files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-images');

-- Child configuration rows are also deleted before a project row is deleted.
grant select, insert, update, delete
on table public.project_configurations
to authenticated;
