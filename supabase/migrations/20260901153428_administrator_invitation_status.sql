-- Preserve the requested account status through administrator invitation batches.
alter table public.administrator_provisioning_requests
  add column account_status text not null default 'active'
  check (account_status in ('active', 'disabled'));

create or replace function public.prepare_administrator_invitations(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  batch uuid := gen_random_uuid();
  item jsonb;
  request_rows jsonb := '[]'::jsonb;
  normalized_email text;
  requested_role text;
  requested_status text;
  request_id uuid;
begin
  if not (select private.has_permission('administrators.manage')) then
    raise exception using errcode = '42501', message = 'Administrator management permission is required.';
  end if;
  if not (select private.has_aal2()) then
    raise exception using errcode = '42501', message = 'MFA verification is required for this action.';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Invite between 1 and 100 administrators at a time.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(payload) row
    group by lower(btrim(row->>'email')) having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'The invitation contains duplicate email addresses.';
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    normalized_email := lower(btrim(item->>'email'));
    requested_role := upper(btrim(item->>'role'));
    requested_status := lower(btrim(coalesce(item->>'status', 'active')));
    if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = '22023', message = 'Enter a valid email address.';
    end if;
    if char_length(btrim(coalesce(item->>'displayName', ''))) not between 2 and 120 then
      raise exception using errcode = '22023', message = 'Full name must contain 2 to 120 characters.';
    end if;
    if nullif(btrim(item->>'phone'), '') is not null
      and char_length(btrim(item->>'phone')) not between 7 and 40 then
      raise exception using errcode = '22023', message = 'Enter a valid phone number.';
    end if;
    if not exists (select 1 from public.roles where code = requested_role) then
      raise exception using errcode = '22023', message = 'Choose a valid administrator role.';
    end if;
    if requested_status not in ('active', 'disabled') then
      raise exception using errcode = '22023', message = 'Choose active or disabled.';
    end if;
    if exists (select 1 from auth.users where lower(email) = normalized_email)
      or exists (select 1 from public.administrator_accounts where lower(email) = normalized_email) then
      raise exception using errcode = '23505', message = 'An account already uses ' || normalized_email || '.';
    end if;

    insert into public.administrator_provisioning_requests(
      batch_id, email, display_name, phone, role_code, account_status, invited_by
    ) values (
      batch, normalized_email, btrim(item->>'displayName'),
      nullif(btrim(item->>'phone'), ''), requested_role, requested_status, actor_id
    ) returning id into request_id;
    request_rows := request_rows || jsonb_build_array(jsonb_build_object(
      'requestId', request_id, 'email', normalized_email,
      'displayName', btrim(item->>'displayName'),
      'phone', nullif(btrim(item->>'phone'), ''), 'role', requested_role,
      'status', requested_status
    ));
  end loop;
  return jsonb_build_object('batchId', batch, 'requests', request_rows);
end;
$$;

create or replace function public.finalize_administrator_invitation(
  request_id uuid,
  target_user_id uuid,
  succeeded boolean,
  error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.administrator_provisioning_requests%rowtype;
  old_account jsonb;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role authorization is required.';
  end if;
  select * into request_row from public.administrator_provisioning_requests
  where id = request_id for update;
  if not found or request_row.status <> 'prepared' then
    raise exception using errcode = '22023', message = 'The invitation request is no longer available.';
  end if;
  if not succeeded then
    update public.administrator_provisioning_requests
    set status = 'failed', failure_reason = left(coalesce(error_message, 'Invitation provider failed.'), 500),
        completed_at = now()
    where id = request_id;
    return jsonb_build_object('ok', false);
  end if;
  if target_user_id is null or not exists (
    select 1 from auth.users where id = target_user_id and lower(email) = request_row.email
  ) then
    raise exception using errcode = '22023', message = 'The invited Auth user does not match this request.';
  end if;

  select to_jsonb(account) into old_account
  from public.administrator_accounts account where account.user_id = target_user_id;
  update public.profiles
  set display_name = request_row.display_name, status = request_row.account_status
  where id = target_user_id;
  insert into public.administrator_accounts(
    user_id, email, phone, invitation_status, invited_at, created_by, updated_by
  ) values (
    target_user_id, request_row.email, request_row.phone, 'invited', now(),
    request_row.invited_by, request_row.invited_by
  )
  on conflict (user_id) do update set
    email = excluded.email, phone = excluded.phone, invitation_status = 'invited',
    invited_at = now(), updated_by = request_row.invited_by, updated_at = now();
  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles(user_id, role_code) values (target_user_id, request_row.role_code);
  update public.administrator_provisioning_requests
  set status = 'sent', provider_user_id = target_user_id, completed_at = now()
  where id = request_id;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_values, new_values)
  values (
    request_row.invited_by, 'insert', 'administrator_account', target_user_id::text,
    old_account,
    jsonb_build_object('email', request_row.email, 'displayName', request_row.display_name,
      'phone', request_row.phone, 'role', request_row.role_code, 'status', request_row.account_status)
  );
  return jsonb_build_object('ok', true, 'userId', target_user_id);
end;
$$;
