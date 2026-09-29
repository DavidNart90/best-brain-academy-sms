-- Focused rollback-only proof for Super Administrator login-email changes.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  target uuid := gen_random_uuid();
  session uuid := gen_random_uuid();
  actor_email text := 'email-actor-' || actor::text || '@example.invalid';
  target_email text := 'email-target-' || target::text || '@example.invalid';
  replacement_email text := 'email-replacement-' || target::text || '@example.invalid';
begin
  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.administrator_email_change_requests'::regclass
  ) then
    raise exception 'Administrator email change requests must have RLS enabled.';
  end if;
  if has_table_privilege(
    'anon',
    'public.administrator_email_change_requests',
    'SELECT'
  ) then
    raise exception 'Anonymous users can read administrator email change requests.';
  end if;
  if has_table_privilege(
    'authenticated',
    'public.administrator_email_change_requests',
    'INSERT'
  ) then
    raise exception 'Authenticated users can insert email change requests directly.';
  end if;
  if has_function_privilege(
    'anon',
    'public.prepare_administrator_email_change(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users can prepare administrator email changes.';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.fail_administrator_email_change(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users can mark email changes as failed.';
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
  values
    (actor, actor_email, '{"display_name":"Email Change Actor"}'),
    (target, target_email, '{"display_name":"Email Change Target"}');

  update public.profiles
  set status = 'active', must_change_password = false
  where id in (actor, target);

  insert into public.user_roles (user_id, role_code)
  values (actor, 'SUPER_ADMIN'), (target, 'ADMINISTRATOR');

  insert into auth.sessions (id, user_id, not_after)
  values (session, actor, now() + interval '10 minutes');

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor,
      'role', 'authenticated',
      'session_id', session
    )::text,
    true
  );
  perform set_config('test.email_actor', actor::text, true);
  perform set_config('test.email_actor_address', actor_email, true);
  perform set_config('test.email_target', target::text, true);
  perform set_config('test.email_target_address', target_email, true);
  perform set_config('test.email_replacement', replacement_email, true);
  perform set_config('test.email_session', session::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  actor uuid := current_setting('test.email_actor')::uuid;
  actor_email text := current_setting('test.email_actor_address');
  target uuid := current_setting('test.email_target')::uuid;
  target_email text := current_setting('test.email_target_address');
  replacement_email text := current_setting('test.email_replacement');
  prepared jsonb;
begin
  begin
    perform public.prepare_administrator_email_change(
      actor,
      'email-self-replacement@example.invalid'
    );
    raise exception 'A Super Administrator changed their own email.';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.prepare_administrator_email_change(target, actor_email);
    raise exception 'A duplicate Auth email was accepted.';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.prepare_administrator_email_change(target, target_email);
    raise exception 'The current email was accepted as a replacement.';
  exception when sqlstate '22023' then
    null;
  end;

  prepared := public.prepare_administrator_email_change(
    target,
    upper(replacement_email)
  );
  if prepared->>'userId' <> target::text
    or prepared->>'oldEmail' <> target_email
    or prepared->>'newEmail' <> replacement_email then
    raise exception 'Prepared email change returned the wrong normalized snapshot.';
  end if;
  perform set_config('test.email_request', prepared->>'requestId', true);
end;
$$;

reset role;

update auth.users
set email = current_setting('test.email_replacement')
where id = current_setting('test.email_target')::uuid;

do $$
declare
  target uuid := current_setting('test.email_target')::uuid;
  target_email text := current_setting('test.email_target_address');
  replacement_email text := current_setting('test.email_replacement');
  request_id uuid := current_setting('test.email_request')::uuid;
begin
  if (
    select lower(email)
    from public.administrator_accounts
    where user_id = target
  ) <> replacement_email then
    raise exception 'The administrator directory email was not synchronized.';
  end if;
  if (
    select status
    from public.administrator_email_change_requests
    where id = request_id
  ) <> 'completed' then
    raise exception 'The administrator email change request was not completed.';
  end if;
  if (
    select count(*)
    from public.audit_logs audit
    where audit.action = 'update'
      and audit.entity_type = 'administrator_account'
      and audit.entity_id = target::text
      and audit.old_values->>'email' = target_email
      and audit.new_values->>'email' = replacement_email
      and audit.new_values->>'emailChangeRequestId' = request_id::text
  ) <> 1 then
    raise exception 'Administrator email audit evidence is missing or duplicated.';
  end if;

  begin
    update auth.users
    set email = 'email-unprepared@example.invalid'
    where id = target;
    raise exception 'An unprepared administrator Auth email update was allowed.';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  result jsonb;
begin
  result := public.fail_administrator_email_change(
    current_setting('test.email_request')::uuid,
    'A late provider failure should not overwrite completion.'
  );
  if result->>'status' <> 'completed' then
    raise exception 'Completed email changes are not idempotent.';
  end if;
end;
$$;

reset role;
select jsonb_build_object('passed', true, 'checks', 12) as result;
rollback;
