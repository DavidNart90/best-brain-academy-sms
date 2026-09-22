-- Allow a Super Administrator to remove an unused login account while
-- preserving administrator provisioning and deletion audit evidence.

-- A completed provisioning request is historical evidence, not an open job.
-- Existing Auth/account rows still prevent duplicate account creation.
drop index public.administrator_requests_open_email_unique;
create unique index administrator_requests_open_email_unique
  on public.administrator_provisioning_requests (lower(email))
  where status = 'prepared';

create table public.administrator_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  target_email text not null
    check (char_length(btrim(target_email)) between 3 and 254),
  target_display_name text not null
    check (char_length(target_display_name) between 1 and 120),
  target_role_code text,
  target_account_status text not null
    check (target_account_status in ('pending', 'active', 'disabled')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'prepared'
    check (status in ('prepared', 'completed', 'failed')),
  failure_reason text
    check (failure_reason is null or char_length(failure_reason) <= 500),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index administrator_deletion_requests_prepared_target_idx
  on public.administrator_deletion_requests (target_user_id)
  where status = 'prepared';
create index administrator_deletion_requests_requested_by_idx
  on public.administrator_deletion_requests (requested_by, created_at desc, id);
create index administrator_deletion_requests_created_at_idx
  on public.administrator_deletion_requests (created_at desc, id);

alter table public.administrator_deletion_requests enable row level security;
revoke all on public.administrator_deletion_requests
  from public, anon, authenticated;
grant select on public.administrator_deletion_requests to authenticated;

create policy administrator_deletion_requests_read_authorized
  on public.administrator_deletion_requests
  for select
  to authenticated
  using ((select private.has_permission('administrators.manage')));

create or replace function public.prepare_administrator_account_deletion(
  p_target_user_id uuid,
  p_confirmed_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_confirmation text := lower(btrim(coalesce(p_confirmed_email, '')));
  account_email text;
  account_display_name text;
  account_status text;
  account_role text;
  deletion_request_id uuid;
begin
  if not (select private.has_permission('administrators.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Administrator management permission is required.';
  end if;
  if not (select private.has_aal2()) then
    raise exception using
      errcode = '42501',
      message = 'A current privileged session is required for this action.';
  end if;
  if p_target_user_id is null or p_target_user_id = actor_id then
    raise exception using
      errcode = '22023',
      message = 'You cannot delete your own account.';
  end if;

  perform pg_advisory_xact_lock(hashtext('administrator-access-safety'));

  select
    lower(account.email),
    profile.display_name,
    profile.status,
    (
      select string_agg(user_role.role_code, ',' order by user_role.role_code)
      from public.user_roles user_role
      where user_role.user_id = profile.id
    )
  into account_email, account_display_name, account_status, account_role
  from public.profiles profile
  join public.administrator_accounts account on account.user_id = profile.id
  join auth.users auth_user on auth_user.id = profile.id
  where profile.id = p_target_user_id
  for update of profile, account;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Administrator account not found.';
  end if;
  if normalized_confirmation = '' or normalized_confirmation <> account_email then
    raise exception using
      errcode = '22023',
      message = 'Type the administrator email address exactly to confirm deletion.';
  end if;
  if exists (
    select 1
    from public.user_roles user_role
    where user_role.user_id = p_target_user_id
      and user_role.role_code = 'SUPER_ADMIN'
  )
    and account_status = 'active'
    and (
      select count(*)
      from public.profiles profile
      join public.user_roles user_role on user_role.user_id = profile.id
      where profile.status = 'active'
        and user_role.role_code = 'SUPER_ADMIN'
    ) <= 1 then
    raise exception using
      errcode = '22023',
      message = 'Keep at least one active Super Administrator.';
  end if;
  if exists (
    select 1
    from storage.objects object
    where object.owner_id = p_target_user_id::text
  ) then
    raise exception using
      errcode = '22023',
      message = 'This account owns uploaded files. Reassign or remove those files before deleting the account.';
  end if;

  insert into public.administrator_deletion_requests (
    target_user_id,
    target_email,
    target_display_name,
    target_role_code,
    target_account_status,
    requested_by
  )
  values (
    p_target_user_id,
    account_email,
    account_display_name,
    account_role,
    account_status,
    actor_id
  )
  returning id into deletion_request_id;

  return jsonb_build_object(
    'requestId', deletion_request_id,
    'userId', p_target_user_id,
    'email', account_email
  );
end;
$$;

revoke all on function public.prepare_administrator_account_deletion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.prepare_administrator_account_deletion(uuid, text)
  to authenticated;

create or replace function public.finalize_administrator_account_deletion(
  p_request_id uuid,
  p_succeeded boolean,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.administrator_deletion_requests%rowtype;
  account_is_deleted boolean;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'Service role authorization is required.';
  end if;

  select *
  into request_row
  from public.administrator_deletion_requests request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'The account deletion request is not available.';
  end if;
  if request_row.status = 'completed' then
    return jsonb_build_object(
      'ok', true,
      'userId', request_row.target_user_id,
      'status', 'completed'
    );
  end if;

  account_is_deleted := not exists (
    select 1 from auth.users auth_user
    where auth_user.id = request_row.target_user_id
  ) and not exists (
    select 1 from public.profiles profile
    where profile.id = request_row.target_user_id
  );

  if p_succeeded or account_is_deleted then
    if not account_is_deleted then
      raise exception using
        errcode = '22023',
        message = 'The Auth account still exists.';
    end if;

    update public.administrator_deletion_requests
    set
      status = 'completed',
      failure_reason = null,
      completed_at = now()
    where id = request_row.id;

    insert into public.audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values
    )
    select
      request_row.requested_by,
      'delete',
      'administrator_account',
      request_row.target_user_id::text,
      jsonb_build_object(
        'email', request_row.target_email,
        'displayName', request_row.target_display_name,
        'role', request_row.target_role_code,
        'status', request_row.target_account_status
      ),
      jsonb_build_object(
        'status', 'deleted',
        'deletionRequestId', request_row.id
      )
    where not exists (
      select 1
      from public.audit_logs audit
      where audit.action = 'delete'
        and audit.entity_type = 'administrator_account'
        and audit.entity_id = request_row.target_user_id::text
        and audit.new_values->>'deletionRequestId' = request_row.id::text
    );

    return jsonb_build_object(
      'ok', true,
      'userId', request_row.target_user_id,
      'status', 'completed'
    );
  end if;

  update public.administrator_deletion_requests
  set
    status = 'failed',
    failure_reason = left(
      coalesce(nullif(btrim(p_error_message), ''), 'Auth account deletion failed.'),
      500
    ),
    completed_at = now()
  where id = request_row.id;

  return jsonb_build_object(
    'ok', false,
    'userId', request_row.target_user_id,
    'status', 'failed'
  );
end;
$$;

revoke all on function public.finalize_administrator_account_deletion(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.finalize_administrator_account_deletion(uuid, boolean, text)
  to service_role;

comment on table public.administrator_deletion_requests is
  'Audited two-step requests for removing unused administrator Auth accounts.';
comment on function public.prepare_administrator_account_deletion(uuid, text) is
  'Validates caller, confirmation, self-deletion and final-Super-Administrator safeguards before Auth deletion.';
comment on function public.finalize_administrator_account_deletion(uuid, boolean, text) is
  'Service-role-only completion record and audit write after the Auth provider deletion result.';
