-- Phase 3 finance reference configuration (P3-01 step a).
-- Base class fee and location/transport charge are effective-dated per academic year + term
-- so the Chief Engineer can revise them each term without rewriting historical invoices.
-- No invoice/payment/receipt/expense tables yet; those follow in later P3-01 steps.

insert into public.permissions(code, description)
values ('finance.settings.manage', 'Configure fee components, rates, payment methods, expense and income categories');
insert into public.role_permissions(role_code, permission_code)
values ('SUPER_ADMIN', 'finance.settings.manage');

create table public.fee_components (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  scope text not null check (scope in ('class', 'location', 'flat')),
  is_required boolean not null default true,
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index fee_components_name_unique on public.fee_components (lower(name));
create index fee_components_status_sort_idx on public.fee_components (status, sort_order, id);
create index fee_components_created_by_idx on public.fee_components (created_by);
create index fee_components_updated_by_idx on public.fee_components (updated_by);

create table public.fee_component_rates (
  id bigint generated always as identity primary key,
  fee_component_id bigint not null references public.fee_components(id) on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint references public.classes(id) on delete restrict,
  school_location_id bigint references public.school_locations(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index fee_component_rates_active_unique on public.fee_component_rates (
  fee_component_id, academic_year_id, academic_term_id,
  coalesce(class_id, 0), coalesce(school_location_id, 0)
) where status = 'active';
create index fee_component_rates_lookup_idx on public.fee_component_rates
  (academic_year_id, academic_term_id, fee_component_id, status);
create index fee_component_rates_class_idx on public.fee_component_rates (class_id) where class_id is not null;
create index fee_component_rates_location_idx on public.fee_component_rates (school_location_id)
  where school_location_id is not null;
create index fee_component_rates_created_by_idx on public.fee_component_rates (created_by);
create index fee_component_rates_updated_by_idx on public.fee_component_rates (updated_by);

create table public.payment_methods (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  requires_reference boolean not null default false,
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index payment_methods_name_unique on public.payment_methods (lower(name));
create index payment_methods_status_sort_idx on public.payment_methods (status, sort_order, id);
create index payment_methods_created_by_idx on public.payment_methods (created_by);
create index payment_methods_updated_by_idx on public.payment_methods (updated_by);

create table public.expense_categories (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index expense_categories_name_unique on public.expense_categories (lower(name));
create index expense_categories_status_sort_idx on public.expense_categories (status, sort_order, id);
create index expense_categories_created_by_idx on public.expense_categories (created_by);
create index expense_categories_updated_by_idx on public.expense_categories (updated_by);

-- No default rows: official miscellaneous-income categories remain an open Chief Engineer decision (Financial Structure.md section 17).
create table public.misc_income_categories (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[A-Z0-9_]{2,20}$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  sort_order smallint not null check (sort_order between 1 and 999),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code),
  unique (sort_order)
);
create unique index misc_income_categories_name_unique on public.misc_income_categories (lower(name));
create index misc_income_categories_status_sort_idx on public.misc_income_categories (status, sort_order, id);
create index misc_income_categories_created_by_idx on public.misc_income_categories (created_by);
create index misc_income_categories_updated_by_idx on public.misc_income_categories (updated_by);

create or replace function private.validate_fee_component_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  component_scope text;
begin
  select scope into component_scope from public.fee_components where id = new.fee_component_id;
  if component_scope is null then
    raise exception using errcode = '23503', message = 'Unknown fee component.';
  end if;
  if not exists (
    select 1 from public.academic_terms
    where id = new.academic_term_id and academic_year_id = new.academic_year_id
  ) then
    raise exception using errcode = '23514', message = 'The term must belong to the selected academic year.';
  end if;
  if component_scope = 'class' and (new.class_id is null or new.school_location_id is not null) then
    raise exception using errcode = '23514', message = 'A class-scoped fee component requires a class and no location.';
  end if;
  if component_scope = 'location' and (new.school_location_id is null or new.class_id is not null) then
    raise exception using errcode = '23514', message = 'A location-scoped fee component requires a location and no class.';
  end if;
  if component_scope = 'flat' and (new.class_id is not null or new.school_location_id is not null) then
    raise exception using errcode = '23514', message = 'A flat fee component must not reference a class or location.';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_fee_component_rate() from public, anon, authenticated;

create trigger fee_components_stamp before insert or update on public.fee_components
  for each row execute function private.stamp_configuration_record();
create trigger fee_components_audit after insert or update or delete on public.fee_components
  for each row execute function private.write_configuration_audit();

create trigger fee_component_rates_stamp before insert or update on public.fee_component_rates
  for each row execute function private.stamp_configuration_record();
create trigger fee_component_rates_scope_check before insert or update on public.fee_component_rates
  for each row execute function private.validate_fee_component_rate();
create trigger fee_component_rates_audit after insert or update or delete on public.fee_component_rates
  for each row execute function private.write_configuration_audit();

create trigger payment_methods_stamp before insert or update on public.payment_methods
  for each row execute function private.stamp_configuration_record();
create trigger payment_methods_audit after insert or update or delete on public.payment_methods
  for each row execute function private.write_configuration_audit();

create trigger expense_categories_stamp before insert or update on public.expense_categories
  for each row execute function private.stamp_configuration_record();
create trigger expense_categories_audit after insert or update or delete on public.expense_categories
  for each row execute function private.write_configuration_audit();

create trigger misc_income_categories_stamp before insert or update on public.misc_income_categories
  for each row execute function private.stamp_configuration_record();
create trigger misc_income_categories_audit after insert or update or delete on public.misc_income_categories
  for each row execute function private.write_configuration_audit();

alter table public.fee_components enable row level security;
alter table public.fee_component_rates enable row level security;
alter table public.payment_methods enable row level security;
alter table public.expense_categories enable row level security;
alter table public.misc_income_categories enable row level security;

revoke all on public.fee_components, public.fee_component_rates, public.payment_methods,
  public.expense_categories, public.misc_income_categories from public, anon, authenticated;
grant select, insert, update on public.fee_components, public.fee_component_rates,
  public.payment_methods, public.expense_categories, public.misc_income_categories to authenticated;
grant usage, select on sequence public.fee_components_id_seq, public.fee_component_rates_id_seq,
  public.payment_methods_id_seq, public.expense_categories_id_seq, public.misc_income_categories_id_seq
  to authenticated;

create policy fee_components_read_finance on public.fee_components for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy fee_components_insert_settings on public.fee_components for insert to authenticated
  with check ((select private.has_permission('finance.settings.manage')));
create policy fee_components_update_settings on public.fee_components for update to authenticated
  using ((select private.has_permission('finance.settings.manage')))
  with check ((select private.has_permission('finance.settings.manage')));

create policy fee_component_rates_read_finance on public.fee_component_rates for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy fee_component_rates_insert_settings on public.fee_component_rates for insert to authenticated
  with check ((select private.has_permission('finance.settings.manage')));
create policy fee_component_rates_update_settings on public.fee_component_rates for update to authenticated
  using ((select private.has_permission('finance.settings.manage')))
  with check ((select private.has_permission('finance.settings.manage')));

create policy payment_methods_read_finance on public.payment_methods for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy payment_methods_insert_settings on public.payment_methods for insert to authenticated
  with check ((select private.has_permission('finance.settings.manage')));
create policy payment_methods_update_settings on public.payment_methods for update to authenticated
  using ((select private.has_permission('finance.settings.manage')))
  with check ((select private.has_permission('finance.settings.manage')));

create policy expense_categories_read_finance on public.expense_categories for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy expense_categories_insert_settings on public.expense_categories for insert to authenticated
  with check ((select private.has_permission('finance.settings.manage')));
create policy expense_categories_update_settings on public.expense_categories for update to authenticated
  using ((select private.has_permission('finance.settings.manage')))
  with check ((select private.has_permission('finance.settings.manage')));

create policy misc_income_categories_read_finance on public.misc_income_categories for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy misc_income_categories_insert_settings on public.misc_income_categories for insert to authenticated
  with check ((select private.has_permission('finance.settings.manage')));
create policy misc_income_categories_update_settings on public.misc_income_categories for update to authenticated
  using ((select private.has_permission('finance.settings.manage')))
  with check ((select private.has_permission('finance.settings.manage')));

-- Seed: fee components (generic, effective-dated engine; only two active today per Financial Structure.md section 5).
insert into public.fee_components (code, name, scope, is_required, sort_order, status) values
  ('base_class_fee', 'Base Class Fee', 'class', true, 10, 'active'),
  ('location_transport_charge', 'Location / Transport Charge', 'location', true, 20, 'active');

-- Seed: confirmed 2026/2027 Term 1 base class fees (Financial Structure.md section 5.2).
insert into public.fee_component_rates (fee_component_id, academic_year_id, academic_term_id, class_id, amount, status)
select
  (select id from public.fee_components where code = 'base_class_fee'),
  (select id from public.academic_years where name = '2026/2027'),
  (select id from public.academic_terms where name = 'Term 1'
    and academic_year_id = (select id from public.academic_years where name = '2026/2027')),
  classes.id,
  case classes.class_group
    when 'early_years' then 120.00
    when 'lower_basic' then 140.00
    when 'upper_basic' then 150.00
    when 'jhs' then 207.00
  end,
  'active'
from public.classes;

-- Seed: confirmed 2026/2027 Term 1 location/transport charges (Financial Structure.md section 5.3).
insert into public.fee_component_rates (fee_component_id, academic_year_id, academic_term_id, school_location_id, amount, status)
select
  (select id from public.fee_components where code = 'location_transport_charge'),
  (select id from public.academic_years where name = '2026/2027'),
  (select id from public.academic_terms where name = 'Term 1'
    and academic_year_id = (select id from public.academic_years where name = '2026/2027')),
  locations.id,
  case locations.name
    when 'Osenase & Akwadum' then 910.00
    when 'Asuofori' then 780.00
    when 'Kobriso & Abaase' then 520.00
    when 'Anomaa Kojo' then 1625.00
    when 'Bamenase' then 1300.00
  end,
  'active'
from public.school_locations locations;

-- Seed: proposed payment methods (Financial Structure.md section 16, D-04 configurable default).
insert into public.payment_methods (code, name, requires_reference, sort_order, status) values
  ('CASH', 'Cash', false, 10, 'active'),
  ('MOBILE_MONEY', 'Mobile Money', true, 20, 'active'),
  ('BANK_TRANSFER', 'Bank Transfer', true, 30, 'active'),
  ('OTHER', 'Other', false, 40, 'active');

-- Seed: proposed expense categories (Financial Structure.md section 16, D-04 configurable default).
insert into public.expense_categories (code, name, sort_order, status) values
  ('SALARIES', 'Salaries', 10, 'active'),
  ('FEEDING_SUPPLIES', 'Feeding Supplies', 20, 'active'),
  ('FUEL', 'Fuel', 30, 'active'),
  ('ELECTRICITY', 'Electricity', 40, 'active'),
  ('WATER', 'Water', 50, 'active'),
  ('STATIONERY', 'Stationery', 60, 'active'),
  ('REPAIRS_MAINTENANCE', 'Repairs & Maintenance', 70, 'active'),
  ('TEACHING_MATERIALS', 'Teaching Materials', 80, 'active'),
  ('TRANSPORTATION', 'Transportation', 90, 'active'),
  ('INTERNET', 'Internet', 100, 'active'),
  ('MISCELLANEOUS', 'Miscellaneous', 110, 'active');
