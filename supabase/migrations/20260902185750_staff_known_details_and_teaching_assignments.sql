-- STAFF-01: known-details-first onboarding, server IDs and explicit teaching pairs.
-- Forward-only: preserve existing staff identifiers and assignment history.
-- Real roster data is deliberately excluded from this migration.
set lock_timeout = '5s';

alter table public.staff
  alter column phone drop not null,
  alter column first_name drop not null,
  alter column last_name drop not null,
  add column recorded_name text check (char_length(btrim(recorded_name)) between 1 and 242),
  add column known_subjects text[] not null default '{}',
  drop constraint staff_number_format_check,
  add constraint staff_number_format_check check (staff_number ~ '^[A-Za-z0-9][A-Za-z0-9/-]{2,39}$'),
  add constraint staff_name_required check (recorded_name is not null or (first_name is not null and last_name is not null)),
  add constraint staff_subjects_teaching_only check (staff_type = 'teaching' or cardinality(known_subjects) = 0);

create function private.valid_staff_subjects(subjects text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(subjects) <= 30
    and not exists (select 1 from unnest(subjects) s where s is null or char_length(btrim(s)) not between 1 and 120)
    and (select count(*) = count(distinct lower(btrim(s))) from unnest(subjects) s);
$$;
revoke all on function private.valid_staff_subjects(text[]) from public, anon, authenticated;
alter table public.staff add constraint staff_subjects_valid check (private.valid_staff_subjects(known_subjects));

-- A transactional counter avoids consuming the initial roster's IDs on failed batches.
create table private.staff_number_counter (
  id smallint primary key check (id = 1),
  next_value bigint not null check (next_value between 1 and 999999999999)
);
alter table private.staff_number_counter enable row level security;
revoke all on private.staff_number_counter from public, anon, authenticated;
insert into private.staff_number_counter(id, next_value)
select 1, coalesce(max(substring(staff_number from 11)::bigint), 0) + 1
from public.staff where staff_number ~* '^BBS-Staff-[0-9]{3,12}$';

create table private.staff_requests (
  request_key uuid primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null check (operation in ('create', 'import')),
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index staff_requests_actor_idx on private.staff_requests(actor_id);
alter table private.staff_requests enable row level security;
revoke all on private.staff_requests from public, anon, authenticated;

alter table public.staff_assignments
  drop constraint staff_assignments_staff_id_academic_year_id_academic_term_i_key,
  add column assignment_kind text not null default 'general' check (assignment_kind in ('general', 'teaching', 'head')),
  add column subject_name text,
  add constraint staff_assignment_subject_check check (
    (assignment_kind = 'teaching' and subject_name is not null and char_length(btrim(subject_name)) between 1 and 120)
    or (assignment_kind in ('general', 'head') and subject_name is null)
  );
create unique index staff_assignment_active_unique on public.staff_assignments
  (staff_id, academic_year_id, academic_term_id, class_id, assignment_kind, lower(coalesce(subject_name, '')))
  where status = 'active';

create function private.add_staff_assignment(target_staff_id bigint, payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  member public.staff;
  new_id bigint;
  requested_year bigint := (payload->>'academicYearId')::bigint;
  requested_term bigint := (payload->>'academicTermId')::bigint;
  requested_class bigint := (payload->>'classId')::bigint;
  requested_start date := (payload->>'startedOn')::date;
  requested_kind text := coalesce(payload->>'assignmentKind', 'general');
  requested_subject text := nullif(btrim(payload->>'subjectName'), '');
begin
  if auth.uid() is null or not (private.has_permission('staff.manage') or private.has_permission('staff.import')) then
    raise exception using errcode = '42501', message = 'Staff permission is required.';
  end if;
  select * into member from public.staff where id = target_staff_id for update;
  if member.id is null or member.status <> 'active' or member.staff_type <> 'teaching' then
    raise exception using errcode = '22023', message = 'Only active teaching staff can receive class assignments.';
  end if;
  if requested_start is null or not exists (
    select 1 from public.academic_terms t
    join public.academic_years y on y.id = t.academic_year_id
    join public.classes c on c.id = requested_class
    where t.id = requested_term and y.id = requested_year
      and t.status = 'active' and y.status = 'active' and c.status = 'active'
      and (t.starts_on is null or requested_start >= t.starts_on)
      and (t.ends_on is null or requested_start <= t.ends_on)
  ) then
    raise exception using errcode = '22023', message = 'Choose an active academic period, class and a start date within the term.';
  end if;
  insert into public.staff_assignments(staff_id, academic_year_id, academic_term_id, class_id,
    started_on, assignment_kind, subject_name, created_by, updated_by)
  values (target_staff_id, requested_year, requested_term, requested_class,
    requested_start, requested_kind, requested_subject, auth.uid(), auth.uid()) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function private.add_staff_assignment(bigint, jsonb) from public, anon, authenticated;

create or replace function private.create_staff_record(payload jsonb, actor_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  new_staff_id bigint;
  number_value bigint;
  allocated_number text;
  assignment jsonb;
  assignments jsonb := coalesce(payload->'assignments', '[]'::jsonb);
  subjects text[];
begin
  if actor_id is null or actor_id is distinct from auth.uid()
     or not (private.has_permission('staff.manage') or private.has_permission('staff.import')) then
    raise exception using errcode = '42501', message = 'A verified staff operator is required.';
  end if;
  if jsonb_typeof(payload) is distinct from 'object'
    or jsonb_typeof(assignments) is distinct from 'array'
    or jsonb_array_length(assignments) > 100
    or jsonb_typeof(coalesce(payload->'knownSubjects', '[]'::jsonb)) is distinct from 'array'
    or exists (select 1 from jsonb_array_elements(coalesce(payload->'knownSubjects', '[]'::jsonb)) s where jsonb_typeof(s) <> 'string') then
    raise exception using errcode = '22023', message = 'Review the staff subjects and assignments.';
  end if;
  if payload->>'status' not in ('active', 'inactive') then
    raise exception using errcode = '22023', message = 'Choose an active or inactive employment status.';
  end if;
  select array(select btrim(s) from jsonb_array_elements_text(coalesce(payload->'knownSubjects', '[]'::jsonb)) s) into subjects;
  select next_value into number_value from private.staff_number_counter where id = 1 for update;
  allocated_number := 'BBS-Staff-' || lpad(number_value::text, greatest(3, length(number_value::text)), '0');
  if nullif(btrim(payload->>'staffNumber'), '') is not null and payload->>'staffNumber' <> allocated_number then
    raise exception using errcode = '22023', message = 'The expected staff ID is not the next available ID. Refresh the import preview.';
  end if;
  update private.staff_number_counter set next_value = next_value + 1 where id = 1;
  insert into public.staff(staff_number, recorded_name, first_name, middle_name, last_name, phone, email,
    staff_type, position, status, date_joined, known_subjects, created_by, updated_by)
  values (allocated_number, nullif(btrim(payload->>'fullName'), ''), nullif(btrim(payload->>'firstName'), ''),
    nullif(btrim(payload->>'middleName'), ''), nullif(btrim(payload->>'lastName'), ''),
    nullif(btrim(payload->>'phone'), ''), nullif(lower(btrim(payload->>'email')), ''),
    payload->>'staffType', btrim(payload->>'position'), payload->>'status',
    nullif(payload->>'dateJoined', '')::date, subjects, actor_id, actor_id)
  returning id into new_staff_id;
  for assignment in select value from jsonb_array_elements(assignments) loop
    perform private.add_staff_assignment(new_staff_id, assignment);
  end loop;
  return new_staff_id;
end;
$$;

create function private.save_staff_request(payload jsonb, operation_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  key uuid := (payload->>'requestKey')::uuid;
  fingerprint text := encode(sha256(convert_to((payload - 'requestKey')::text, 'UTF8')), 'hex');
  previous private.staff_requests;
  item jsonb;
  new_id bigint;
  ids jsonb := '[]'::jsonb;
  result jsonb;
  items jsonb;
begin
  if auth.uid() is null or not private.has_permission(case when operation_name = 'import' then 'staff.import' else 'staff.manage' end) then
    raise exception using errcode = '42501', message = 'Staff permission is required.';
  end if;
  if key is null or jsonb_typeof(payload) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'A request key and staff details are required.';
  end if;
  -- One lock order for all create/import operations, including replays.
  perform 1 from private.staff_number_counter where id = 1 for update;
  select * into previous from private.staff_requests where request_key = key;
  if found then
    if previous.actor_id <> auth.uid() or previous.operation <> operation_name or previous.fingerprint <> fingerprint then
      raise exception using errcode = '22023', message = 'This request key was already used for different staff details.';
    end if;
    return previous.result;
  end if;
  items := case when operation_name = 'import' then payload->'rows' else jsonb_build_array(payload - 'requestKey') end;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 250 then
    raise exception using errcode = '22023', message = 'Import between 1 and 250 staff at a time.';
  end if;
  for item in select value from jsonb_array_elements(items) loop
    new_id := private.create_staff_record(item, auth.uid());
    ids := ids || jsonb_build_array(new_id);
  end loop;
  result := jsonb_build_object('createdCount', jsonb_array_length(items), 'staffIds', ids, 'staffId', new_id);
  insert into private.staff_requests(request_key, actor_id, operation, fingerprint, result)
    values (key, auth.uid(), operation_name, fingerprint, result);
  return result;
end;
$$;
revoke all on function private.save_staff_request(jsonb, text) from public, anon, authenticated;

create or replace function public.create_staff(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('staff.manage') then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  return private.save_staff_request(payload, 'create');
end;
$$;
create or replace function public.import_staff(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('staff.import') then
    raise exception using errcode = '42501', message = 'Staff import permission is required.';
  end if;
  return private.save_staff_request(payload, 'import');
end;
$$;
create or replace function public.assign_staff_class(target_staff_id bigint, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('staff.manage') then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  return jsonb_build_object('assignmentId', private.add_staff_assignment(target_staff_id, payload));
end;
$$;

create or replace function public.end_staff_assignment(target_assignment_id bigint, target_ended_on date)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target_staff_id bigint;
begin
  if not private.has_permission('staff.manage') then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  select staff_id into target_staff_id from public.staff_assignments where id = target_assignment_id;
  perform 1 from public.staff where id = target_staff_id for update;
  update public.staff_assignments set status = 'completed', ended_on = target_ended_on
    where id = target_assignment_id and status = 'active' and target_ended_on >= started_on;
  if not found then
    raise exception using errcode = '22023', message = 'Choose a valid assignment end date.';
  end if;
  return jsonb_build_object('staffId', target_staff_id);
end;
$$;
create or replace function public.archive_staff(target_staff_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('staff.manage') then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  perform 1 from public.staff where id = target_staff_id for update;
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

-- Existing RPC execution grants, RLS and audit triggers are retained.
create or replace view public.staff_directory with (security_invoker = true) as
select m.id, m.staff_number, m.first_name, m.middle_name, m.last_name,
  coalesce(m.recorded_name, concat_ws(' ', m.first_name, m.middle_name, m.last_name)) as full_name,
  m.phone, m.email, m.staff_type, m.position, m.status, m.date_joined, m.created_at,
  coalesce(string_agg(distinct c.name, ', ' order by c.name), '') as assigned_classes,
  m.known_subjects
from public.staff m
left join public.staff_assignments a on a.staff_id = m.id and a.status = 'active'
left join public.classes c on c.id = a.class_id
group by m.id;
revoke all on public.staff_directory from public, anon, authenticated;
grant select on public.staff_directory to authenticated;

reset lock_timeout;
