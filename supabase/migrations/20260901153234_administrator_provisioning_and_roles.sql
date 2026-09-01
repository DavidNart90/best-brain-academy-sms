-- P2-05 administrator provisioning, role management and privileged MFA gates.
-- Auth invitations are completed by the administrator-provision Edge Function.

create table public.administrator_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null check (char_length(btrim(email)) between 3 and 254),
  phone text check (phone is null or char_length(btrim(phone)) between 7 and 40),
  invitation_status text not null default 'provisioned'
    check (invitation_status in ('provisioned', 'invited', 'failed')),
  invited_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index administrator_accounts_email_unique
  on public.administrator_accounts (lower(email));
create index administrator_accounts_status_idx
  on public.administrator_accounts (invitation_status, created_at desc, id);
create index administrator_accounts_created_by_idx on public.administrator_accounts(created_by);
create index administrator_accounts_updated_by_idx on public.administrator_accounts(updated_by);

create table public.administrator_provisioning_requests (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  email text not null check (char_length(btrim(email)) between 3 and 254),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  phone text check (phone is null or char_length(btrim(phone)) between 7 and 40),
  role_code text not null references public.roles(code) on delete restrict,
  status text not null default 'prepared'
    check (status in ('prepared', 'sent', 'failed')),
  provider_user_id uuid references auth.users(id) on delete set null,
  failure_reason text check (failure_reason is null or char_length(failure_reason) <= 500),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index administrator_requests_open_email_unique
  on public.administrator_provisioning_requests (lower(email))
  where status in ('prepared', 'sent');
create index administrator_requests_batch_idx
  on public.administrator_provisioning_requests (batch_id, created_at, id);
create index administrator_requests_inviter_idx
  on public.administrator_provisioning_requests (invited_by, created_at desc, id);

insert into public.administrator_accounts(
  user_id, email, phone, invitation_status, invited_at, created_at, updated_at
)
select
  profile.id,
  lower(auth_user.email),
  nullif(btrim(auth_user.phone), ''),
  case when auth_user.invited_at is null then 'provisioned' else 'invited' end,
  auth_user.invited_at,
  profile.created_at,
  now()
from public.profiles profile
join auth.users auth_user on auth_user.id = profile.id
where auth_user.email is not null;

alter table public.administrator_accounts enable row level security;
alter table public.administrator_provisioning_requests enable row level security;
revoke all on public.administrator_accounts, public.administrator_provisioning_requests
  from public, anon, authenticated;
grant select on public.administrator_accounts, public.administrator_provisioning_requests
  to authenticated;

create or replace function private.has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_valid_session())
    and coalesce((select auth.jwt()->>'aal'), '') = 'aal2';
$$;
revoke all on function private.has_aal2() from public, anon, authenticated;

create policy administrator_accounts_read_authorized
  on public.administrator_accounts for select to authenticated
  using ((select private.has_permission('administrators.manage')));
create policy administrator_requests_read_authorized
  on public.administrator_provisioning_requests for select to authenticated
  using ((select private.has_permission('administrators.manage')));
create policy profiles_read_administrators
  on public.profiles for select to authenticated
  using ((select private.has_permission('administrators.manage')));
create policy user_roles_read_administrators
  on public.user_roles for select to authenticated
  using ((select private.has_permission('administrators.manage')));

create or replace function private.create_pending_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, status)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 120), 'pending')
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.administrator_accounts(
      user_id, email, phone, invitation_status, invited_at
    ) values (
      new.id,
      lower(new.email),
      nullif(btrim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), ''),
      case when new.invited_at is null then 'provisioned' else 'invited' end,
      new.invited_at
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.create_pending_profile() from public, anon, authenticated;

