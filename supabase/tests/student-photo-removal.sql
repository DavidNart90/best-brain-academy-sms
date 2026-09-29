-- Focused rollback-only proof for Super Administrator student-photo removal.
begin;

do $$
declare
  super_admin uuid := gen_random_uuid();
  administrator uuid := gen_random_uuid();
  super_session uuid := gen_random_uuid();
  administrator_session uuid := gen_random_uuid();
  student_id bigint;
  attached_photo_path text;
begin
  if has_function_privilege(
    'anon',
    'public.remove_student_photo(bigint)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users can remove student photos.';
  end if;

  insert into auth.users (id, email, raw_user_meta_data)
  values
    (
      super_admin,
      'photo-super-' || super_admin::text || '@example.invalid',
      '{"display_name":"Photo Super Administrator"}'
    ),
    (
      administrator,
      'photo-admin-' || administrator::text || '@example.invalid',
      '{"display_name":"Photo Administrator"}'
    );

  update public.profiles
  set status = 'active', must_change_password = false
  where id in (super_admin, administrator);

  insert into public.user_roles (user_id, role_code)
  values
    (super_admin, 'SUPER_ADMIN'),
    (administrator, 'ADMINISTRATOR');

  insert into auth.sessions (id, user_id, not_after)
  values
    (super_session, super_admin, now() + interval '10 minutes'),
    (administrator_session, administrator, now() + interval '10 minutes');

  insert into public.students (
    admission_number,
    first_name,
    last_name,
    gender,
    admission_date,
    has_disability,
    religious_denomination,
    created_by,
    updated_by
  ) values (
    'BBA-' || (
      900000000000 + floor(random() * 99999999999)
    )::bigint::text,
    'Photo',
    'Removal',
    'female',
    current_date,
    false,
    'Not recorded',
    super_admin,
    super_admin
  ) returning id into student_id;

  attached_photo_path := student_id::text || '/' || gen_random_uuid()::text || '.jpg';
  update public.students
  set photo_path = attached_photo_path
  where id = student_id;

  perform set_config('test.photo_super_admin', super_admin::text, true);
  perform set_config('test.photo_super_session', super_session::text, true);
  perform set_config('test.photo_administrator', administrator::text, true);
  perform set_config('test.photo_administrator_session', administrator_session::text, true);
  perform set_config('test.photo_student', student_id::text, true);
  perform set_config('test.photo_path', attached_photo_path, true);
end;
$$;

set local role authenticated;

do $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('test.photo_administrator'),
      'role', 'authenticated',
      'session_id', current_setting('test.photo_administrator_session')
    )::text,
    true
  );

  begin
    perform public.remove_student_photo(
      current_setting('test.photo_student')::bigint
    );
    raise exception 'An Administrator removed a student photo.';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
declare
  result jsonb;
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', current_setting('test.photo_super_admin'),
      'role', 'authenticated',
      'session_id', current_setting('test.photo_super_session')
    )::text,
    true
  );

  result := public.remove_student_photo(
    current_setting('test.photo_student')::bigint
  );

  if result->>'removedPhotoPath' <> current_setting('test.photo_path') then
    raise exception 'The removal operation returned the wrong Storage path.';
  end if;
  if (
    select photo_path
    from public.students
    where id = current_setting('test.photo_student')::bigint
  ) is not null then
    raise exception 'The student photo reference was not cleared.';
  end if;
  if (
    select count(*)
    from public.audit_logs
    where actor_user_id = current_setting('test.photo_super_admin')::uuid
      and action = 'update'
      and entity_type = 'students'
      and entity_id = current_setting('test.photo_student')
      and old_values->>'photo_path' = current_setting('test.photo_path')
      and new_values->>'photo_path' is null
  ) <> 1 then
    raise exception 'Student photo removal audit evidence is missing.';
  end if;

  begin
    perform public.remove_student_photo(
      current_setting('test.photo_student')::bigint
    );
    raise exception 'A student without a photo was accepted for removal.';
  exception when sqlstate '22023' then
    null;
  end;
end;
$$;

reset role;
select jsonb_build_object('passed', true, 'checks', 6) as result;
rollback;
