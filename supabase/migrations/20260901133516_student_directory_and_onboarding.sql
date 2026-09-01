-- Phase 2 student directory and onboarding slice.
-- Creates no invoice, fee, payment, receipt, or other financial records.

insert into public.permissions(code, description)
values
  ('students.manage', 'Create and maintain student and enrollment records'),
  ('students.import', 'Preview and confirm student spreadsheet imports'),
  ('students.export', 'Export the authorized student directory');

insert into public.role_permissions(role_code, permission_code)
values
  ('SUPER_ADMIN', 'students.manage'),
  ('SUPER_ADMIN', 'students.import'),
  ('SUPER_ADMIN', 'students.export'),
  ('ADMINISTRATOR', 'students.manage'),
  ('ADMINISTRATOR', 'students.import'),
  ('ADMINISTRATOR', 'students.export');

create table public.students (
  id bigint generated always as identity primary key,
  admission_number text not null,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  middle_name text check (middle_name is null or char_length(btrim(middle_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  gender text not null check (gender in ('female', 'male')),
  date_of_birth date,
  admission_date date not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'graduated', 'withdrawn')),
  previous_school text check (previous_school is null or char_length(btrim(previous_school)) <= 160),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_admission_number_format_check
    check (admission_number ~ '^[A-Z0-9][A-Z0-9/-]{2,39}$'),
  constraint students_birth_before_admission_check
    check (date_of_birth is null or date_of_birth <= admission_date)
);
create unique index students_admission_number_unique
  on public.students (upper(admission_number));
create index students_status_name_idx
  on public.students (status, lower(last_name), lower(first_name), id);
create index students_admission_date_idx
  on public.students (admission_date desc, id desc);
create index students_identity_lookup_idx
  on public.students (lower(first_name), lower(last_name), date_of_birth)
  where date_of_birth is not null;
create index students_created_by_idx on public.students (created_by);
create index students_updated_by_idx on public.students (updated_by);

create table public.guardians (
  id bigint generated always as identity primary key,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  primary_phone text not null check (char_length(btrim(primary_phone)) between 7 and 40),
  alternative_phone text check (
    alternative_phone is null or char_length(btrim(alternative_phone)) between 7 and 40
  ),
  email text check (email is null or char_length(btrim(email)) <= 254),
  address text check (address is null or char_length(address) <= 500),
  identity_key text generated always as (
    lower(btrim(full_name)) || ':' || regexp_replace(lower(primary_phone), '[^0-9+]', '', 'g')
  ) stored,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_key)
);
create index guardians_phone_idx
  on public.guardians (regexp_replace(lower(primary_phone), '[^0-9+]', '', 'g'));
create index guardians_created_by_idx on public.guardians (created_by);
create index guardians_updated_by_idx on public.guardians (updated_by);

create table public.student_guardians (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete restrict,
  guardian_id bigint not null references public.guardians(id) on delete restrict,
  relationship text not null check (char_length(btrim(relationship)) between 2 and 60),
  is_primary boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, guardian_id)
);
create unique index student_guardians_one_primary_idx
  on public.student_guardians (student_id) where is_primary;
create index student_guardians_guardian_idx on public.student_guardians (guardian_id, student_id);
create index student_guardians_created_by_idx on public.student_guardians (created_by);
create index student_guardians_updated_by_idx on public.student_guardians (updated_by);

create table public.student_enrollments (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint not null references public.classes(id) on delete restrict,
  school_location_id bigint not null references public.school_locations(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'completed', 'transferred', 'withdrawn')),
  started_on date not null,
  ended_on date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_enrollments_dates_check
    check (ended_on is null or ended_on >= started_on),
  constraint student_enrollments_active_open_check
    check (status <> 'active' or ended_on is null),
  unique (student_id, academic_year_id, academic_term_id)
);
create unique index student_enrollments_one_active_idx
  on public.student_enrollments (student_id) where status = 'active';
create index student_enrollments_directory_idx
  on public.student_enrollments (status, academic_year_id, academic_term_id, class_id, school_location_id, student_id);
create index student_enrollments_year_idx on public.student_enrollments (academic_year_id);
create index student_enrollments_term_idx on public.student_enrollments (academic_term_id);
create index student_enrollments_class_idx on public.student_enrollments (class_id);
create index student_enrollments_location_idx on public.student_enrollments (school_location_id);
create index student_enrollments_created_by_idx on public.student_enrollments (created_by);
create index student_enrollments_updated_by_idx on public.student_enrollments (updated_by);

