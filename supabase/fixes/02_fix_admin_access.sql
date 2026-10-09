-- =============================================================================
-- STEP 2 — FIX.  Idempotent: safe to run more than once.
--
-- Goal
--   * Signed-in ADMINS can SELECT / INSERT / UPDATE / DELETE any row of
--     projects, project_configurations and project_images, whatever
--     is_published or status is.
--   * The public website is untouched: it keeps reading only is_published = true
--     through your existing public policy. Nothing here grants anon anything.
--
-- What this does NOT do
--   * Does not disable or enable RLS on any table (enabling it on a table that
--     currently has none could suddenly hide data from the public site).
--   * Does not drop or edit any existing policy. Policies are OR-ed, so adding
--     admin policies is enough; old published-only policies simply stop mattering.
--   * Does not touch columns, s_no, or the schema.
--   * Does not replace an existing is_admin(). It is only created if missing.
--
-- If STEP 1 showed is_admin() living in another schema, or taking arguments,
-- stop and change the three `public.is_admin()` references below to match.
-- =============================================================================

-- 1) is_admin(): create ONLY if no public.is_admin() exists.
--    SECURITY DEFINER so it can read admin_users even if admin_users has RLS.
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
    raise notice 'is_admin() did not exist: created it.';
  else
    raise notice 'is_admin() already exists: left unchanged.';
  end if;
end
$$;

-- The policies below run as the signed-in user, so that role must be allowed
-- to call it. (Harmless: it only answers "is the caller an admin?".)
grant execute on function public.is_admin() to authenticated;

-- 2) Table privileges. A missing UPDATE/DELETE grant is what raises
--    "permission denied for table projects". RLS policies then decide WHICH rows.
grant select, insert, update, delete on table public.projects               to authenticated;
grant select, insert, update, delete on table public.project_configurations to authenticated;
grant select, insert, update, delete on table public.project_images         to authenticated;

-- 3) Admin policies. No is_published / status condition anywhere.
do $$
declare
  t text;
begin
  foreach t in array array['projects', 'project_configurations', 'project_images']
  loop
    execute format('drop policy if exists %I on public.%I', 'Admin select all ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Admin insert all ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Admin update all ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Admin delete all ' || t, t);

    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()))',
      'Admin select all ' || t, t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      'Admin insert all ' || t, t);

    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'Admin update all ' || t, t);

    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      'Admin delete all ' || t, t);
  end loop;
end
$$;

-- 4) Make the API pick up the changes immediately.
notify pgrst, 'reload schema';

-- 5) Result: the admin policies now in place.
select tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
  and policyname like 'Admin % all %'
order by tablename, cmd;
