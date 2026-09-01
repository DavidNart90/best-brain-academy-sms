-- Administrator access changes follow the school's explicit password-only policy.
-- Existing privileged RPCs retain their permission and valid-session checks; this
-- compatibility helper no longer requires an AAL2/MFA claim.
create or replace function private.has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_valid_session())
    and (select private.has_permission('administrators.manage'));
$$;

comment on function private.has_aal2() is
  'Compatibility gate for privileged administrator RPCs under the school password-only policy.';

revoke all on function private.has_aal2() from public, anon, authenticated;
