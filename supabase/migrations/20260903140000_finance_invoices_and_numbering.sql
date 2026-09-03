-- Phase 3 finance core (P3-01 step b): invoices, immutable invoice lines, and shared document numbering.
-- Invoices/invoice_lines are closed-direct-write tables: only SECURITY DEFINER RPCs (built in P3-03) may
-- insert or update them. This migration adds schema/numbering infrastructure only, no RPCs yet.

create table private.document_number_counters (
  document_type text not null check (document_type in ('INV', 'PAY', 'RCT', 'EXP', 'REV')),
  counter_year smallint not null check (counter_year between 2000 and 2100),
  next_value bigint not null check (next_value between 1 and 999999999),
  primary key (document_type, counter_year)
);
alter table private.document_number_counters enable row level security;
revoke all on private.document_number_counters from public, anon, authenticated;

create function private.allocate_document_number(target_document_type text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year smallint := extract(year from current_date)::smallint;
  allocated bigint;
  prefix text;
begin
  prefix := case target_document_type
    when 'INV' then 'BBA/INV'
    when 'PAY' then 'BBA/PAY'
    when 'RCT' then 'BBA/RCT'
    when 'EXP' then 'BBA/EXP'
    when 'REV' then 'BBA/REV'
    else null
  end;
  if prefix is null then
    raise exception using errcode = '22023', message = 'Unknown document type.';
  end if;
  insert into private.document_number_counters (document_type, counter_year, next_value)
  values (target_document_type, current_year, 1)
  on conflict (document_type, counter_year) do nothing;
  update private.document_number_counters
    set next_value = next_value + 1
    where document_type = target_document_type and counter_year = current_year
    returning next_value - 1 into allocated;
  return prefix || '/' || current_year || '/' || lpad(allocated::text, 5, '0');
end;
$$;
revoke all on function private.allocate_document_number(text) from public, anon, authenticated;

create table public.invoices (
  id bigint generated always as identity primary key,
  invoice_number text not null,
  student_id bigint not null references public.students(id) on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint not null references public.classes(id) on delete restrict,
  school_location_id bigint not null references public.school_locations(id) on delete restrict,
  student_name_snapshot text not null check (char_length(btrim(student_name_snapshot)) between 1 and 242),
  admission_number_snapshot text not null check (char_length(btrim(admission_number_snapshot)) between 1 and 40),
  class_name_snapshot text not null check (char_length(btrim(class_name_snapshot)) between 1 and 80),
  location_name_snapshot text not null check (char_length(btrim(location_name_snapshot)) between 1 and 120),
  issued_on date not null default current_date,
  status text not null default 'unpaid' check (status in ('unpaid', 'partially_paid', 'paid', 'cancelled')),
  subtotal numeric(14, 2) not null check (subtotal > 0),
  total numeric(14, 2) not null check (total > 0),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0),
  outstanding numeric(14, 2) generated always as (total - amount_paid) stored,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete restrict,
  cancellation_reason text check (cancellation_reason is null or char_length(btrim(cancellation_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_paid_not_exceed_total check (amount_paid <= total),
  constraint invoices_cancel_fields_check check ((status = 'cancelled') = (cancelled_at is not null))
);
create unique index invoices_number_unique on public.invoices (invoice_number);
create unique index invoices_active_per_student_term on public.invoices (student_id, academic_year_id, academic_term_id)
  where status <> 'cancelled';
create index invoices_student_idx on public.invoices (student_id, academic_year_id, academic_term_id);
create index invoices_status_idx on public.invoices (status, issued_on desc, id desc);
create index invoices_academic_term_idx on public.invoices (academic_year_id, academic_term_id);
create index invoices_created_by_idx on public.invoices (created_by);
create index invoices_updated_by_idx on public.invoices (updated_by);
create index invoices_cancelled_by_idx on public.invoices (cancelled_by) where cancelled_by is not null;

create table public.invoice_lines (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices(id) on delete restrict,
  fee_component_id bigint not null references public.fee_components(id) on delete restrict,
  description text not null check (char_length(btrim(description)) between 2 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  sort_order smallint not null check (sort_order between 1 and 999),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_id, sort_order)
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
create index invoice_lines_component_idx on public.invoice_lines (fee_component_id);
create index invoice_lines_created_by_idx on public.invoice_lines (created_by);
create index invoice_lines_updated_by_idx on public.invoice_lines (updated_by);

create trigger invoices_stamp before insert or update on public.invoices
  for each row execute function private.stamp_configuration_record();
create trigger invoices_audit after insert or update or delete on public.invoices
  for each row execute function private.write_configuration_audit();
create trigger invoice_lines_stamp before insert or update on public.invoice_lines
  for each row execute function private.stamp_configuration_record();
create trigger invoice_lines_audit after insert or update or delete on public.invoice_lines
  for each row execute function private.write_configuration_audit();

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

-- Closed direct writes: only SECURITY DEFINER RPCs (added in P3-03) may insert/update these tables.
revoke all on public.invoices, public.invoice_lines from public, anon, authenticated;
grant select on public.invoices, public.invoice_lines to authenticated;

create policy invoices_read_finance on public.invoices for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy invoice_lines_read_finance on public.invoice_lines for select to authenticated
  using ((select private.has_permission('financials.read')));
