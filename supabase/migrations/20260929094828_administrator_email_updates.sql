-- Audited Super Administrator email changes. The Auth email update and the
-- public administrator directory update are committed in the same transaction.

set lock_timeout = '5s';
set statement_timeout = '60s';

create table public.administrator_email_change_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  old_email text not null
    check (
      char_length(old_email) between 3 and 254
      and old_email = lower(btrim(old_email))
    ),
  new_email text not null
    check (
      char_length(new_email) between 3 and 254
      and new_email = lower(btrim(new_email))
    ),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'prepared'
    check (status in ('prepared', 'completed', 'failed')),
  failure_reason text
    check (failure_reason is null or char_length(failure_reason) <= 500),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint administrator_email_change_requests_distinct_email_check
    check (old_email <> new_email)
);

create unique index administrator_email_change_requests_prepared_target_idx
  on public.administrator_email_change_requests (target_user_id)
  where status = 'prepared';
create unique index administrator_email_change_requests_prepared_email_idx
  on public.administrator_email_change_requests (new_email)
  where status = 'prepared';
create index administrator_email_change_requests_requested_by_idx
  on public.administrator_email_change_requests (requested_by, created_at desc, id);
create index administrator_email_change_requests_created_at_idx
  on public.administrator_email_change_requests (created_at desc, id);

alter table public.administrator_email_change_requests enable row level security;
revoke all on public.administrator_email_change_requests
  from public, anon, authenticated;
grant select on public.administrator_email_change_requests to authenticated;

create policy administrator_email_change_requests_read_authorized
  on public.administrator_email_change_requests
  for select
  to authenticated
  using ((select private.has_permission('administrators.manage')));

create or replace function public.prepare_administrator_email_change(
  p_target_user_id uuid,
  p_new_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_email text := lower(btrim(coalesce(p_new_email, '')));
  current_account_email text;
  current_auth_email text;
  request_id uuid;
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
      message = 'You cannot change your own login email here.';
  end if;
  if char_length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using
      errcode = '22023',
      message = 'Enter a valid email address.';
  end if;

  perform pg_advisory_xact_lock(hashtext('administrator-access-safety'));

  select lower(account.email), lower(auth_user.email)
  into current_account_email, current_auth_email
  from public.administrator_accounts account
  join public.profiles profile on profile.id = account.user_id
  join auth.users auth_user on auth_user.id = account.user_id
  where account.user_id = p_target_user_id
  for update of account, profile, auth_user;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Administrator account not found.';
  end if;
  if current_account_email is distinct from current_auth_email then
    raise exception using
      errcode = '22023',
      message = 'This account email needs administrator review before it can be changed.';
  end if;
  if normalized_email = current_account_email then
    raise exception using
      errcode = '22023',
      message = 'Enter a different email address.';
  end if;
  if exists (
    select 1
    from auth.users auth_user
    where lower(auth_user.email) = normalized_email
      and auth_user.id <> p_target_user_id
  ) or exists (
    select 1
    from public.administrator_accounts account
    where lower(account.email) = normalized_email
      and account.user_id <> p_target_user_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Another account already uses that email address.';
  end if;

  insert into public.administrator_email_change_requests (
    target_user_id,
    old_email,
    new_email,
    requested_by
  )
  values (
    p_target_user_id,
    current_account_email,
    normalized_email,
    actor_id
  )
  returning id into request_id;

  return jsonb_build_object(
    'requestId', request_id,
    'userId', p_target_user_id,
    'oldEmail', current_account_email,
    'newEmail', normalized_email
  );
end;
$$;

revoke all on function public.prepare_administrator_email_change(uuid, text)
  from public, anon, authenticated;
grant execute on function public.prepare_administrator_email_change(uuid, text)
  to authenticated;

create or replace function private.sync_administrator_auth_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.administrator_email_change_requests%rowtype;
  normalized_old_email text := lower(btrim(coalesce(old.email, '')));
  normalized_new_email text := lower(btrim(coalesce(new.email, '')));
begin
  if new.email is not distinct from old.email then
    return new;
  end if;
  if not exists (
    select 1
    from public.administrator_accounts account
    where account.user_id = new.id
  ) then
    return new;
  end if;

  select request.*
  into request_row
  from public.administrator_email_change_requests request
  where request.target_user_id = new.id
    and request.status = 'prepared'
    and request.old_email = normalized_old_email
    and request.new_email = normalized_new_email
  order by request.created_at desc, request.id
  limit 1
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'A prepared administrator email change is required.';
  end if;

  update public.administrator_accounts
  set
    email = normalized_new_email,
    updated_by = request_row.requested_by,
    updated_at = now()
  where user_id = new.id;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Administrator account not found.';
  end if;

  update public.administrator_email_change_requests
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
  values (
    request_row.requested_by,
    'update',
    'administrator_account',
    new.id::text,
    jsonb_build_object('email', request_row.old_email),
    jsonb_build_object(
      'email', request_row.new_email,
      'emailChangeRequestId', request_row.id
    )
  );

  return new;
end;
$$;

revoke all on function private.sync_administrator_auth_email()
  from public, anon, authenticated;

create trigger on_auth_administrator_email_changed
after update of email on auth.users
for each row
execute function private.sync_administrator_auth_email();

create or replace function public.fail_administrator_email_change(
  p_request_id uuid,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.administrator_email_change_requests%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'Service role authorization is required.';
  end if;

  select request.*
  into request_row
  from public.administrator_email_change_requests request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'The email change request is not available.';
  end if;
  if request_row.status = 'completed' then
    return jsonb_build_object(
      'ok', true,
      'userId', request_row.target_user_id,
      'status', 'completed'
    );
  end if;

  update public.administrator_email_change_requests
  set
    status = 'failed',
    failure_reason = left(
      coalesce(nullif(btrim(p_error_message), ''), 'Auth email update failed.'),
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

revoke all on function public.fail_administrator_email_change(uuid, text)
  from public, anon, authenticated;
grant execute on function public.fail_administrator_email_change(uuid, text)
  to service_role;

comment on table public.administrator_email_change_requests is
  'Audited two-step requests for changing administrator Auth login emails.';
comment on function public.prepare_administrator_email_change(uuid, text) is
  'Validates a fresh Super Administrator session and reserves a unique replacement email.';
comment on function private.sync_administrator_auth_email() is
  'Requires a prepared request and atomically synchronizes administrator Auth and directory emails.';
comment on function public.fail_administrator_email_change(uuid, text) is
  'Service-role-only failure recording for Auth email updates.';
