-- Executable migration acceptance checks, applied through MCP on the designated
-- test project. All fixture writes are rolled back inside a subtransaction.
-- No real accounts, passwords, school rows, grants or test functions persist.
do $verify$
declare
  actor_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  session_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  actor_index integer;
  context jsonb;
  row_count integer;
  table_name text;
  denied boolean;
begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('profiles','roles','permissions','role_permissions','user_roles')
      and c.relrowsecurity) <> 5 then
    raise exception 'Contract failed: RLS required on all application tables';
  end if;
  foreach table_name in array array['profiles','roles','permissions','role_permissions','user_roles'] loop
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
       or has_table_privilege('authenticated', 'public.' || table_name, 'INSERT,UPDATE,DELETE,TRUNCATE') then
      raise exception 'Contract failed: excessive table grants on %', table_name;
    end if;
  end loop;
  if has_function_privilege('anon', 'public.get_access_context()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.create_pending_profile()', 'EXECUTE')
     or (select prosecdef from pg_proc where oid='public.get_access_context()'::regprocedure) then
    raise exception 'Contract failed: RPC or trigger exposure';
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    if has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE')
       or has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') then
      raise exception 'Contract failed: existing RLS trigger retains API grants';
    end if;
  end if;

  begin
    for actor_index in 1..4 loop
      insert into auth.users(id, raw_user_meta_data)
      values (actor_ids[actor_index], '{"display_name":"Transient SQL verification","role":"SUPER_ADMIN","status":"active"}');
      if (select status from public.profiles where id=actor_ids[actor_index]) is distinct from 'pending'
         or exists (select 1 from public.user_roles where user_id=actor_ids[actor_index]) then
        raise exception 'Contract failed: profile trigger trusts role/status metadata';
      end if;
      insert into auth.sessions(id,user_id) values (session_ids[actor_index],actor_ids[actor_index]);
    end loop;
    -- Explicit fixture assignments only: super, management, disabled, pending.
    update public.profiles set status='active' where id in (actor_ids[1],actor_ids[2]);
    update public.profiles set status='disabled' where id=actor_ids[3];
    insert into public.user_roles(user_id,role_code) values
      (actor_ids[1],'SUPER_ADMIN'),(actor_ids[2],'MANAGEMENT'),(actor_ids[3],'SUPER_ADMIN');

    for actor_index in 1..4 loop
      perform set_config('request.jwt.claims', jsonb_build_object(
        'sub',actor_ids[actor_index],'role','authenticated','session_id',session_ids[actor_index],
        'user_metadata',jsonb_build_object('role','SUPER_ADMIN'))::text, true);
      set local role authenticated;
      if current_user <> 'authenticated' then raise exception 'Contract failed: RLS actor not assumed'; end if;
      select public.get_access_context() into context;
      if context->>'id' is distinct from actor_ids[actor_index]::text then
        raise exception 'Contract failed: access RPC identity mismatch';
      end if;
      select count(*) into row_count from public.profiles;
      if row_count <> 1 then raise exception 'Contract failed: cross-account profile disclosure'; end if;
      if actor_index=1 and jsonb_array_length(context->'permissions') <> 9 then
        raise exception 'Contract failed: explicit super permissions missing';
      elsif actor_index=2 and (jsonb_array_length(context->'permissions') <> 3
          or context->'permissions' ? 'settings.manage' or context->'permissions' ? 'administrators.manage') then
        raise exception 'Contract failed: management permissions or metadata escalation';
      elsif actor_index>2 and (context->'permissions' <> '[]'::jsonb or context->'roles' <> '[]'::jsonb) then
        raise exception 'Contract failed: pending/disabled account has active grants';
      end if;
      -- Each actor, including super, must be unable to activate or assign itself.
      denied := false;
      begin
        update public.profiles set status='active' where id=actor_ids[actor_index];
      exception when insufficient_privilege then denied := true;
      end;
      if not denied then raise exception 'Contract failed: direct profile write allowed'; end if;
      denied := false;
      begin
        insert into public.user_roles(user_id,role_code) values (actor_ids[actor_index],'ACCOUNTANT');
      exception when insufficient_privilege then denied := true;
      end;
      if not denied then raise exception 'Contract failed: direct role assignment allowed'; end if;
      reset role;
    end loop;

    -- Change grants/status while keeping the same claims; every read must recheck.
    delete from public.user_roles where user_id=actor_ids[1];
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_ids[1],'role','authenticated','session_id',session_ids[1])::text,true);
    set local role authenticated;
    if public.get_access_context()->'permissions' <> '[]'::jsonb then
      raise exception 'Contract failed: removed grants remain visible';
    end if;
    reset role;
    update public.profiles set status='disabled' where id=actor_ids[2];
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_ids[2],'role','authenticated','session_id',session_ids[2])::text,true);
    set local role authenticated;
    if public.get_access_context()->'permissions' <> '[]'::jsonb then
      raise exception 'Contract failed: disabled status not enforced';
    end if;
    reset role;

    -- Missing, expired, mismatched and revoked sessions cannot read the profile.
    update auth.sessions set not_after=now()-interval '1 second' where id=session_ids[1];
    for actor_index in 1..3 loop
      perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_ids[1],'role','authenticated','session_id',
        case actor_index when 1 then session_ids[1] when 2 then session_ids[2] else gen_random_uuid() end)::text,true);
      set local role authenticated;
      if public.get_access_context() is not null or exists(select 1 from public.profiles) then
        raise exception 'Contract failed: invalid session has database access';
      end if;
      reset role;
    end loop;
    delete from auth.sessions where id=session_ids[3];
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_ids[3],'role','authenticated','session_id',session_ids[3])::text,true);
    set local role authenticated;
    if public.get_access_context() is not null then raise exception 'Contract failed: revoked session has access'; end if;
    reset role;

    set local role anon;
    denied := false;
    begin perform public.get_access_context();
    exception when insufficient_privilege then denied := true;
    end;
    if not denied then raise exception 'Contract failed: anonymous RPC allowed'; end if;
    reset role;
    -- Only this intentional exception is caught. Any contract error aborts migration.
    raise exception using errcode='PT999', message='Rollback successful verification fixtures';
  exception when sqlstate 'PT999' then null;
  end;
  if exists (select 1 from auth.users where id=any(actor_ids))
     or exists (select 1 from auth.sessions where id=any(session_ids))
     or exists (select 1 from public.profiles where id=any(actor_ids))
     or exists (select 1 from public.user_roles where user_id=any(actor_ids)) then
    raise exception 'Contract failed: transient fixtures were not rolled back';
  end if;
end;
$verify$;
