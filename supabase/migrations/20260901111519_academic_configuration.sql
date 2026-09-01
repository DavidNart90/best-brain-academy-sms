-- Phase 1 academic and school configuration.
-- Approved school configuration is inserted at the end of this migration.
-- Fee amounts remain outside this phase and are intentionally not stored here.

create or replace function private.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_active_staff())
    and exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_code = ur.role_code
      where ur.user_id = (select auth.uid())
        and rp.permission_code = requested_permission
    );
$$;
revoke all on function private.has_permission(text) from public, anon, authenticated;
grant execute on function private.has_permission(text) to authenticated;

insert into public.permissions(code, description)
values ('audit.read', 'View protected configuration audit history');
insert into public.role_permissions(role_code, permission_code)
values ('SUPER_ADMIN', 'audit.read');

create table public.academic_years (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 3 and 32),
  short_name text not null check (char_length(btrim(short_name)) between 3 and 16),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_dates_check check (starts_on < ends_on),
  constraint academic_years_current_active_check check (not is_current or status = 'active')
);
create unique index academic_years_name_unique on public.academic_years (lower(name));
create unique index academic_years_short_name_unique on public.academic_years (lower(short_name));
create unique index academic_years_one_current on public.academic_years (is_current) where is_current;
create index academic_years_created_by_idx on public.academic_years (created_by);
create index academic_years_updated_by_idx on public.academic_years (updated_by);
create index academic_years_status_dates_idx on public.academic_years (status, starts_on desc, id desc);

create table public.academic_terms (
  id bigint generated always as identity primary key,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  sequence smallint not null check (sequence between 1 and 12),
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_terms_schedule_check check (
    (starts_on is null and ends_on is null)
    or (starts_on is not null and ends_on is not null and starts_on <= ends_on)
  ),
  constraint academic_terms_current_check check (
    not is_current
    or (status = 'active' and starts_on is not null and ends_on is not null)
  ),
  unique (academic_year_id, sequence)
);
create unique index academic_terms_year_name_unique on public.academic_terms (academic_year_id, lower(name));
create unique index academic_terms_one_current on public.academic_terms (is_current) where is_current;
create index academic_terms_year_status_sequence_idx on public.academic_terms (academic_year_id, status, sequence, id);
create index academic_terms_created_by_idx on public.academic_terms (created_by);
create index academic_terms_updated_by_idx on public.academic_terms (updated_by);

create table public.classes (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  class_group text not null check (class_group in ('early_years', 'lower_basic', 'upper_basic', 'jhs')),
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index classes_name_unique on public.classes (lower(name));
create index classes_status_sort_idx on public.classes (status, sort_order, id);
create index classes_created_by_idx on public.classes (created_by);
create index classes_updated_by_idx on public.classes (updated_by);

create table public.school_locations (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,32}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index school_locations_name_unique on public.school_locations (lower(name));
create index school_locations_status_sort_idx on public.school_locations (status, sort_order, id);
create index school_locations_created_by_idx on public.school_locations (created_by);
create index school_locations_updated_by_idx on public.school_locations (updated_by);

create table public.school_settings (
  id smallint primary key default 1 check (id = 1),
  school_name text not null check (char_length(btrim(school_name)) between 2 and 160),
  short_name text check (short_name is null or char_length(btrim(short_name)) between 2 and 40),
  address text check (address is null or char_length(address) <= 500),
  phone text check (phone is null or char_length(phone) <= 40),
  email text check (email is null or char_length(email) <= 254),
  motto text check (motto is null or char_length(motto) <= 160),
  location_charge_label text not null default 'Location / Transport'
    check (char_length(btrim(location_charge_label)) between 2 and 80),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index school_settings_created_by_idx on public.school_settings (created_by);
create index school_settings_updated_by_idx on public.school_settings (updated_by);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete restrict,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text not null check (char_length(entity_id) between 1 and 128),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_values_check check (old_values is not null or new_values is not null)
);
create index audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc, id desc);
create index audit_logs_entity_created_idx on public.audit_logs (entity_type, entity_id, created_at desc, id desc);

create or replace function private.stamp_configuration_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := coalesce(new.updated_at, now());
    if (select auth.uid()) is not null then
      new.created_by := (select auth.uid());
      new.updated_by := (select auth.uid());
    end if;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    if (select auth.uid()) is not null then
      new.updated_by := (select auth.uid());
    else
      new.updated_by := old.updated_by;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_configuration_record() from public, anon, authenticated;