create trigger students_stamp before insert or update on public.students
  for each row execute function private.stamp_configuration_record();
create trigger students_audit after insert or update or delete on public.students
  for each row execute function private.write_configuration_audit();
create trigger guardians_stamp before insert or update on public.guardians
  for each row execute function private.stamp_configuration_record();
create trigger guardians_audit after insert or update or delete on public.guardians
  for each row execute function private.write_configuration_audit();
create trigger student_guardians_stamp before insert or update on public.student_guardians
  for each row execute function private.stamp_configuration_record();
create trigger student_guardians_audit after insert or update or delete on public.student_guardians
  for each row execute function private.write_configuration_audit();
create trigger student_enrollments_stamp before insert or update on public.student_enrollments
  for each row execute function private.stamp_configuration_record();
create trigger student_enrollments_audit after insert or update or delete on public.student_enrollments
  for each row execute function private.write_configuration_audit();

alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;
alter table public.student_enrollments enable row level security;

revoke all on public.students, public.guardians, public.student_guardians,
  public.student_enrollments from public, anon, authenticated;
grant select on public.students, public.guardians, public.student_guardians,
  public.student_enrollments to authenticated;

create policy students_read_authorized on public.students for select to authenticated
  using ((select private.has_permission('students.read')));
create policy guardians_read_authorized on public.guardians for select to authenticated
  using ((select private.has_permission('students.read')));
create policy student_guardians_read_authorized on public.student_guardians for select to authenticated
  using ((select private.has_permission('students.read')));
create policy student_enrollments_read_authorized on public.student_enrollments for select to authenticated
  using ((select private.has_permission('students.read')));

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
    raise exception using errcode = '23514', message = 'Choose an active academic year, term, class and school location.';
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
    admission_date, status, previous_school, notes, created_by, updated_by
  ) values (
    upper(btrim(payload->>'admissionNumber')),
    btrim(payload->>'firstName'),
    nullif(btrim(payload->>'middleName'), ''),
    btrim(payload->>'lastName'),
    lower(payload->>'gender'),
    nullif(payload->>'dateOfBirth', '')::date,
    (payload->>'admissionDate')::date,
    lower(payload->>'status'),
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
revoke all on function private.create_student_record(jsonb, uuid) from public, anon, authenticated;

create or replace function public.create_student(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_student_id bigint;
begin
  if not (select private.has_permission('students.manage')) then
    raise exception using errcode = '42501', message = 'Student management permission is required.';
  end if;
  new_student_id := private.create_student_record(payload, actor_id);
  return jsonb_build_object('studentId', new_student_id, 'createdCount', 1);
end;
$$;
revoke all on function public.create_student(jsonb) from public, anon, authenticated;
grant execute on function public.create_student(jsonb) to authenticated;

create or replace function public.import_students(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  item jsonb;
  imported_count integer := 0;
begin
  if not (select private.has_permission('students.import')) then
    raise exception using errcode = '42501', message = 'Student import permission is required.';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) not between 1 and 250 then
    raise exception using errcode = '22023', message = 'Import between 1 and 250 students at a time.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(payload) row
    group by upper(btrim(row->>'admissionNumber'))
    having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'The import contains duplicate admission numbers.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(payload) row
    join public.students student
      on upper(student.admission_number) = upper(btrim(row->>'admissionNumber'))
  ) then
    raise exception using errcode = '23505', message = 'One or more admission numbers already exist.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(payload) row
    join public.students student
      on lower(student.first_name) = lower(btrim(row->>'firstName'))
      and lower(student.last_name) = lower(btrim(row->>'lastName'))
      and student.date_of_birth = nullif(row->>'dateOfBirth', '')::date
    where nullif(row->>'dateOfBirth', '') is not null
  ) then
    raise exception using errcode = '23505', message = 'One or more possible duplicate students already exist.';
  end if;
  for item in select value from jsonb_array_elements(payload)
  loop
    perform private.create_student_record(item, actor_id);
    imported_count := imported_count + 1;
  end loop;
  return jsonb_build_object('createdCount', imported_count);
end;
$$;
revoke all on function public.import_students(jsonb) from public, anon, authenticated;
grant execute on function public.import_students(jsonb) to authenticated;

create view public.student_directory
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
  guardian.primary_phone as guardian_phone
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
