-- Allow authorized school administrators to correct student identity and
-- personal details without changing status, guardian, enrollment or finance history.
set lock_timeout = '5s';

create or replace function public.update_student(
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
  requested_date_of_birth date;
  requested_admission_date date;
  requested_has_disability boolean;
  updated_id bigint;
begin
  if actor_id is null or not (select private.has_permission('students.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Student management permission is required.';
  end if;

  if jsonb_typeof(payload) is distinct from 'object'
    or jsonb_typeof(payload->'admissionNumber') is distinct from 'string'
    or jsonb_typeof(payload->'firstName') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'middleName'), 'null') not in ('string', 'null')
    or jsonb_typeof(payload->'lastName') is distinct from 'string'
    or jsonb_typeof(payload->'gender') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'dateOfBirth'), 'null') not in ('string', 'null')
    or jsonb_typeof(payload->'admissionDate') is distinct from 'string'
    or jsonb_typeof(payload->'hasDisability') is distinct from 'boolean'
    or coalesce(jsonb_typeof(payload->'disabilityDetails'), 'null') not in ('string', 'null')
    or jsonb_typeof(payload->'religiousDenomination') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'previousSchool'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'notes'), 'null') not in ('string', 'null') then
    raise exception using
      errcode = '22023',
      message = 'Review the student details.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(payload) as item(key)
    where item.key not in (
      'admissionNumber',
      'firstName',
      'middleName',
      'lastName',
      'gender',
      'dateOfBirth',
      'admissionDate',
      'hasDisability',
      'disabilityDetails',
      'religiousDenomination',
      'previousSchool',
      'notes'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'The student update contains an unsupported field.';
  end if;

  if lower(payload->>'gender') not in ('female', 'male') then
    raise exception using
      errcode = '22023',
      message = 'Choose a gender.';
  end if;

  requested_date_of_birth := nullif(payload->>'dateOfBirth', '')::date;
  requested_admission_date := (payload->>'admissionDate')::date;
  requested_has_disability := (payload->>'hasDisability')::boolean;

  if requested_date_of_birth is not null
    and requested_date_of_birth > requested_admission_date then
    raise exception using
      errcode = '22023',
      message = 'Date of birth cannot be after the admission date.';
  end if;

  if requested_has_disability
    and nullif(btrim(payload->>'disabilityDetails'), '') is null then
    raise exception using
      errcode = '22023',
      message = 'State the disability when Yes is selected.';
  end if;

  perform 1
  from public.students
  where id = target_student_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'The student record is no longer available.';
  end if;

  if exists (
    select 1
    from public.students student
    where student.id <> target_student_id
      and upper(student.admission_number) = upper(btrim(payload->>'admissionNumber'))
  ) then
    raise exception using
      errcode = '23505',
      message = 'That admission number already belongs to another student.';
  end if;

  if requested_date_of_birth is not null and exists (
    select 1
    from public.students student
    where student.id <> target_student_id
      and lower(student.first_name) = lower(btrim(payload->>'firstName'))
      and lower(student.last_name) = lower(btrim(payload->>'lastName'))
      and student.date_of_birth = requested_date_of_birth
  ) then
    raise exception using
      errcode = '23505',
      message = 'A possible duplicate student with the same name and date of birth already exists.';
  end if;

  update public.students
  set
    admission_number = upper(btrim(payload->>'admissionNumber')),
    first_name = btrim(payload->>'firstName'),
    middle_name = nullif(btrim(payload->>'middleName'), ''),
    last_name = btrim(payload->>'lastName'),
    gender = lower(payload->>'gender'),
    date_of_birth = requested_date_of_birth,
    admission_date = requested_admission_date,
    has_disability = requested_has_disability,
    disability_details = case
      when requested_has_disability
        then nullif(btrim(payload->>'disabilityDetails'), '')
      else null
    end,
    religious_denomination = btrim(payload->>'religiousDenomination'),
    previous_school = nullif(btrim(payload->>'previousSchool'), ''),
    notes = nullif(btrim(payload->>'notes'), ''),
    updated_by = actor_id
  where id = target_student_id
  returning id into updated_id;

  return jsonb_build_object('studentId', updated_id);
end;
$$;

revoke all on function public.update_student(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_student(bigint, jsonb) to authenticated;

comment on function public.update_student(bigint, jsonb) is
  'Updates an allowlisted set of student identity and personal fields for users with students.manage; lifecycle and historical records are excluded.';

reset lock_timeout;
