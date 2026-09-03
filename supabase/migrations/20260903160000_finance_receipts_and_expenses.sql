-- Phase 3 finance core (P3-01 steps d + e): feeding/admission/misc receipts and daily expenses.
-- Same closed-direct-write pattern as invoices/payments/receipts: RLS, SELECT-only grant gated by
-- financials.read, no insert/update grants — every write must go through a future P3-04 RPC.
-- Reversal columns are included now, folding step (f) into each table instead of a later ALTER.

create table public.feeding_receipts (
  id bigint generated always as identity primary key,
  receipt_number text not null,
  student_id bigint not null references public.students(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  business_date date not null,
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (external_reference is null or char_length(btrim(external_reference)) between 1 and 120),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 500),
  student_name_snapshot text not null check (char_length(btrim(student_name_snapshot)) between 1 and 242),
  admission_number_snapshot text not null check (char_length(btrim(admission_number_snapshot)) between 1 and 40),
  class_name_snapshot text not null check (char_length(btrim(class_name_snapshot)) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feeding_receipts_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null))
);
create unique index feeding_receipts_number_unique on public.feeding_receipts (receipt_number);
create unique index feeding_receipts_student_date_unique on public.feeding_receipts (student_id, business_date)
  where status = 'active';
create index feeding_receipts_business_date_idx on public.feeding_receipts (business_date desc, id desc);
create index feeding_receipts_status_idx on public.feeding_receipts (status);
create index feeding_receipts_created_by_idx on public.feeding_receipts (created_by);
create index feeding_receipts_updated_by_idx on public.feeding_receipts (updated_by);
create index feeding_receipts_reversed_by_idx on public.feeding_receipts (reversed_by) where reversed_by is not null;

create table public.admission_receipts (
  id bigint generated always as identity primary key,
  receipt_number text not null,
  student_id bigint not null references public.students(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  business_date date not null,
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (external_reference is null or char_length(btrim(external_reference)) between 1 and 120),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 500),
  student_name_snapshot text not null check (char_length(btrim(student_name_snapshot)) between 1 and 242),
  admission_number_snapshot text not null check (char_length(btrim(admission_number_snapshot)) between 1 and 40),
  class_name_snapshot text not null check (char_length(btrim(class_name_snapshot)) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admission_receipts_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null))
);
create unique index admission_receipts_number_unique on public.admission_receipts (receipt_number);
create unique index admission_receipts_student_unique on public.admission_receipts (student_id)
  where status = 'active';
create index admission_receipts_business_date_idx on public.admission_receipts (business_date desc, id desc);
create index admission_receipts_status_idx on public.admission_receipts (status);
create index admission_receipts_created_by_idx on public.admission_receipts (created_by);
create index admission_receipts_updated_by_idx on public.admission_receipts (updated_by);
create index admission_receipts_reversed_by_idx on public.admission_receipts (reversed_by) where reversed_by is not null;

create table public.misc_receipts (
  id bigint generated always as identity primary key,
  receipt_number text not null,
  misc_income_category_id bigint not null references public.misc_income_categories(id) on delete restrict,
  student_id bigint references public.students(id) on delete restrict,
  payer_name text check (payer_name is null or char_length(btrim(payer_name)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 2 and 500),
  amount numeric(14, 2) not null check (amount > 0),
  business_date date not null,
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (external_reference is null or char_length(btrim(external_reference)) between 1 and 120),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 500),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint misc_receipts_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null))
);
create unique index misc_receipts_number_unique on public.misc_receipts (receipt_number);
create index misc_receipts_business_date_idx on public.misc_receipts (business_date desc, id desc);
create index misc_receipts_status_idx on public.misc_receipts (status);
create index misc_receipts_category_idx on public.misc_receipts (misc_income_category_id);
create index misc_receipts_student_idx on public.misc_receipts (student_id) where student_id is not null;
create index misc_receipts_created_by_idx on public.misc_receipts (created_by);
create index misc_receipts_updated_by_idx on public.misc_receipts (updated_by);
create index misc_receipts_reversed_by_idx on public.misc_receipts (reversed_by) where reversed_by is not null;

create table public.expenses (
  id bigint generated always as identity primary key,
  expense_number text not null,
  expense_category_id bigint not null references public.expense_categories(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  business_date date not null,
  description text not null check (char_length(btrim(description)) between 2 and 500),
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (external_reference is null or char_length(btrim(external_reference)) between 1 and 120),
  attachment_path text check (attachment_path is null or char_length(btrim(attachment_path)) between 1 and 300),
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null))
);
create unique index expenses_number_unique on public.expenses (expense_number);
create index expenses_business_date_idx on public.expenses (business_date desc, id desc);
create index expenses_status_idx on public.expenses (status);
create index expenses_category_idx on public.expenses (expense_category_id);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_updated_by_idx on public.expenses (updated_by);
create index expenses_reversed_by_idx on public.expenses (reversed_by) where reversed_by is not null;

create trigger feeding_receipts_stamp before insert or update on public.feeding_receipts
  for each row execute function private.stamp_configuration_record();
create trigger feeding_receipts_reference_check before insert or update on public.feeding_receipts
  for each row execute function private.validate_payment_reference();
create trigger feeding_receipts_audit after insert or update or delete on public.feeding_receipts
  for each row execute function private.write_configuration_audit();

create trigger admission_receipts_stamp before insert or update on public.admission_receipts
  for each row execute function private.stamp_configuration_record();
create trigger admission_receipts_reference_check before insert or update on public.admission_receipts
  for each row execute function private.validate_payment_reference();
create trigger admission_receipts_audit after insert or update or delete on public.admission_receipts
  for each row execute function private.write_configuration_audit();

create trigger misc_receipts_stamp before insert or update on public.misc_receipts
  for each row execute function private.stamp_configuration_record();
create trigger misc_receipts_reference_check before insert or update on public.misc_receipts
  for each row execute function private.validate_payment_reference();
create trigger misc_receipts_audit after insert or update or delete on public.misc_receipts
  for each row execute function private.write_configuration_audit();

create trigger expenses_stamp before insert or update on public.expenses
  for each row execute function private.stamp_configuration_record();
create trigger expenses_reference_check before insert or update on public.expenses
  for each row execute function private.validate_payment_reference();
create trigger expenses_audit after insert or update or delete on public.expenses
  for each row execute function private.write_configuration_audit();

alter table public.feeding_receipts enable row level security;
alter table public.admission_receipts enable row level security;
alter table public.misc_receipts enable row level security;
alter table public.expenses enable row level security;

revoke all on public.feeding_receipts, public.admission_receipts, public.misc_receipts, public.expenses
  from public, anon, authenticated;
grant select on public.feeding_receipts, public.admission_receipts, public.misc_receipts, public.expenses
  to authenticated;

create policy feeding_receipts_read_finance on public.feeding_receipts for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy admission_receipts_read_finance on public.admission_receipts for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy misc_receipts_read_finance on public.misc_receipts for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy expenses_read_finance on public.expenses for select to authenticated
  using ((select private.has_permission('financials.read')));
