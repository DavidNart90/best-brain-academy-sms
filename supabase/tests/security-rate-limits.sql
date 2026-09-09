-- Focused Phase 6 test. Run only on the authorized isolated test project.
-- The synthetic user, session, policy change, and usage rows are rolled back.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  session uuid := gen_random_uuid();
  protected_table_count integer;
begin
  select count(*)::integer
  into protected_table_count
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'private'
    and relation.relname in ('rate_limit_policies', 'request_rate_limits')
    and relation.relrowsecurity;
  if protected_table_count <> 2 then
    raise exception 'Both rate-limit tables must have RLS enabled.';
  end if;
  if has_table_privilege('anon', 'private.rate_limit_policies', 'SELECT') then
    raise exception 'Anonymous users can read rate-limit policy.';
  end if;
  if has_table_privilege('authenticated', 'private.request_rate_limits', 'SELECT') then
    raise exception 'Authenticated users can inspect counters directly.';
  end if;
  if has_function_privilege('anon', 'public.consume_rate_limit(text)', 'EXECUTE') then
    raise exception 'Anonymous users can invoke the limiter.';
  end if;
  if not has_function_privilege('authenticated', 'public.consume_rate_limit(text)', 'EXECUTE') then
    raise exception 'Authenticated users cannot invoke the guarded limiter.';
  end if;

  insert into auth.users (id, email)
  values (actor, 'rate-limit-' || actor::text || '@example.invalid');
  update public.profiles
  set status = 'active', must_change_password = false
  where id = actor;
  insert into public.user_roles (user_id, role_code)
  values (actor, 'ADMINISTRATOR');
  insert into auth.sessions (id, user_id, not_after)
  values (session, actor, now() + interval '10 minutes');
  update private.rate_limit_policies
  set max_requests = 2, window_seconds = 60
  where bucket = 'report-export';
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor,
      'role', 'authenticated',
      'session_id', session
    )::text,
    true
  );
  perform set_config('test.rate_limit_session', session::text, true);
end;
$$;

set local role authenticated;
do $$
declare
  first_decision jsonb;
  second_decision jsonb;
  third_decision jsonb;
begin
  first_decision := public.consume_rate_limit('report-export');
  second_decision := public.consume_rate_limit('report-export');
  third_decision := public.consume_rate_limit('report-export');
  if not (first_decision->>'allowed')::boolean then
    raise exception 'First request was unexpectedly denied.';
  end if;
  if not (second_decision->>'allowed')::boolean then
    raise exception 'Last request within the policy was unexpectedly denied.';
  end if;
  if (third_decision->>'allowed')::boolean then
    raise exception 'Request beyond the policy was unexpectedly allowed.';
  end if;
  begin
    perform public.consume_rate_limit('not-a-policy');
    raise exception 'Unknown rate-limit bucket was unexpectedly accepted.';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

reset role;
delete from auth.sessions
where id = current_setting('test.rate_limit_session')::uuid;
set local role authenticated;
do $$
begin
  begin
    perform public.consume_rate_limit('report-export');
    raise exception 'Revoked session unexpectedly consumed a bucket.';
  exception when sqlstate '42501' then
    null;
  end;
end;
$$;

reset role;
select jsonb_build_object('passed', true, 'checks', 10) as result;
rollback;
