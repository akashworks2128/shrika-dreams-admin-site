-- =============================================================================
-- STEP 1 — READ-ONLY CHECK.  Changes nothing.  Safe to run.
-- Paste into: Supabase Dashboard -> SQL Editor -> Run.
--
-- Shows the real state of RLS, grants, policies, triggers and is_admin() for
-- the three project tables. Send me / read the result before step 2.
--
-- How to read it:
--   1 RLS         rls_enabled=false means policies on that table are ignored.
--   2 GRANT       authenticated MUST have select/insert/update/delete on all
--                 three project tables. "false" for update or delete is exactly
--                 what produces "permission denied for table projects".
--   3 POLICY      look for any UPDATE / DELETE / ALL policy whose USING or CHECK
--                 contains is_published - that is a published-only rule.
--   4 is_admin()  no row = the function does not exist in any schema.
--                 authenticated_can_execute must be true.
--   5 TRIGGER     any trigger that touches another table can raise permission
--                 errors on update/delete.
--   7 COLUMN      authenticated must be able to UPDATE every column.
-- =============================================================================
with t(tbl) as (
  values ('projects'), ('project_configurations'), ('project_images'), ('admin_users')
),
r(role) as (
  values ('anon'), ('authenticated')
)
select '1 RLS' as section,
       c.relname::text as item,
       'rls_enabled=' || c.relrowsecurity || ', forced=' || c.relforcerowsecurity as detail
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (select tbl from t)

union all
select '2 GRANT',
       r.role || ' on ' || t.tbl,
       'select='  || has_table_privilege(r.role, 'public.' || t.tbl, 'SELECT')
    || ', insert=' || has_table_privilege(r.role, 'public.' || t.tbl, 'INSERT')
    || ', update=' || has_table_privilege(r.role, 'public.' || t.tbl, 'UPDATE')
    || ', delete=' || has_table_privilege(r.role, 'public.' || t.tbl, 'DELETE')
from t cross join r
where to_regclass('public.' || t.tbl) is not null

union all
select '3 POLICY',
       p.tablename || ' / ' || p.policyname,
       p.permissive || ' | ' || p.cmd || ' | roles=' || p.roles::text
    || ' | USING: ' || coalesce(p.qual, '-')
    || ' | CHECK: ' || coalesce(p.with_check, '-')
from pg_policies p
where p.schemaname = 'public'
  and p.tablename in (select tbl from t)

union all
select '4 is_admin()',
       p.oid::regprocedure::text,
       'security_definer=' || p.prosecdef
    || ' | authenticated_can_execute=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')
    || E'\n' || pg_get_functiondef(p.oid)
from pg_proc p
where p.proname = 'is_admin'

union all
select '5 TRIGGER',
       tg.tgrelid::regclass::text || ' / ' || tg.tgname,
       pg_get_triggerdef(tg.oid)
from pg_trigger tg
where not tg.tgisinternal
  and tg.tgrelid in (
    'public.projects'::regclass,
    'public.project_configurations'::regclass,
    'public.project_images'::regclass
  )

union all
select '6 ADMINS',
       'admin_users rows',
       (select count(*)::text from public.admin_users)

union all
select '7 COLUMN',
       'authenticated on ' || c.relname,
       'columns with UPDATE: '
    || count(*) filter (where has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE'))
    || ' of ' || count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where c.relname in ('projects', 'project_configurations', 'project_images')
group by c.oid, c.relname

order by 1, 2;
