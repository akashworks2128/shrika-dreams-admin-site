-- Ensures the existing Project image Storage bucket exists.
-- This does NOT change projects RLS, project_images RLS, or the image_type CHECK constraint.
-- Run once in Supabase SQL Editor (or through your normal migrations).

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
