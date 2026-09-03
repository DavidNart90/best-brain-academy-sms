-- STAFF-02: allow editing a staff profile after creation (identity, contact, date of birth).
-- Staff ID, staff type and assignment history remain immutable through this path.
set lock_timeout = '5s';

alter table public.staff
  add column date_of_birth date,
  add constraint staff_date_of_birth_check check (
    date_of_birth is null or date_joined is null or date_of_birth <= date_joined
  );

create or replace function public.update_staff(target_staff_id bigint, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  subjects text[];
  updated_id bigint;
begin
  if actor_id is null or not (select private.has_permission('staff.manage')) then
    raise exception using errcode = '42501', message = 'Staff management permission is required.';
  end if;
  if jsonb_typeof(payload) is distinct from 'object'
    or jsonb_typeof(coalesce(payload->'knownSubjects', '[]'::jsonb)) is distinct from 'array'
    or exists (
      select 1 from jsonb_array_elements(coalesce(payload->'knownSubjects', '[]'::jsonb)) s
      where jsonb_typeof(s) <> 'string'
    ) then
    raise exception using errcode = '22023', message = 'Review the staff details.';
  end if;
  if payload->>'status' not in ('active', 'inactive') then
    raise exception using errcode = '22023', message = 'Choose an active or inactive employment status.';
  end if;
  select array(select btrim(s) from jsonb_array_elements_text(coalesce(payload->'knownSubjects', '[]'::jsonb)) s)
    into subjects;
  update public.staff set
    recorded_name = nullif(btrim(payload->>'fullName'), ''),
    first_name = nullif(btrim(payload->>'firstName'), ''),
    middle_name = nullif(btrim(payload->>'middleName'), ''),
    last_name = nullif(btrim(payload->>'lastName'), ''),
    phone = nullif(btrim(payload->>'phone'), ''),
    email = nullif(lower(btrim(payload->>'email')), ''),
    position = btrim(payload->>'position'),
    status = payload->>'status',
    date_joined = nullif(payload->>'dateJoined', '')::date,
    date_of_birth = nullif(payload->>'dateOfBirth', '')::date,
    known_subjects = case when staff_type = 'teaching' then subjects else '{}' end,
    updated_by = actor_id
  where id = target_staff_id
  returning id into updated_id;
  if updated_id is null then
    raise exception using errcode = '22023', message = 'The staff record is no longer available.';
  end if;
  return jsonb_build_object('staffId', updated_id);
end;
$$;
revoke all on function public.update_staff(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.update_staff(bigint, jsonb) to authenticated;

reset lock_timeout;