create or replace function private.guard_academic_year()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.is_current
    and not new.is_current
    and exists (
      select 1 from public.academic_terms
      where academic_year_id = old.id and is_current
    ) then
    raise exception using errcode = '23514', message = 'Unset the current term before changing the current academic year.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_academic_year() from public, anon, authenticated;

create or replace function private.guard_academic_term()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_year public.academic_years%rowtype;
begin
  perform pg_advisory_xact_lock(new.academic_year_id);
  select * into parent_year
  from public.academic_years
  where id = new.academic_year_id;
  if not found then
    raise exception using errcode = '23503', message = 'Academic year does not exist.';
  end if;
  if new.starts_on is not null
    and (new.starts_on < parent_year.starts_on or new.ends_on > parent_year.ends_on) then
    raise exception using errcode = '23514', message = 'Term dates must fall within the academic year.';
  end if;
  if new.starts_on is not null and exists (
    select 1
    from public.academic_terms other
    where other.academic_year_id = new.academic_year_id
      and other.id <> coalesce(new.id, 0)
      and other.status = 'active'
      and other.starts_on is not null
      and daterange(other.starts_on, other.ends_on, '[]') && daterange(new.starts_on, new.ends_on, '[]')
  ) then
    raise exception using errcode = '23514', message = 'Term dates cannot overlap another active term.';
  end if;
  if new.is_current and (not parent_year.is_current or parent_year.status <> 'active') then
    raise exception using errcode = '23514', message = 'The current term must belong to the current active academic year.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_academic_term() from public, anon, authenticated;

create or replace function private.write_configuration_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  record_id text;
begin
  old_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  record_id := coalesce(new_row->>'id', old_row->>'id');
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, old_values, new_values)
  values ((select auth.uid()), lower(tg_op), tg_table_name, record_id, old_row, new_row);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function private.write_configuration_audit() from public, anon, authenticated;

create trigger academic_years_stamp before insert or update on public.academic_years
  for each row execute function private.stamp_configuration_record();
create trigger academic_years_guard before update on public.academic_years
  for each row execute function private.guard_academic_year();
create trigger academic_years_audit after insert or update or delete on public.academic_years
  for each row execute function private.write_configuration_audit();

create trigger academic_terms_stamp before insert or update on public.academic_terms
  for each row execute function private.stamp_configuration_record();
create trigger academic_terms_guard before insert or update on public.academic_terms
  for each row execute function private.guard_academic_term();
create trigger academic_terms_audit after insert or update or delete on public.academic_terms
  for each row execute function private.write_configuration_audit();

create trigger classes_stamp before insert or update on public.classes
  for each row execute function private.stamp_configuration_record();
create trigger classes_audit after insert or update or delete on public.classes
  for each row execute function private.write_configuration_audit();

create trigger school_locations_stamp before insert or update on public.school_locations
  for each row execute function private.stamp_configuration_record();
create trigger school_locations_audit after insert or update or delete on public.school_locations
  for each row execute function private.write_configuration_audit();

create trigger school_settings_stamp before insert or update on public.school_settings
  for each row execute function private.stamp_configuration_record();
create trigger school_settings_audit after insert or update or delete on public.school_settings
  for each row execute function private.write_configuration_audit();

alter table public.academic_years enable row level security;
alter table public.academic_terms enable row level security;
alter table public.classes enable row level security;
alter table public.school_locations enable row level security;
alter table public.school_settings enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.academic_years, public.academic_terms, public.classes,
  public.school_locations, public.school_settings, public.audit_logs
  from public, anon, authenticated;
grant select, insert, update on public.academic_years, public.academic_terms,
  public.classes, public.school_locations, public.school_settings to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on sequence public.academic_years_id_seq,
  public.academic_terms_id_seq, public.classes_id_seq, public.school_locations_id_seq
  to authenticated;

create policy academic_years_read_staff on public.academic_years for select to authenticated
  using ((select private.is_active_staff()));
create policy academic_years_insert_settings on public.academic_years for insert to authenticated
  with check ((select private.has_permission('settings.manage')));
create policy academic_years_update_settings on public.academic_years for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy academic_terms_read_staff on public.academic_terms for select to authenticated
  using ((select private.is_active_staff()));
create policy academic_terms_insert_settings on public.academic_terms for insert to authenticated
  with check ((select private.has_permission('settings.manage')));
