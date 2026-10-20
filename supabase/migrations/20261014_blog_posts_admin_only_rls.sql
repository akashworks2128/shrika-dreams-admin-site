-- Blog security fix: only ADMINS (rows in public.admin_users) may write blog_posts.
--
-- Before this, the policy "Authenticated can manage blog posts" allowed ANY signed-in
-- Supabase user to create/edit/delete posts. This replaces it with an admin-only policy,
-- using the same public.is_admin() helper your projects tables already use
-- (supabase/fixes/02_fix_admin_access.sql). Public read of PUBLISHED posts is unchanged.
-- Safe to run more than once. Touches only public.blog_posts policies.

-- 1) Create public.is_admin() only if it does not exist yet (no-op if you already have it).
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

-- 2) Replace the permissive policy with an admin-only one.
drop policy if exists "Authenticated can manage blog posts" on public.blog_posts;
drop policy if exists "Admins can manage blog posts" on public.blog_posts;
create policy "Admins can manage blog posts"
on public.blog_posts for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

notify pgrst, 'reload schema';
