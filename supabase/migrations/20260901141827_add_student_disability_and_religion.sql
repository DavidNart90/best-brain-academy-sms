-- Extend student onboarding with disability and religious denomination details.
-- Existing RLS, audit triggers, and transactional write boundaries remain unchanged.

alter table public.students
  add column has_disability boolean not null,
  add column disability_details text,
  add column religious_denomination text not null;

alter table public.students
  add constraint students_disability_details_check
    check (
      (has_disability and disability_details is not null
        and char_length(btrim(disability_details)) between 2 and 500)
      or
      (not has_disability and disability_details is null)
    ),
  add constraint students_religious_denomination_check
    check (char_length(btrim(religious_denomination)) between 2 and 120);

create or replace function private.create_student_record(payload jsonb, actor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_student_id bigint;
  guardian_record_id bigint;
  requested_year_id bigint := (payload->>'academicYearId')::bigint;
  requested_term_id bigint := (payload->>'academicTermId')::bigint;
  requested_class_id bigint := (payload->>'classId')::bigint;
  requested_location_id bigint := (payload->>'schoolLocationId')::bigint;
  requested_has_disability boolean := (payload->>'hasDisability')::boolean;
  guardian_key text := lower(btrim(payload->>'guardianName')) || ':' ||
    regexp_replace(lower(payload->>'guardianPhone'), '[^0-9+]', '', 'g');
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A verified account is required.';
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
  if exists (
    select 1 from public.students
    where upper(admission_number) = upper(btrim(payload->>'admissionNumber'))
  ) then
    raise exception using errcode = '23505', message = 'That admission number already belongs to a student.';
  end if;
  if nullif(payload->>'dateOfBirth', '') is not null and exists (
    select 1 from public.students
    where lower(first_name) = lower(btrim(payload->>'firstName'))
      and lower(last_name) = lower(btrim(payload->>'lastName'))
      and date_of_birth = (payload->>'dateOfBirth')::date
  ) then
    raise exception using errcode = '23505', message = 'A possible duplicate student with the same name and date of birth already exists.';
  end if;

  insert into public.students(
    admission_number, first_name, middle_name, last_name, gender, date_of_birth,
    admission_date, status, has_disability, disability_details,
    religious_denomination, previous_school, notes, created_by, updated_by
  ) values (
    upper(btrim(payload->>'admissionNumber')),
    btrim(payload->>'firstName'),
    nullif(btrim(payload->>'middleName'), ''),
    btrim(payload->>'lastName'),
    lower(payload->>'gender'),
    nullif(payload->>'dateOfBirth', '')::date,
    (payload->>'admissionDate')::date,
    lower(payload->>'status'),
    requested_has_disability,
    case
      when requested_has_disability then nullif(btrim(payload->>'disabilityDetails'), '')
      else null
    end,
    btrim(payload->>'religiousDenomination'),
    nullif(btrim(payload->>'previousSchool'), ''),
    nullif(btrim(payload->>'notes'), ''),
    actor_id,
    actor_id
  ) returning id into new_student_id;

  select id into guardian_record_id
  from public.guardians
  where identity_key = guardian_key;
  if guardian_record_id is null then
    insert into public.guardians(
      full_name, primary_phone, alternative_phone, email, address, created_by, updated_by
    ) values (
      btrim(payload->>'guardianName'),
      btrim(payload->>'guardianPhone'),
      nullif(btrim(payload->>'guardianAlternativePhone'), ''),
      nullif(lower(btrim(payload->>'guardianEmail')), ''),
      nullif(btrim(payload->>'guardianAddress'), ''),
      actor_id,
      actor_id
    )
    on conflict (identity_key) do nothing
    returning id into guardian_record_id;
    if guardian_record_id is null then
      select id into guardian_record_id from public.guardians where identity_key = guardian_key;
    end if;
  end if;

  insert into public.student_guardians(
    student_id, guardian_id, relationship, is_primary, created_by, updated_by
  ) values (
    new_student_id,
    guardian_record_id,
    btrim(payload->>'guardianRelationship'),
    true,
    actor_id,
    actor_id
  );

  insert into public.student_enrollments(
    student_id, academic_year_id, academic_term_id, class_id, school_location_id,
    status, started_on, created_by, updated_by
  ) values (
    new_student_id,
    requested_year_id,
    requested_term_id,
    requested_class_id,
    requested_location_id,
    'active',
    (payload->>'admissionDate')::date,
    actor_id,
    actor_id
  );
  return new_student_id;
end;
$$;

revoke all on function private.create_student_record(jsonb, uuid)
  from public, anon, authenticated;

create or replace view public.student_directory
with (security_invoker = true)
as
select
  student.id,
  student.admission_number,
  student.first_name,
  student.middle_name,
  student.last_name,
  concat_ws(' ', student.first_name, student.middle_name, student.last_name) as full_name,
  student.gender,
  student.date_of_birth,
  student.admission_date,
  student.status,
  student.created_at,
  enrollment.id as enrollment_id,
  enrollment.academic_year_id,
  year.name as academic_year_name,
  enrollment.academic_term_id,
  term.name as academic_term_name,
  enrollment.class_id,
  class.name as class_name,
  enrollment.school_location_id,
  location.name as school_location_name,
  guardian.full_name as guardian_name,
  guardian.primary_phone as guardian_phone,
  student.has_disability,
  student.disability_details,
  student.religious_denomination
from public.students student
join public.student_enrollments enrollment
  on enrollment.student_id = student.id and enrollment.status = 'active'
join public.academic_years year on year.id = enrollment.academic_year_id
join public.academic_terms term on term.id = enrollment.academic_term_id
join public.classes class on class.id = enrollment.class_id
join public.school_locations location on location.id = enrollment.school_location_id
left join public.student_guardians student_guardian
  on student_guardian.student_id = student.id and student_guardian.is_primary
left join public.guardians guardian on guardian.id = student_guardian.guardian_id;

revoke all on public.student_directory from public, anon, authenticated;
grant select on public.student_directory to authenticated;
