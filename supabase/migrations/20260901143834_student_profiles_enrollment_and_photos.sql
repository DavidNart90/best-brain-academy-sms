-- Phase 2 student profile, guardian-link, enrollment-history, and private-photo support.

alter table public.students
  add column photo_path text,
  add constraint students_photo_path_check
    check (
      photo_path is null
      or (
        char_length(photo_path) <= 120
        and photo_path ~ '^[0-9]+/[0-9a-f-]{36}\.(jpg|png|webp)$'
      )
    );

alter table public.student_enrollments
  drop constraint student_enrollments_student_id_academic_year_id_academic_te_key;

create index student_enrollments_history_idx
  on public.student_enrollments (student_id, started_on desc, id desc);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'student-photos',
  'student-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy student_photos_read_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'student-photos'
  and (select private.has_permission('students.read'))
  and exists (
    select 1
    from public.students student
    where student.photo_path = name
  )
);

create policy student_photos_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-photos'
  and (select private.has_permission('students.manage'))
  and exists (
    select 1
    from public.students student
    where student.id::text = (storage.foldername(name))[1]
  )
);

create policy student_photos_delete_authorized
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-photos'
  and (select private.has_permission('students.manage'))
  and exists (
    select 1
    from public.students student
    where student.id::text = (storage.foldername(name))[1]
  )
);

create or replace function public.set_student_photo(
  target_student_id bigint,
  target_photo_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_photo_path text;
begin
  if not (select private.has_permission('students.manage')) then
    raise exception using errcode = '42501', message = 'Student management permission is required.';
  end if;
  if target_photo_path !~ ('^' || target_student_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception using errcode = '22023', message = 'The student photo path is invalid.';
  end if;
  select photo_path into previous_photo_path
  from public.students
  where id = target_student_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;
  update public.students
  set photo_path = target_photo_path
  where id = target_student_id;
  return jsonb_build_object('previousPhotoPath', previous_photo_path);
end;
$$;

revoke all on function public.set_student_photo(bigint, text)
  from public, anon, authenticated;
grant execute on function public.set_student_photo(bigint, text) to authenticated;

create or replace function public.link_student_guardian(
  target_student_id bigint,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  guardian_record_id bigint;
  requested_primary boolean := coalesce((payload->>'isPrimary')::boolean, false);
  guardian_key text := lower(btrim(payload->>'fullName')) || ':' ||
    regexp_replace(lower(payload->>'primaryPhone'), '[^0-9+]', '', 'g');
begin
  if not (select private.has_permission('students.manage')) then
    raise exception using errcode = '42501', message = 'Student management permission is required.';
  end if;
  perform 1 from public.students where id = target_student_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;

  select id into guardian_record_id
  from public.guardians
  where identity_key = guardian_key;

  if guardian_record_id is null then
    insert into public.guardians (
      full_name, primary_phone, alternative_phone, email, address,
      created_by, updated_by
    ) values (
      btrim(payload->>'fullName'),
      btrim(payload->>'primaryPhone'),
      nullif(btrim(payload->>'alternativePhone'), ''),
      nullif(lower(btrim(payload->>'email')), ''),
      nullif(btrim(payload->>'address'), ''),
      actor_id,
      actor_id
    )
    on conflict (identity_key) do nothing
    returning id into guardian_record_id;
    if guardian_record_id is null then
      select id into guardian_record_id
      from public.guardians
      where identity_key = guardian_key;
    end if;
  else
    update public.guardians
    set
      alternative_phone = nullif(btrim(payload->>'alternativePhone'), ''),
      email = nullif(lower(btrim(payload->>'email')), ''),
      address = nullif(btrim(payload->>'address'), '')
    where id = guardian_record_id;
  end if;

  if not exists (
    select 1 from public.student_guardians where student_id = target_student_id
  ) then
    requested_primary := true;
  end if;
  if requested_primary then
    update public.student_guardians
    set is_primary = false
    where student_id = target_student_id and is_primary;
  end if;

  insert into public.student_guardians (
    student_id, guardian_id, relationship, is_primary, created_by, updated_by
  ) values (
    target_student_id,
    guardian_record_id,
    btrim(payload->>'relationship'),
    requested_primary,
    actor_id,
    actor_id
  )
  on conflict (student_id, guardian_id) do update
  set
    relationship = excluded.relationship,
    is_primary = excluded.is_primary or public.student_guardians.is_primary;

  return jsonb_build_object('guardianId', guardian_record_id);
end;
$$;

revoke all on function public.link_student_guardian(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.link_student_guardian(bigint, jsonb) to authenticated;

create or replace function public.change_student_enrollment(
  target_student_id bigint,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_enrollment public.student_enrollments%rowtype;
  new_enrollment_id bigint;
  requested_year_id bigint := (payload->>'academicYearId')::bigint;
  requested_term_id bigint := (payload->>'academicTermId')::bigint;
  requested_class_id bigint := (payload->>'classId')::bigint;
  requested_location_id bigint := (payload->>'schoolLocationId')::bigint;
  requested_start date := (payload->>'startedOn')::date;
begin
  if not (select private.has_permission('students.manage')) then
    raise exception using errcode = '42501', message = 'Student management permission is required.';
  end if;
  select * into current_enrollment
  from public.student_enrollments
  where student_id = target_student_id and status = 'active'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'The student has no active enrollment.';
  end if;
  if requested_start < current_enrollment.started_on then
    raise exception using errcode = '23514', message = 'The new enrollment cannot begin before the current enrollment.';
  end if;
  if not exists (
    select 1
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    join public.classes class on class.id = requested_class_id
    join public.school_locations location on location.id = requested_location_id
    where year.id = requested_year_id
      and term.id = requested_term_id
      and year.status = 'active'
      and term.status = 'active'
      and class.status = 'active'
      and location.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year, term, class and student location.';
  end if;
  if current_enrollment.academic_year_id = requested_year_id
    and current_enrollment.academic_term_id = requested_term_id
    and current_enrollment.class_id = requested_class_id
    and current_enrollment.school_location_id = requested_location_id then
    raise exception using errcode = '22023', message = 'Choose a different enrollment assignment.';
  end if;

  update public.student_enrollments
  set status = 'transferred', ended_on = requested_start
  where id = current_enrollment.id;

  insert into public.student_enrollments (
    student_id, academic_year_id, academic_term_id, class_id,
    school_location_id, status, started_on, created_by, updated_by
  ) values (
    target_student_id,
    requested_year_id,
    requested_term_id,
    requested_class_id,
    requested_location_id,
    'active',
    requested_start,
    actor_id,
    actor_id
  )
  returning id into new_enrollment_id;

  return jsonb_build_object('enrollmentId', new_enrollment_id);
end;
$$;

revoke all on function public.change_student_enrollment(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.change_student_enrollment(bigint, jsonb) to authenticated;