create or replace function public.get_administrator_directory(
  search_text text default '',
  status_filter text default 'all',
  role_filter text default 'all',
  page_number integer default 1,
  page_size integer default 25
)
returns table (
  user_id uuid,
  display_name text,
  email text,
  phone text,
  account_status text,
  role_code text,
  invitation_status text,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  mfa_enrolled boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cleaned_search text := left(btrim(coalesce(search_text, '')), 80);
  safe_page integer := greatest(coalesce(page_number, 1), 1);
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 5000);
begin
  if not (select private.has_permission('administrators.manage')) then
    raise exception using errcode = '42501', message = 'Administrator management permission is required.';
  end if;
  if status_filter not in ('all', 'pending', 'active', 'disabled') then
    raise exception using errcode = '22023', message = 'Choose a valid account status.';
  end if;
  if role_filter <> 'all' and not exists (select 1 from public.roles where code = role_filter) then
    raise exception using errcode = '22023', message = 'Choose a valid role.';
  end if;

  return query
  select
    profile.id,
    profile.display_name,
    account.email,
    account.phone,
    profile.status,
    role.role_code,
    account.invitation_status,
    account.invited_at,
    auth_user.last_sign_in_at,
    exists (
      select 1 from auth.mfa_factors factor
      where factor.user_id = profile.id and factor.status = 'verified'
    ),
    count(*) over ()
  from public.profiles profile
  join public.administrator_accounts account on account.user_id = profile.id
  join auth.users auth_user on auth_user.id = profile.id
  left join lateral (
    select string_agg(user_role.role_code, ',' order by user_role.role_code) as role_code
    from public.user_roles user_role where user_role.user_id = profile.id
  ) role on true
  where (status_filter = 'all' or profile.status = status_filter)
    and (role_filter = 'all' or exists (
      select 1 from public.user_roles filtered_role
      where filtered_role.user_id = profile.id and filtered_role.role_code = role_filter
    ))
    and (
      cleaned_search = ''
      or profile.display_name ilike '%' || cleaned_search || '%'
      or account.email ilike '%' || cleaned_search || '%'
      or coalesce(account.phone, '') ilike '%' || cleaned_search || '%'
    )
  order by lower(profile.display_name), lower(account.email), profile.id
  offset ((safe_page - 1) * safe_size)
  limit safe_size;
