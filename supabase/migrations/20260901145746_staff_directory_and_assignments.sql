-- Phase 2 staff directory, import, profile and assignment history.
-- Staff records remain independent from Auth administrator accounts.

insert into public.permissions(code, description)
values
  ('staff.manage', 'Create, assign and archive staff records'),
  ('staff.import', 'Preview and confirm staff spreadsheet imports'),
  ('staff.export', 'Export the authorized staff directory');

insert into public.role_permissions(role_code, permission_code)
values
  ('SUPER_ADMIN', 'staff.manage'),
  ('SUPER_ADMIN', 'staff.import'),
  ('SUPER_ADMIN', 'staff.export'),
  ('ADMINISTRATOR', 'staff.manage'),
  ('ADMINISTRATOR', 'staff.import'),
  ('ADMINISTRATOR', 'staff.export');

create table public.staff (
  id bigint generated always as identity primary key,
  staff_number text not null,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  middle_name text check (middle_name is null or char_length(btrim(middle_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  phone text not null check (char_length(btrim(phone)) between 7 and 40),
  email text check (email is null or char_length(btrim(email)) <= 254),
  staff_type text not null check (staff_type in ('teaching', 'non_teaching')),
  position text not null check (char_length(btrim(position)) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  date_joined date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_number_format_check check (staff_number ~ '^[A-Z0-9][A-Z0-9/-]{2,39}$')
);
create unique index staff_number_unique on public.staff (upper(staff_number));
create index staff_status_name_idx on public.staff (status, lower(last_name), lower(first_name), id);
create index staff_type_idx on public.staff (staff_type, status, id);
create index staff_created_by_idx on public.staff (created_by);
create index staff_updated_by_idx on public.staff (updated_by);

create table public.staff_assignments (
  id bigint generated always as identity primary key,
  staff_id bigint not null references public.staff(id) on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint not null references public.classes(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed')),
  started_on date not null,
  ended_on date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_assignments_dates_check check (ended_on is null or ended_on >= started_on),
  constraint staff_assignments_active_open_check check (status <> 'active' or ended_on is null),
  unique (staff_id, academic_year_id, academic_term_id, class_id)
);
create index staff_assignments_staff_history_idx on public.staff_assignments (staff_id, started_on desc, id desc);
create index staff_assignments_active_class_idx on public.staff_assignments (class_id, academic_year_id, academic_term_id, staff_id) where status = 'active';
create index staff_assignments_year_idx on public.staff_assignments (academic_year_id);
create index staff_assignments_term_idx on public.staff_assignments (academic_term_id);
create index staff_assignments_created_by_idx on public.staff_assignments (created_by);
create index staff_assignments_updated_by_idx on public.staff_assignments (updated_by);

create trigger staff_stamp before insert or update on public.staff
  for each row execute function private.stamp_configuration_record();
create trigger staff_audit after insert or update or delete on public.staff
  for each row execute function private.write_configuration_audit();
create trigger staff_assignments_stamp before insert or update on public.staff_assignments
  for each row execute function private.stamp_configuration_record();
create trigger staff_assignments_audit after insert or update or delete on public.staff_assignments
  for each row execute function private.write_configuration_audit();

alter table public.staff enable row level security;
alter table public.staff_assignments enable row level security;
revoke all on public.staff, public.staff_assignments from public, anon, authenticated;
grant select on public.staff, public.staff_assignments to authenticated;
create policy staff_read_authorized on public.staff for select to authenticated
  using ((select private.has_permission('staff.read')));
create policy staff_assignments_read_authorized on public.staff_assignments for select to authenticated
  using ((select private.has_permission('staff.read')));

create or replace function private.create_staff_record(payload jsonb, actor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_staff_id bigint;
  requested_class_id bigint := nullif(payload->>'classId', '')::bigint;
  requested_year_id bigint := nullif(payload->>'academicYearId', '')::bigint;
  requested_term_id bigint := nullif(payload->>'academicTermId', '')::bigint;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A verified account is required.';
  end if;
  if lower(payload->>'status') = 'archived' then
    raise exception using errcode = '22023', message = 'New staff cannot be archived.';
  end if;
  if exists (select 1 from public.staff where upper(staff_number) = upper(btrim(payload->>'staffNumber'))) then
    raise exception using errcode = '23505', message = 'That staff ID already belongs to a staff member.';
  end if;
  if requested_class_id is not null and not exists (
    select 1
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    join public.classes class on class.id = requested_class_id
    where year.id = requested_year_id and term.id = requested_term_id
      and year.status = 'active' and term.status = 'active' and class.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year, term and class.';
  end if;

  insert into public.staff(
    staff_number, first_name, middle_name, last_name, phone, email,
    staff_type, position, status, date_joined, created_by, updated_by
  ) values (
    upper(btrim(payload->>'staffNumber')),
    btrim(payload->>'firstName'),
    nullif(btrim(payload->>'middleName'), ''),
    btrim(payload->>'lastName'),
    btrim(payload->>'phone'),
    nullif(lower(btrim(payload->>'email')), ''),
    lower(payload->>'staffType'),
    btrim(payload->>'position'),
    lower(payload->>'status'),
    nullif(payload->>'dateJoined', '')::date,
    actor_id, actor_id
  ) returning id into new_staff_id;

  if requested_class_id is not null then
    insert into public.staff_assignments(
      staff_id, academic_year_id, academic_term_id, class_id, status,
      started_on, created_by, updated_by
    ) values (
      new_staff_id, requested_year_id, requested_term_id, requested_class_id,
      'active', coalesce(nullif(payload->>'assignmentStartedOn', '')::date,
      nullif(payload->>'dateJoined', '')::date, current_date), actor_id, actor_id
    );
  end if;
  return new_staff_id;
end;
$$;
revoke all on function private.create_staff_record(jsonb, uuid) from public, anon, authenticated;

create or replace function public.create_staff(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_staff_id bigint;
begin
  if not (select private.has_permission('staff.manage')) then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  new_staff_id := private.create_staff_record(payload, actor_id);
  return jsonb_build_object('staffId', new_staff_id, 'createdCount', 1);
end;
$$;
revoke all on function public.create_staff(jsonb) from public, anon, authenticated;
grant execute on function public.create_staff(jsonb) to authenticated;

create or replace function public.import_staff(payload jsonb)
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
  if not (select private.has_permission('staff.import')) then
    raise exception using errcode = '42501', message = 'Staff import permission is required.';
  end if;
  if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload) not between 1 and 250 then
    raise exception using errcode = '22023', message = 'Import between 1 and 250 staff at a time.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(payload) row
    group by upper(btrim(row->>'staffNumber')) having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'The import contains duplicate staff IDs.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(payload) row
    join public.staff member on upper(member.staff_number) = upper(btrim(row->>'staffNumber'))
  ) then
    raise exception using errcode = '23505', message = 'One or more staff IDs already exist.';
  end if;
  for item in select value from jsonb_array_elements(payload)
  loop
    perform private.create_staff_record(item, actor_id);
    imported_count := imported_count + 1;
  end loop;
  return jsonb_build_object('createdCount', imported_count);
end;
$$;
revoke all on function public.import_staff(jsonb) from public, anon, authenticated;
grant execute on function public.import_staff(jsonb) to authenticated;

create or replace function public.assign_staff_class(target_staff_id bigint, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  new_assignment_id bigint;
  requested_year_id bigint := (payload->>'academicYearId')::bigint;
  requested_term_id bigint := (payload->>'academicTermId')::bigint;
  requested_class_id bigint := (payload->>'classId')::bigint;
begin
  if not (select private.has_permission('staff.manage')) then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  if not exists (select 1 from public.staff where id = target_staff_id and status = 'active') then
    raise exception using errcode = '22023', message = 'Only active staff can receive assignments.';
  end if;
  if not exists (
    select 1 from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    join public.classes class on class.id = requested_class_id
    where year.id = requested_year_id and term.id = requested_term_id
      and year.status = 'active' and term.status = 'active' and class.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year, term and class.';
  end if;
  insert into public.staff_assignments(
    staff_id, academic_year_id, academic_term_id, class_id, status,
    started_on, created_by, updated_by
  ) values (
    target_staff_id, requested_year_id, requested_term_id, requested_class_id,
    'active', (payload->>'startedOn')::date, actor_id, actor_id
  ) returning id into new_assignment_id;
  return jsonb_build_object('assignmentId', new_assignment_id);
end;
$$;
revoke all on function public.assign_staff_class(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.assign_staff_class(bigint, jsonb) to authenticated;

create or replace function public.end_staff_assignment(target_assignment_id bigint, target_ended_on date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_staff_id bigint;
begin
  if not (select private.has_permission('staff.manage')) then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  update public.staff_assignments
  set status = 'completed', ended_on = target_ended_on
  where id = target_assignment_id and status = 'active' and target_ended_on >= started_on
  returning staff_id into target_staff_id;
  if target_staff_id is null then
    raise exception using errcode = '22023', message = 'Choose a valid assignment end date.';
  end if;
  return jsonb_build_object('staffId', target_staff_id);
end;
$$;
revoke all on function public.end_staff_assignment(bigint, date) from public, anon, authenticated;
grant execute on function public.end_staff_assignment(bigint, date) to authenticated;

create or replace function public.archive_staff(target_staff_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_permission('staff.manage')) then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  if exists (select 1 from public.staff_assignments where staff_id = target_staff_id and status = 'active') then
    raise exception using errcode = '22023', message = 'End active class assignments before archiving this staff member.';
  end if;
  update public.staff set status = 'archived' where id = target_staff_id and status <> 'archived';
  if not found then
    raise exception using errcode = '22023', message = 'The staff record is already archived or unavailable.';
  end if;
  return jsonb_build_object('staffId', target_staff_id);
end;
$$;
revoke all on function public.archive_staff(bigint) from public, anon, authenticated;
grant execute on function public.archive_staff(bigint) to authenticated;

create view public.staff_directory
with (security_invoker = true)
as
select
  member.id,
  member.staff_number,
  member.first_name,
  member.middle_name,
  member.last_name,
  concat_ws(' ', member.first_name, member.middle_name, member.last_name) as full_name,
  member.phone,
  member.email,
  member.staff_type,
  member.position,
  member.status,
  member.date_joined,
  member.created_at,
  coalesce(string_agg(class.name, ', ' order by class.name) filter (where assignment.status = 'active'), '') as assigned_classes
from public.staff member
left join public.staff_assignments assignment on assignment.staff_id = member.id and assignment.status = 'active'
left join public.classes class on class.id = assignment.class_id
group by member.id;
revoke all on public.staff_directory from public, anon, authenticated;
grant select on public.staff_directory to authenticated;
