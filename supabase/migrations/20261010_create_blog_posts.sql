-- Blog Management: creates the blog_posts table used by /dashboard/blog.
-- Review, then run once in the Supabase SQL Editor. It only creates a NEW
-- table (plus policies/trigger on it); no existing table is touched.
-- Images reuse the existing public "project-images" bucket under blog/<post-id>/,
-- so no new storage bucket or storage policy is needed.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  slug text not null unique,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb, -- Tiptap JSON
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_updated_at_idx on public.blog_posts (updated_at desc);

create or replace function public.blog_posts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row execute function public.blog_posts_set_updated_at();

alter table public.blog_posts enable row level security;

grant select on table public.blog_posts to anon;
grant select, insert, update, delete on table public.blog_posts to authenticated;

-- Public website: published posts only.
drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
on public.blog_posts for select to anon
using (is_published = true);

-- Signed-in admins: full access (same convention as project_images).
drop policy if exists "Authenticated can manage blog posts" on public.blog_posts;
create policy "Authenticated can manage blog posts"
on public.blog_posts for all to authenticated
using (true) with check (true);