end;
$$;
revoke all on function public.get_administrator_directory(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_administrator_directory(text, text, text, integer, integer)
  to authenticated;

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
    if exists (select 1 from auth.users where lower(email) = normalized_email)
      or exists (select 1 from public.administrator_accounts where lower(email) = normalized_email) then
      raise exception using errcode = '23505', message = 'An account already uses ' || normalized_email || '.';
    end if;

    insert into public.administrator_provisioning_requests(
      batch_id, email, display_name, phone, role_code, invited_by
    ) values (
      batch,
      normalized_email,
      btrim(item->>'displayName'),
      nullif(btrim(item->>'phone'), ''),
      requested_role,
      actor_id
    ) returning id into request_id;
    request_rows := request_rows || jsonb_build_array(jsonb_build_object(
      'requestId', request_id,
      'email', normalized_email,
      'displayName', btrim(item->>'displayName'),
      'phone', nullif(btrim(item->>'phone'), ''),
      'role', requested_role
    ));
  end loop;
  return jsonb_build_object('batchId', batch, 'requests', request_rows);
end;
$$;
revoke all on function public.prepare_administrator_invitations(jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_administrator_invitations(jsonb) to authenticated;

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
  set display_name = request_row.display_name, status = 'active'
  where id = target_user_id;
  insert into public.administrator_accounts(
    user_id, email, phone, invitation_status, invited_at,
    created_by, updated_by
  ) values (
    target_user_id, request_row.email, request_row.phone, 'invited', now(),
    request_row.invited_by, request_row.invited_by
  )
  on conflict (user_id) do update set
    email = excluded.email,
    phone = excluded.phone,
    invitation_status = 'invited',
    invited_at = now(),
    updated_by = request_row.invited_by,
    updated_at = now();
  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles(user_id, role_code)
  values (target_user_id, request_row.role_code);
  update public.administrator_provisioning_requests
  set status = 'sent', provider_user_id = target_user_id, completed_at = now()
  where id = request_id;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_values, new_values)
  values (
    request_row.invited_by, 'insert', 'administrator_account', target_user_id::text,
    old_account,
    jsonb_build_object('email', request_row.email, 'displayName', request_row.display_name,
      'phone', request_row.phone, 'role', request_row.role_code, 'status', 'active')
  );
  return jsonb_build_object('ok', true, 'userId', target_user_id);
end;
$$;
revoke all on function public.finalize_administrator_invitation(uuid, uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.finalize_administrator_invitation(uuid, uuid, boolean, text)
  to service_role;

create or replace function public.change_administrator_role(
  target_user_id uuid,
  target_role_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_role text := upper(btrim(target_role_code));
  old_roles jsonb;
begin
  if not (select private.has_permission('administrators.manage')) then
    raise exception using errcode = '42501', message = 'Administrator management permission is required.';
  end if;
  if not (select private.has_aal2()) then
    raise exception using errcode = '42501', message = 'MFA verification is required for this action.';
  end if;
  if target_user_id = actor_id then
    raise exception using errcode = '22023', message = 'You cannot change your own role.';
  end if;
  if not exists (select 1 from public.roles where code = normalized_role)
    or not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception using errcode = '22023', message = 'Choose a valid administrator and role.';
  end if;

  perform pg_advisory_xact_lock(hashtext('administrator-access-safety'));
  if normalized_role <> 'SUPER_ADMIN'
    and exists (select 1 from public.user_roles where user_id = target_user_id and role_code = 'SUPER_ADMIN')
    and exists (select 1 from public.profiles where id = target_user_id and status = 'active')
    and (
      select count(*) from public.profiles profile
      join public.user_roles user_role on user_role.user_id = profile.id
      where profile.status = 'active' and user_role.role_code = 'SUPER_ADMIN'
    ) <= 1 then
    raise exception using errcode = '22023', message = 'Keep at least one active Super Administrator.';
  end if;

  select coalesce(jsonb_agg(role_code order by role_code), '[]'::jsonb)
  into old_roles from public.user_roles where user_id = target_user_id;
  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles(user_id, role_code) values (target_user_id, normalized_role);
  update public.administrator_accounts
  set updated_by = actor_id, updated_at = now() where user_id = target_user_id;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_values, new_values)
  values (actor_id, 'update', 'administrator_role', target_user_id::text,
    jsonb_build_object('roles', old_roles), jsonb_build_object('roles', jsonb_build_array(normalized_role)));
  return jsonb_build_object('ok', true, 'userId', target_user_id, 'role', normalized_role);
end;
$$;
revoke all on function public.change_administrator_role(uuid, text)
  from public, anon, authenticated;
grant execute on function public.change_administrator_role(uuid, text) to authenticated;

create or replace function public.set_administrator_status(
  target_user_id uuid,
  target_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_status text := lower(btrim(target_status));
  old_status text;
begin
  if not (select private.has_permission('administrators.manage')) then
    raise exception using errcode = '42501', message = 'Administrator management permission is required.';
  end if;
  if not (select private.has_aal2()) then
    raise exception using errcode = '42501', message = 'MFA verification is required for this action.';
  end if;
  if target_user_id = actor_id then
    raise exception using errcode = '22023', message = 'You cannot change your own account status.';
  end if;
  if normalized_status not in ('active', 'disabled') then
    raise exception using errcode = '22023', message = 'Choose active or disabled.';
  end if;

  perform pg_advisory_xact_lock(hashtext('administrator-access-safety'));
  select status into old_status from public.profiles where id = target_user_id for update;
  if old_status is null then
    raise exception using errcode = '22023', message = 'Administrator account not found.';
  end if;
  if normalized_status = 'active'
    and not exists (select 1 from public.user_roles where user_id = target_user_id) then
    raise exception using errcode = '22023', message = 'Assign a role before activating this account.';
  end if;
  if normalized_status = 'disabled'
    and old_status = 'active'
    and exists (select 1 from public.user_roles where user_id = target_user_id and role_code = 'SUPER_ADMIN')
    and (
      select count(*) from public.profiles profile
      join public.user_roles user_role on user_role.user_id = profile.id
      where profile.status = 'active' and user_role.role_code = 'SUPER_ADMIN'
    ) <= 1 then
    raise exception using errcode = '22023', message = 'Keep at least one active Super Administrator.';
  end if;

  update public.profiles set status = normalized_status where id = target_user_id;
  update public.administrator_accounts
  set updated_by = actor_id, updated_at = now() where user_id = target_user_id;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_values, new_values)
  values (actor_id, 'update', 'administrator_account', target_user_id::text,
    jsonb_build_object('status', old_status), jsonb_build_object('status', normalized_status));
  return jsonb_build_object('ok', true, 'userId', target_user_id, 'status', normalized_status);
end;
$$;
revoke all on function public.set_administrator_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_administrator_status(uuid, text) to authenticated;
