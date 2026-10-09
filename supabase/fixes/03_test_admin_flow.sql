-- =============================================================================
-- STEP 3 — TEST.  Makes NO permanent change.
--
-- Pretends to be (a) the public website and (b) a signed-in admin, runs your
-- test cases A-G against real rows, then ends with a deliberate error so that
-- Postgres rolls everything back. THE RED "ADMIN PERMISSION TEST REPORT" ERROR
-- AT THE END IS EXPECTED - the report is inside the error text.
--
-- Run it BEFORE step 2 (to see the failure) and AFTER step 2 (to see it pass).
-- Uses the first row of admin_users as the admin, the first published project
-- and the first draft project. Needs at least one of each to test everything.
-- =============================================================================
do $test$
declare
  v_admin  uuid;
  v_pub    uuid;
  v_draft  uuid;
  v_total  int;
  v_seen   int;
  v_n      int;
  v_left   int;
  v_bool   boolean;
  v_report text := '';
  v_labels text[] := '{}';
  v_sqls   text[] := '{}';
  v_exact  boolean[] := '{}';   -- true: must affect exactly 1 row; false: 0 or more is fine
  i        int;
  v_status text;
begin
  select user_id into v_admin from public.admin_users limit 1;
  if v_admin is null then
    raise exception 'admin_users is empty - add your admin user first, nothing to test with';
  end if;
  select id into v_pub   from public.projects where is_published is true     order by created_at limit 1;
  select id into v_draft from public.projects where is_published is not true order by created_at limit 1;
  select count(*) into v_total from public.projects;

  v_report := format(E'Admin used .............. %s\nPublished test project .. %s\nDraft test project ...... %s\n\n',
                     v_admin, coalesce(v_pub::text, 'NONE'), coalesce(v_draft::text, 'NONE'));

  -- ---------------------------------------------------------------- PUBLIC SITE
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);

  v_report := v_report || E'--- PUBLIC WEBSITE (anon) ---\n';
  begin
    select count(*) into v_seen from public.projects where is_published is true;
    v_report := v_report || format(E'sees published projects ........ %s (should be > 0)\n', v_seen);
    select count(*) into v_seen from public.projects where is_published is not true;
    v_report := v_report || format(E'sees DRAFT projects ............ %s (must be 0) %s\n', v_seen,
                                   case when v_seen = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'read blocked: %s %s\n', sqlstate, sqlerrm);
  end;
  begin
    update public.projects set name = name where id = coalesce(v_draft, v_pub);
    get diagnostics v_n = row_count;
    v_report := v_report || format(E'UPDATE rows affected ......... %s (must be 0) %s\n', v_n,
                                   case when v_n = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'UPDATE blocked ............... %s PASS\n', sqlstate);
  end;
  begin
    delete from public.projects where id = coalesce(v_draft, v_pub);
    get diagnostics v_n = row_count;
    v_report := v_report || format(E'DELETE rows affected ......... %s (must be 0) %s\n', v_n,
                                   case when v_n = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'DELETE blocked ............... %s PASS\n', sqlstate);
  end;

  -- ---------------------------------------------------------------------- ADMIN
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('role', 'authenticated', true);

  v_report := v_report || E'\n--- SIGNED-IN ADMIN (authenticated) ---\n';
  begin
    execute 'select public.is_admin()' into v_bool;
    v_report := v_report || format(E'is_admin() returns ........... %s (must be true) %s\n', v_bool,
                                   case when v_bool then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'is_admin() FAILED ............ %s %s\n', sqlstate, sqlerrm);
  end;
  begin
    select count(*) into v_seen from public.projects;
    v_report := v_report || format(E'SELECT sees ................... %s of %s projects %s\n', v_seen, v_total,
                                   case when v_seen = v_total then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'SELECT FAILED ................ %s %s\n', sqlstate, sqlerrm);
  end;

  -- Build the A-G cases. Order matters: C publishes the draft, D unpublishes the
  -- published one, so E deletes a (now) DRAFT project and F a (now) PUBLISHED one.
  if v_pub is not null then
    v_labels := array_append(v_labels, 'A  edit a PUBLISHED project');
    v_sqls   := array_append(v_sqls, format('update public.projects set name = name where id = %L', v_pub));
    v_exact  := array_append(v_exact, true);
  end if;
  if v_draft is not null then
    v_labels := array_append(v_labels, 'B  edit a DRAFT project');
    v_sqls   := array_append(v_sqls, format('update public.projects set name = name where id = %L', v_draft));
    v_exact  := array_append(v_exact, true);

    v_labels := array_append(v_labels, 'C  publish a draft (is_published=true)');
    v_sqls   := array_append(v_sqls, format('update public.projects set is_published = true where id = %L', v_draft));
    v_exact  := array_append(v_exact, true);
  end if;
  if v_pub is not null then
    v_labels := array_append(v_labels, 'D  published -> back to draft (is_published=false)');
    v_sqls   := array_append(v_sqls, format('update public.projects set is_published = false where id = %L', v_pub));
    v_exact  := array_append(v_exact, true);

    v_labels := array_append(v_labels, 'E1 delete DRAFT: its project_images');
    v_sqls   := array_append(v_sqls, format('delete from public.project_images where project_id = %L', v_pub));
    v_exact  := array_append(v_exact, false);
    v_labels := array_append(v_labels, 'E2 delete DRAFT: its project_configurations');
    v_sqls   := array_append(v_sqls, format('delete from public.project_configurations where project_id = %L', v_pub));
    v_exact  := array_append(v_exact, false);
    v_labels := array_append(v_labels, 'E3 delete DRAFT: the project row');
    v_sqls   := array_append(v_sqls, format('delete from public.projects where id = %L', v_pub));
    v_exact  := array_append(v_exact, true);
  end if;
  if v_draft is not null then
    v_labels := array_append(v_labels, 'F1 delete PUBLISHED: its project_images');
    v_sqls   := array_append(v_sqls, format('delete from public.project_images where project_id = %L', v_draft));
    v_exact  := array_append(v_exact, false);
    v_labels := array_append(v_labels, 'F2 delete PUBLISHED: its project_configurations');
    v_sqls   := array_append(v_sqls, format('delete from public.project_configurations where project_id = %L', v_draft));
    v_exact  := array_append(v_exact, false);
    v_labels := array_append(v_labels, 'F3 delete PUBLISHED: the project row');
    v_sqls   := array_append(v_sqls, format('delete from public.projects where id = %L', v_draft));
    v_exact  := array_append(v_exact, true);
  end if;

  if v_pub is null   then v_report := v_report || E'(no published project in the table: A, D, E skipped)\n'; end if;
  if v_draft is null then v_report := v_report || E'(no draft project in the table: B, C, F skipped)\n'; end if;

  for i in 1 .. coalesce(array_length(v_sqls, 1), 0) loop
    begin
      execute v_sqls[i];
      get diagnostics v_n = row_count;
      if v_exact[i] then
        v_status := case when v_n = 1 then 'PASS' else 'FAIL (0 rows: blocked by a policy)' end;
      else
        v_status := 'PASS';
      end if;
      v_report := v_report || format(E'%s -> %s row(s) %s\n', rpad(v_labels[i], 52, ' '), v_n, v_status);
    exception when others then
      v_report := v_report || format(E'%s -> FAIL  %s: %s\n', rpad(v_labels[i], 52, ' '), sqlstate, sqlerrm);
    end;
  end loop;

  -- G: nothing left behind for the projects that were deleted above.
  begin
    select (select count(*) from public.project_images         where project_id in (v_pub, v_draft))
         + (select count(*) from public.project_configurations where project_id in (v_pub, v_draft))
      into v_left;
    v_report := v_report || format(E'G  child rows left for deleted projects -> %s (must be 0) %s\n', v_left,
                                   case when v_left = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    v_report := v_report || format(E'G  child check FAILED: %s %s\n', sqlstate, sqlerrm);
  end;

  raise exception E'ADMIN PERMISSION TEST REPORT\n(this error is expected: it rolls everything back, no data was changed)\n\n%', v_report;
end
$test$;
