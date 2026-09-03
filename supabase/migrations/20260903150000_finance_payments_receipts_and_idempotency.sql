-- Phase 3 finance core (P3-01 step c): school-fee payments, receipts, and shared request idempotency.
-- Closed direct writes: only SECURITY DEFINER RPCs (built in P3-04) may insert/update payments/receipts.
-- Reversal columns are included now (not deferred to a later ALTER) so the tables ship complete.

create table private.finance_requests (
  request_key uuid primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation text not null check (
    operation in ('school_fee_payment', 'feeding_receipt', 'admission_receipt', 'misc_receipt', 'expense')
  ),
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index finance_requests_actor_idx on private.finance_requests (actor_id);
alter table private.finance_requests enable row level security;
revoke all on private.finance_requests from public, anon, authenticated;

create table public.payments (
  id bigint generated always as identity primary key,
  payment_number text not null,
  invoice_id bigint not null references public.invoices(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  external_reference text check (external_reference is null or char_length(btrim(external_reference)) between 1 and 120),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 500),
  business_date date not null,
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null))
);
create unique index payments_number_unique on public.payments (payment_number);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_business_date_idx on public.payments (business_date desc, id desc);
create index payments_status_idx on public.payments (status);
create index payments_method_idx on public.payments (payment_method_id);
create index payments_created_by_idx on public.payments (created_by);
create index payments_updated_by_idx on public.payments (updated_by);
create index payments_reversed_by_idx on public.payments (reversed_by) where reversed_by is not null;

create table public.receipts (
  id bigint generated always as identity primary key,
  receipt_number text not null,
  payment_id bigint not null references public.payments(id) on delete restrict,
  student_name_snapshot text not null check (char_length(btrim(student_name_snapshot)) between 1 and 242),
  admission_number_snapshot text not null check (char_length(btrim(admission_number_snapshot)) between 1 and 40),
  class_name_snapshot text not null check (char_length(btrim(class_name_snapshot)) between 1 and 80),
  academic_year_name_snapshot text not null check (char_length(btrim(academic_year_name_snapshot)) between 1 and 32),
  academic_term_name_snapshot text not null check (char_length(btrim(academic_term_name_snapshot)) between 1 and 40),
  invoice_number_snapshot text not null check (char_length(btrim(invoice_number_snapshot)) between 1 and 40),
  payment_method_name_snapshot text not null check (char_length(btrim(payment_method_name_snapshot)) between 1 and 60),
  collected_by_snapshot text not null check (char_length(btrim(collected_by_snapshot)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  previous_balance numeric(14, 2) not null check (previous_balance >= 0),
  remaining_balance numeric(14, 2) not null check (remaining_balance >= 0),
  business_date date not null,
  status text not null default 'active' check (status in ('active', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  reversal_reason text check (reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_reversal_fields_check check ((status = 'reversed') = (reversed_at is not null)),
  constraint receipts_balance_check check (remaining_balance <= previous_balance)
);
create unique index receipts_number_unique on public.receipts (receipt_number);
create unique index receipts_payment_unique on public.receipts (payment_id);
create index receipts_business_date_idx on public.receipts (business_date desc, id desc);
create index receipts_status_idx on public.receipts (status);
create index receipts_created_by_idx on public.receipts (created_by);
create index receipts_updated_by_idx on public.receipts (updated_by);
create index receipts_reversed_by_idx on public.receipts (reversed_by) where reversed_by is not null;

create or replace function private.validate_payment_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  method_requires_reference boolean;
begin
  select requires_reference into method_requires_reference
  from public.payment_methods where id = new.payment_method_id;
  if method_requires_reference is null then
    raise exception using errcode = '23503', message = 'Unknown payment method.';
  end if;
  if method_requires_reference and nullif(btrim(new.external_reference), '') is null then
    raise exception using errcode = '23514', message = 'This payment method requires an external reference.';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_payment_reference() from public, anon, authenticated;

create trigger payments_stamp before insert or update on public.payments
  for each row execute function private.stamp_configuration_record();
create trigger payments_reference_check before insert or update on public.payments
  for each row execute function private.validate_payment_reference();
create trigger payments_audit after insert or update or delete on public.payments
  for each row execute function private.write_configuration_audit();

create trigger receipts_stamp before insert or update on public.receipts
  for each row execute function private.stamp_configuration_record();
create trigger receipts_audit after insert or update or delete on public.receipts
  for each row execute function private.write_configuration_audit();

alter table public.payments enable row level security;
alter table public.receipts enable row level security;

revoke all on public.payments, public.receipts from public, anon, authenticated;
grant select on public.payments, public.receipts to authenticated;

create policy payments_read_finance on public.payments for select to authenticated
  using ((select private.has_permission('financials.read')));
create policy receipts_read_finance on public.receipts for select to authenticated
  using ((select private.has_permission('financials.read')));