create policy academic_terms_update_settings on public.academic_terms for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy classes_read_staff on public.classes for select to authenticated
  using ((select private.is_active_staff()));
create policy classes_insert_settings on public.classes for insert to authenticated
  with check ((select private.has_permission('settings.manage')));
create policy classes_update_settings on public.classes for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy school_locations_read_staff on public.school_locations for select to authenticated
  using ((select private.is_active_staff()));
create policy school_locations_insert_settings on public.school_locations for insert to authenticated
  with check ((select private.has_permission('settings.manage')));
create policy school_locations_update_settings on public.school_locations for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy school_settings_read_staff on public.school_settings for select to authenticated
  using ((select private.is_active_staff()));
create policy school_settings_insert_settings on public.school_settings for insert to authenticated
  with check ((select private.has_permission('settings.manage')));
create policy school_settings_update_settings on public.school_settings for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy audit_logs_read_auditor on public.audit_logs for select to authenticated
  using ((select private.has_permission('audit.read')));

create or replace function public.set_current_academic_context(
  target_year_id bigint,
  target_term_id bigint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.has_permission('settings.manage')) then
    raise exception using errcode = '42501', message = 'Academic settings permission is required.';
  end if;
  if not exists (
    select 1
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where year.id = target_year_id
      and term.id = target_term_id
      and year.status = 'active'
      and term.status = 'active'
      and term.starts_on is not null
      and term.ends_on is not null
  ) then
    raise exception using errcode = '23514', message = 'Choose a scheduled active term in the selected academic year.';
  end if;
  update public.academic_terms
    set is_current = false, updated_by = (select auth.uid())
    where is_current and id <> target_term_id;
  update public.academic_years
    set is_current = false, updated_by = (select auth.uid())
    where is_current and id <> target_year_id;
  update public.academic_years
    set is_current = true, updated_by = (select auth.uid())
    where id = target_year_id;
  update public.academic_terms
    set is_current = true, updated_by = (select auth.uid())
    where id = target_term_id and academic_year_id = target_year_id;
end;
$$;
revoke all on function public.set_current_academic_context(bigint, bigint) from public, anon, authenticated;
grant execute on function public.set_current_academic_context(bigint, bigint) to authenticated;

insert into public.school_settings(id, school_name, short_name, motto, location_charge_label)
values (1, 'Best Brain Academy', 'BBA', 'SERVICE WITH DILIGENCE', 'Location / Transport');

insert into public.academic_years(name, short_name, starts_on, ends_on, is_current)
values ('2026/2027', '26/27', date '2026-09-01', date '2027-08-31', true);

insert into public.academic_terms(academic_year_id, name, sequence, starts_on, ends_on, is_current)
select id, 'Term 1', 1, date '2026-09-08', date '2026-12-07', true
from public.academic_years where short_name = '26/27';
insert into public.academic_terms(academic_year_id, name, sequence)
select id, term_name, term_sequence
from public.academic_years
cross join (values ('Term 2', 2), ('Term 3', 3)) as terms(term_name, term_sequence)
where short_name = '26/27';

insert into public.classes(code, name, class_group, sort_order)
values
  ('NUR1', 'Nursery 1', 'early_years', 10),
  ('NUR2', 'Nursery 2', 'early_years', 20),
  ('KG1', 'KG 1', 'early_years', 30),
  ('KG2', 'KG 2', 'early_years', 40),
  ('BAS1', 'Basic 1', 'lower_basic', 50),
  ('BAS2', 'Basic 2', 'lower_basic', 60),
  ('BAS3', 'Basic 3', 'lower_basic', 70),
  ('BAS4', 'Basic 4', 'upper_basic', 80),
  ('BAS5', 'Basic 5', 'upper_basic', 90),
  ('BAS6', 'Basic 6', 'upper_basic', 100),
  ('JHS1', 'JHS 1', 'jhs', 110),
  ('JHS2', 'JHS 2', 'jhs', 120),
  ('JHS3', 'JHS 3', 'jhs', 130);

insert into public.school_locations(code, name, sort_order)
values
  ('OSENASE_AKWADUM', 'Osenase & Akwadum', 10),
  ('ASUOFORI', 'Asuofori', 20),
  ('KOBRISO_ABAASE', 'Kobriso & Abaase', 30),
  ('ANOMAA_KOJO', 'Anomaa Kojo', 40),
  ('BAMENASE', 'Bamenase', 50);
