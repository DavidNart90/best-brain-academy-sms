alter table public.profiles
  add column must_change_password boolean not null default true,
  add column password_changed_at timestamptz;

comment on column public.profiles.must_change_password is
  'Blocks application access until the account holder replaces the administrator-issued temporary password.';

comment on column public.profiles.password_changed_at is
  'Timestamp recorded by the Auth password-change trigger; never written by the browser.';

create or replace function private.mark_profile_password_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    must_change_password = false,
    password_changed_at = now()
  where id = new.id;

  return new;
end;
$$;

revoke all on function private.mark_profile_password_changed() from public, anon, authenticated;

create trigger on_auth_password_changed
after update of encrypted_password on auth.users
for each row
when (old.encrypted_password is distinct from new.encrypted_password)
execute function private.mark_profile_password_changed();

create or replace function public.get_access_context()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'status', p.status,
    'mustChangePassword', p.must_change_password,
    'roles', coalesce((
      select jsonb_agg(ur.role_code order by ur.role_code)
      from public.user_roles ur
      where ur.user_id = p.id
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct rp.permission_code)
      from public.user_roles ur
      join public.role_permissions rp on rp.role_code = ur.role_code
      where ur.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.id = (select auth.uid());
$$;

revoke all on function public.get_access_context() from public, anon;
grant execute on function public.get_access_context() to authenticated;

delete from public.role_permissions
where role_code = 'ADMINISTRATOR'
  and permission_code in ('administrators.manage', 'settings.manage');

insert into public.role_permissions(role_code, permission_code)
select 'ADMINISTRATOR', permission.code
from public.permissions permission
where permission.code not in ('administrators.manage', 'settings.manage')
on conflict (role_code, permission_code) do nothing;
