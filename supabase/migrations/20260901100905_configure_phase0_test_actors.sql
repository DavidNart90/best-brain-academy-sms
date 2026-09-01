-- Test-only fixture assignment. The fixed synthetic emails identify the actors;
-- generated Auth UUIDs and passwords never enter migration history.
do $configure_test_actors$
declare
  allowed_id uuid;
  denied_id uuid;
  disabled_id uuid;
begin
  select id into allowed_id
  from auth.users
  where email = 'phase0-allowed@example.invalid';

  select id into denied_id
  from auth.users
  where email = 'phase0-denied@example.invalid';

  select id into disabled_id
  from auth.users
  where email = 'phase0-disabled@example.invalid';

  if allowed_id is null or denied_id is null or disabled_id is null then
    raise exception 'Test actor configuration requires all three synthetic Auth users';
  end if;

  if allowed_id = denied_id or allowed_id = disabled_id or denied_id = disabled_id then
    raise exception 'Test actor identities must be distinct';
  end if;

  if exists (
    select 1
    from auth.users
    where id in (allowed_id, denied_id, disabled_id)
      and email_confirmed_at is null
  ) then
    raise exception 'Test actors must be email-confirmed';
  end if;

  if (
    select count(*)
    from public.profiles
    where id in (allowed_id, denied_id, disabled_id)
      and status = 'pending'
  ) <> 3 then
    raise exception 'Test actor profiles must start pending';
  end if;

  if exists (
    select 1
    from public.user_roles
    where user_id in (allowed_id, denied_id, disabled_id)
  ) then
    raise exception 'Test actors must not have pre-existing role assignments';
  end if;

  update public.profiles
  set status = case
    when id = disabled_id then 'disabled'
    else 'active'
  end
  where id in (allowed_id, disabled_id);

  insert into public.user_roles (user_id, role_code)
  values
    (allowed_id, 'SUPER_ADMIN'),
    (disabled_id, 'SUPER_ADMIN');

  if (select status from public.profiles where id = allowed_id) <> 'active'
    or (select status from public.profiles where id = denied_id) <> 'pending'
    or (select status from public.profiles where id = disabled_id) <> 'disabled'
    or (select count(*) from public.user_roles where user_id = allowed_id and role_code = 'SUPER_ADMIN') <> 1
    or (select count(*) from public.user_roles where user_id = denied_id) <> 0
    or (select count(*) from public.user_roles where user_id = disabled_id and role_code = 'SUPER_ADMIN') <> 1 then
    raise exception 'Test actor configuration verification failed';
  end if;
end;
$configure_test_actors$;
