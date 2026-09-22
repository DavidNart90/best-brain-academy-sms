-- Authenticated account holders may maintain their own presentation profile.
-- Email, status, role and access grants remain administrator-controlled.

insert into private.rate_limit_policies (
  bucket,
  max_requests,
  window_seconds,
  description
) values (
  'profile-write',
  20,
  600,
  'Authenticated profile detail changes'
)
on conflict (bucket) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds,
  description = excluded.description;

drop policy administrator_accounts_read_authorized
  on public.administrator_accounts;

create policy administrator_accounts_read_authorized
  on public.administrator_accounts for select to authenticated
  using (
    (
      user_id = (select auth.uid())
      and (select private.is_active_staff())
    )
    or (select private.has_permission('administrators.manage'))
  );

create policy profiles_update_self
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and (select private.is_active_staff())
  )
  with check (
    id = (select auth.uid())
    and status = 'active'
    and (select private.is_active_staff())
  );

create policy administrator_accounts_update_self
  on public.administrator_accounts for update to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_active_staff())
  )
  with check (
    user_id = (select auth.uid())
    and (select private.is_active_staff())
  );

grant update (display_name) on public.profiles to authenticated;
grant update (phone) on public.administrator_accounts to authenticated;

create or replace function public.update_own_profile(
  profile_display_name text,
  profile_phone text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  cleaned_display_name text := btrim(coalesce(profile_display_name, ''));
  cleaned_phone text := nullif(btrim(coalesce(profile_phone, '')), '');
begin
  if actor_id is null or not (select private.is_active_staff()) then
    raise exception using
      errcode = '42501',
      message = 'An active verified account is required.';
  end if;

  if char_length(cleaned_display_name) not between 2 and 120 then
    raise exception using
      errcode = '22023',
      message = 'Display name must contain between 2 and 120 characters.';
  end if;

  if cleaned_phone is not null
    and char_length(cleaned_phone) not between 7 and 40 then
    raise exception using
      errcode = '22023',
      message = 'Enter a valid phone number.';
  end if;

  update public.profiles
  set display_name = cleaned_display_name
  where id = actor_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Account profile was not found.';
  end if;

  update public.administrator_accounts
  set phone = cleaned_phone
  where user_id = actor_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Account contact record was not found.';
  end if;

  return jsonb_build_object(
    'displayName', cleaned_display_name,
    'phone', cleaned_phone
  );
end;
$$;

revoke all on function public.update_own_profile(text, text)
  from public, anon, authenticated;
grant execute on function public.update_own_profile(text, text)
  to authenticated;

create trigger profiles_self_service_audit
after update of display_name on public.profiles
for each row
when (old.display_name is distinct from new.display_name)
execute function private.write_configuration_audit();

create trigger administrator_accounts_self_service_audit
after update of phone on public.administrator_accounts
for each row
when (old.phone is distinct from new.phone)
execute function private.write_configuration_audit();

comment on function public.update_own_profile(text, text) is
  'Updates only the authenticated active account holder display name and phone under RLS.';
