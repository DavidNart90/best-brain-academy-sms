-- Phase 0 only. Additive migration; no school/business records or user grants.
-- Apply through Supabase MCP to the user-authorized test target.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now()
);
create table public.roles (
  code text primary key check (code in ('SUPER_ADMIN', 'ADMINISTRATOR', 'ACCOUNTANT', 'MANAGEMENT')),
  label text not null
);
create table public.permissions (
  code text primary key,
  description text not null
);
create table public.role_permissions (
  role_code text not null references public.roles(code) on delete restrict,
  permission_code text not null references public.permissions(code) on delete restrict,
  primary key (role_code, permission_code)
);
create index role_permissions_permission_idx on public.role_permissions(permission_code);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_code)
);
create index user_roles_role_idx on public.user_roles(role_code);

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.profiles, public.roles, public.permissions, public.role_permissions, public.user_roles from public, anon, authenticated;
grant select on public.profiles, public.roles, public.permissions, public.role_permissions, public.user_roles to authenticated;

-- Definer is limited to internal, caller-bound lookups and the Auth trigger.
-- Session lookup closes the stale-access-token window after logout/revocation.
create function private.has_valid_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.sessions s
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after > now())
  );
$$;
create function private.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.has_valid_session()) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
      and exists (select 1 from public.user_roles ur where ur.user_id = p.id)
  );
$$;
revoke all on function private.has_valid_session(), private.is_active_staff() from public, anon, authenticated;
grant execute on function private.has_valid_session(), private.is_active_staff() to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) and (select private.has_valid_session()));
create policy roles_read_staff on public.roles for select to authenticated
  using ((select private.is_active_staff()));
create policy permissions_read_staff on public.permissions for select to authenticated
  using ((select private.is_active_staff()));
create policy role_permissions_read_staff on public.role_permissions for select to authenticated
  using ((select private.is_active_staff()));
create policy user_roles_read_self on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_active_staff()));

create function private.create_pending_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, status)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 120), 'pending');
  return new;
end;
$$;
revoke all on function private.create_pending_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.create_pending_profile();

-- No backfill of existing Auth users: an existing project requires explicit review.
insert into public.roles(code, label) values
  ('SUPER_ADMIN', 'Super Administrator'), ('ADMINISTRATOR', 'Administrator'),
  ('ACCOUNTANT', 'Accountant'), ('MANAGEMENT', 'Management');
insert into public.permissions(code, description) values
  ('dashboard.read', 'Open the staff dashboard'),
  ('admissions.read', 'Open admission route shells'),
  ('students.read', 'Open student route shells'),
  ('classes.read', 'Open academic class route shells'),
  ('staff.read', 'Open staff route shells'),
  ('financials.read', 'View financial navigation and synthetic preview'),
  ('reports.read', 'Open report route shells'),
  ('administrators.manage', 'Open restricted administrator route shells'),
  ('settings.manage', 'Open restricted settings route shells');
insert into public.role_permissions(role_code, permission_code)
  select 'SUPER_ADMIN', code from public.permissions;
insert into public.role_permissions(role_code, permission_code) values
  ('ADMINISTRATOR', 'dashboard.read'), ('ADMINISTRATOR', 'admissions.read'),
  ('ADMINISTRATOR', 'students.read'), ('ADMINISTRATOR', 'classes.read'),
  ('ADMINISTRATOR', 'staff.read'), ('ADMINISTRATOR', 'reports.read'),
  ('ACCOUNTANT', 'dashboard.read'), ('ACCOUNTANT', 'financials.read'),
  ('ACCOUNTANT', 'reports.read'), ('MANAGEMENT', 'dashboard.read'),
  ('MANAGEMENT', 'financials.read'), ('MANAGEMENT', 'reports.read');

-- Invoker respects RLS and returns only the current account's presentation data.
create function public.get_access_context()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'displayName', p.display_name, 'status', p.status,
    'roles', coalesce((select jsonb_agg(ur.role_code order by ur.role_code)
      from public.user_roles ur where ur.user_id = p.id), '[]'::jsonb),
    'permissions', coalesce((select jsonb_agg(distinct rp.permission_code)
      from public.user_roles ur join public.role_permissions rp on rp.role_code = ur.role_code
      where ur.user_id = p.id), '[]'::jsonb)
  ) from public.profiles p where p.id = (select auth.uid());
$$;
revoke all on function public.get_access_context() from public, anon, authenticated;
grant execute on function public.get_access_context() to authenticated;
