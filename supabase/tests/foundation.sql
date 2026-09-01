-- pgTAP contract tests. Run only on the confirmed isolated test target after
-- pgTAP is enabled there. Transaction rolls back its own synthetic Auth record.
begin;
select plan(14);

select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('profiles','roles','permissions','role_permissions','user_roles')
  and c.relrowsecurity), 5, 'Every exposed application table has RLS');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'Anonymous cannot read profiles');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'Staff cannot self-enable profiles');
select ok(not has_table_privilege('authenticated', 'public.user_roles', 'INSERT'), 'Staff cannot self-grant a role');
select ok(not has_table_privilege('authenticated', 'public.role_permissions', 'UPDATE'), 'Staff cannot change grants');
select ok(not has_function_privilege('anon', 'public.get_access_context()', 'EXECUTE'), 'Access RPC rejects anonymous');
select ok(not has_function_privilege('authenticated', 'private.create_pending_profile()', 'EXECUTE'), 'Auth trigger cannot be called by staff');
select ok(not (select prosecdef from pg_proc where oid = 'public.get_access_context()'::regprocedure), 'Access RPC runs as invoker');
select is((select count(*)::integer from public.role_permissions where role_code = 'MANAGEMENT' and permission_code like '%.manage'), 0, 'Management has no management grants');

insert into auth.users(id, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000099', '{"display_name":"Synthetic trigger test","role":"SUPER_ADMIN","status":"active"}');
select is((select status from public.profiles where id = '00000000-0000-4000-8000-000000000099'), 'pending', 'User metadata cannot activate a profile');
select is((select count(*)::integer from public.user_roles where user_id = '00000000-0000-4000-8000-000000000099'), 0, 'Profile trigger grants no role');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","session_id":"00000000-0000-4000-8000-000000000098"}', true);
select is((select count(*)::integer from public.profiles), 0, 'A JWT without a live session cannot read profiles');
select is((select count(*)::integer from public.user_roles), 0, 'An unassigned actor sees no role grants');
select is(public.get_access_context(), null::jsonb, 'Invalid session has no access context');
reset role;
select * from finish();
rollback;
