-- Focused rollback-only proof for Super Administrator account deletion.
begin;

do $$
declare
  actor uuid := gen_random_uuid();
  target uuid := gen_random_uuid();
  session uuid := gen_random_uuid();
  target_email text := 'delete-target-' || target::text || '@example.invalid';
begin
  if not (select relrowsecurity from pg_class where oid = 'public.administrator_deletion_requests'::regclass) then
    raise exception 'Administrator deletion requests must have RLS enabled.';
  end if;
  if has_table_privilege('anon', 'public.administrator_deletion_requests', 'SELECT') then
    raise exception 'Anonymous users can read administrator deletion requests.';
  end if;
  if has_table_privilege('authenticated', 'public.administrator_deletion_requests', 'INSERT') then
    raise exception 'Authenticated users can insert deletion requests directly.';
  end if;
  if has_function_privilege(
    'anon',
    'public.prepare_administrator_account_deletion(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users can prepare account deletion.';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.finalize_administrator_account_deletion(uuid,boolean,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users can finalize account deletion.';
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
  values
    (actor, 'delete-actor-' || actor::text || '@example.invalid', '{"display_name":"Deletion Actor"}'),
    (target, target_email, '{"display_name":"Deletion Target"}');

  update public.profiles
  set status = 'active', must_change_password = false
  where id in (actor, target);

  insert into public.user_roles (user_id, role_code)
  values (actor, 'SUPER_ADMIN'), (target, 'ADMINISTRATOR');

  insert into auth.sessions (id, user_id, not_after)
  values (session, actor, now() + interval '10 minutes');

  insert into public.administrator_provisioning_requests (
    batch_id,
    email,
    display_name,
    role_code,
    account_status,
    status,
    provider_user_id,
    invited_by,
    completed_at
  )
  values (
    gen_random_uuid(),
    target_email,
    'Deletion Target',
    'ADMINISTRATOR',
    'active',
    'sent',
    target,
    actor,
    now()
  );

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', actor,
      'role', 'authenticated',
      'session_id', session
    )::text,
    true
  );
  perform set_config('test.deletion_actor', actor::text, true);
  perform set_config('test.deletion_target', target::text, true);
  perform set_config('test.deletion_email', target_email, true);
  perform set_config('test.deletion_session', session::text, true);
end;
$$;

set local role authenticated;

do $$
declare
  actor uuid := current_setting('test.deletion_actor')::uuid;
  target uuid := current_setting('test.deletion_target')::uuid;
  target_email text := current_setting('test.deletion_email');
  prepared jsonb;
begin
  begin
    perform public.prepare_administrator_account_deletion(
      actor,
      'delete-actor-' || actor::text || '@example.invalid'
    );
    raise exception 'Self-deletion was unexpectedly allowed.';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.prepare_administrator_account_deletion(
      target,
      'wrong@example.invalid'
    );
    raise exception 'An incorrect confirmation email was unexpectedly accepted.';
  exception when sqlstate '22023' then
    null;
  end;

  prepared := public.prepare_administrator_account_deletion(target, target_email);
  if prepared->>'userId' <> target::text or prepared->>'email' <> target_email then
    raise exception 'Prepared deletion returned the wrong target snapshot.';
  end if;
  perform set_config('test.deletion_request', prepared->>'requestId', true);
end;
$$;

reset role;

delete from auth.users
where id = current_setting('test.deletion_target')::uuid;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  request_id uuid := current_setting('test.deletion_request')::uuid;
  first_result jsonb;
  replay_result jsonb;
begin
  first_result := public.finalize_administrator_account_deletion(
    request_id,
    true,
    null
  );
  replay_result := public.finalize_administrator_account_deletion(
    request_id,
    true,
    null
  );
  if not (first_result->>'ok')::boolean or not (replay_result->>'ok')::boolean then
    raise exception 'Deletion finalization or its retry failed.';
  end if;
end;
$$;

reset role;

do $$
declare
  actor uuid := current_setting('test.deletion_actor')::uuid;
  target uuid := current_setting('test.deletion_target')::uuid;
  target_email text := current_setting('test.deletion_email');
begin
  if exists (select 1 from auth.users where id = target)
    or exists (select 1 from public.profiles where id = target)
    or exists (select 1 from public.administrator_accounts where user_id = target) then
    raise exception 'The target account was not removed.';
  end if;
  if (
    select count(*)
    from public.audit_logs audit
    where audit.action = 'delete'
      and audit.entity_type = 'administrator_account'
      and audit.entity_id = target::text
  ) <> 1 then
    raise exception 'Deletion audit evidence is missing or duplicated.';
  end if;
  if (
    select status
    from public.administrator_deletion_requests request
    where request.id = current_setting('test.deletion_request')::uuid
  ) <> 'completed' then
    raise exception 'Deletion request was not completed.';
  end if;

  insert into public.administrator_provisioning_requests (
    batch_id,
    email,
    display_name,
    role_code,
    account_status,
    status,
    invited_by,
    completed_at
  )
  values (
    gen_random_uuid(),
    target_email,
    'Deletion Target Historical Retry',
    'ADMINISTRATOR',
    'active',
    'sent',
    actor,
    now()
  );
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('test.deletion_actor')::uuid,
    'role', 'authenticated',
    'session_id', current_setting('test.deletion_session')::uuid
  )::text,
  true
);

do $$
declare
  target_email text := current_setting('test.deletion_email');
  prepared jsonb;
begin
  prepared := public.prepare_administrator_invitations(
    jsonb_build_array(
      jsonb_build_object(
        'displayName', 'Deletion Target Recreated',
        'email', target_email,
        'phone', null,
        'role', 'ADMINISTRATOR',
        'status', 'active'
      )
    )
  );
  if jsonb_array_length(prepared->'requests') <> 1 then
    raise exception 'Historical sent requests still block re-provisioning.';
  end if;
end;
$$;

reset role;
select jsonb_build_object('passed', true, 'checks', 13) as result;
rollback;
