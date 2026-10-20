-- Security hardening for Shrika Dreams Admin.
-- Review before running. Requires public.admin_users(user_id uuid) to exist.
-- Does not delete or alter business data; changes access policies only.

-- Create the admin predicate only if it does not already exist.
do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    execute $fn$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1 from public.admin_users au
          where au.user_id = (select auth.uid())
        )
      $body$
    $fn$;
    revoke all on function public.is_admin() from public;
  end if;
end
$$;

grant execute on function public.is_admin() to authenticated;

-- blog_posts: public can read published posts; only listed admins can write.
drop policy if exists "Authenticated can manage blog posts" on public.blog_posts;
drop policy if exists "Admin select all blog_posts" on public.blog_posts;
drop policy if exists "Admin insert all blog_posts" on public.blog_posts;
drop policy if exists "Admin update all blog_posts" on public.blog_posts;
drop policy if exists "Admin delete all blog_posts" on public.blog_posts;
create policy "Admin select all blog_posts" on public.blog_posts
  for select to authenticated using ((select public.is_admin()));
create policy "Admin insert all blog_posts" on public.blog_posts
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admin update all blog_posts" on public.blog_posts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admin delete all blog_posts" on public.blog_posts
  for delete to authenticated using ((select public.is_admin()));

-- project-images storage bucket: public read remains enabled; writes are admin-only.
drop policy if exists "Authenticated can upload project image files" on storage.objects;
drop policy if exists "Authenticated can update project image files" on storage.objects;
drop policy if exists "Authenticated can delete project image files" on storage.objects;
drop policy if exists "Admin can upload project image files" on storage.objects;
drop policy if exists "Admin can update project image files" on storage.objects;
drop policy if exists "Admin can delete project image files" on storage.objects;
create policy "Admin can upload project image files" on storage.objects
  for insert to authenticated with check (bucket_id = 'project-images' and (select public.is_admin()));
create policy "Admin can update project image files" on storage.objects
  for update to authenticated using (bucket_id = 'project-images' and (select public.is_admin()))
  with check (bucket_id = 'project-images' and (select public.is_admin()));
create policy "Admin can delete project image files" on storage.objects
  for delete to authenticated using (bucket_id = 'project-images' and (select public.is_admin()));

notify pgrst, 'reload schema';
