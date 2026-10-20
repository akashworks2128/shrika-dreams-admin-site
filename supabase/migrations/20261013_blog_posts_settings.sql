-- Blog editor Settings Panel: adds the two missing columns to the EXISTING
-- public.blog_posts table. Safe to run more than once. It does not delete,
-- rewrite or backfill any existing row, and touches no other table.

alter table public.blog_posts
  add column if not exists excerpt jsonb;        -- short summary, stored as Tiptap JSON (null = none)

alter table public.blog_posts
  add column if not exists publish_date date;    -- chosen publish date (null = use created_at)

-- Make Supabase's API pick up the new columns immediately.
notify pgrst, 'reload schema';
