-- P3-06: close the remaining finance document/audit gaps without changing the
-- established posting entry points. This migration also provides an explicit,
-- tracked reconciliation point for the transactional RPCs that are present on
-- the hosted database even though the original 20260903190000 ledger entry is
-- absent there.

do $$
begin
  if to_regprocedure('public.record_school_fee_payment(uuid,text,bigint,numeric,bigint,date,text,text)') is null
    or to_regprocedure('public.record_daily_collection(uuid,text,numeric,date,bigint,text,text)') is null
    or to_regprocedure('public.record_named_misc_receipt(uuid,text,numeric,date,bigint,text,text,text)') is null
    or to_regprocedure('public.record_expense(uuid,text,bigint,numeric,date,text,bigint,text,text,text)') is null
    or to_regprocedure('public.reverse_school_fee_payment(uuid,text,bigint,text)') is null
    or to_regprocedure('public.reverse_feeding_receipt(uuid,text,bigint,text)') is null
    or to_regprocedure('public.reverse_admission_receipt(uuid,text,bigint,text)') is null
    or to_regprocedure('public.reverse_misc_receipt(uuid,text,bigint,text)') is null
    or to_regprocedure('public.void_expense(uuid,text,bigint,text)') is null then
    raise exception using
      errcode = '55000',
      message = 'Required Phase 3 transactional RPCs are missing; apply the earlier finance migrations first.';
  end if;
end;
$$;

alter table public.invoices
  add column academic_year_name_snapshot text,
  add column academic_term_name_snapshot text,
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column cancellation_number text,
  add column cancelled_by_name_snapshot text;

alter table public.receipts
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

alter table public.payments
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

alter table public.feeding_receipts
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

alter table public.admission_receipts
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

alter table public.misc_receipts
  add column payment_method_name_snapshot text,
  add column income_name_snapshot text,
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

alter table public.expenses
  add column expense_category_name_snapshot text,
  add column payment_method_name_snapshot text,
  add column school_name_snapshot text,
  add column school_address_snapshot text,
  add column school_phone_snapshot text,
  add column school_email_snapshot text,
  add column school_motto_snapshot text,
  add column school_logo_path_snapshot text,
  add column recorded_by_snapshot text,
  add column reversal_number text,
  add column reversed_by_name_snapshot text;

-- Historical rows predate these fields, so they are backfilled from the current
-- configuration once. New rows are captured at posting time by the trigger below.
update public.invoices d
set academic_year_name_snapshot = y.name,
    academic_term_name_snapshot = t.name
from public.academic_years y, public.academic_terms t
where y.id = d.academic_year_id and t.id = d.academic_term_id;

update public.feeding_receipts d
set payment_method_name_snapshot = pm.name
from public.payment_methods pm
where pm.id = d.payment_method_id and d.payment_method_name_snapshot is null;

update public.admission_receipts d
set payment_method_name_snapshot = pm.name
from public.payment_methods pm
where pm.id = d.payment_method_id and d.payment_method_name_snapshot is null;

update public.misc_receipts d
set payment_method_name_snapshot = pm.name,
    income_name_snapshot = coalesce(
      (select c.name from public.misc_income_categories c where c.id = d.misc_income_category_id),
      d.description
    )
from public.payment_methods pm
where pm.id = d.payment_method_id;

update public.expenses d
set payment_method_name_snapshot = pm.name,
    expense_category_name_snapshot = c.name
from public.payment_methods pm, public.expense_categories c
where pm.id = d.payment_method_id and c.id = d.expense_category_id;

create or replace function private.populate_finance_document_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_record record;
  actor_name text;
begin
  select school_name, address, phone, email, motto, logo_path
  into settings_record
  from public.school_settings
  where id = 1;

  select display_name into actor_name
  from public.profiles
  where id = new.created_by;

  new.school_name_snapshot := coalesce(
    nullif(btrim(new.school_name_snapshot), ''),
    settings_record.school_name,
    'Best Brain Academy'
  );
  new.school_address_snapshot := coalesce(new.school_address_snapshot, settings_record.address);
  new.school_phone_snapshot := coalesce(new.school_phone_snapshot, settings_record.phone);
  new.school_email_snapshot := coalesce(new.school_email_snapshot, settings_record.email);
  new.school_motto_snapshot := coalesce(new.school_motto_snapshot, settings_record.motto);
  new.school_logo_path_snapshot := coalesce(new.school_logo_path_snapshot, settings_record.logo_path);
  new.recorded_by_snapshot := coalesce(
    nullif(btrim(new.recorded_by_snapshot), ''),
    actor_name,
    'Authorized administrator'
  );
  if tg_table_name = 'invoices' then
    select name into new.academic_year_name_snapshot
    from public.academic_years where id = new.academic_year_id;
    select name into new.academic_term_name_snapshot
    from public.academic_terms where id = new.academic_term_id;
  end if;
  return new;
end;
$$;
revoke all on function private.populate_finance_document_snapshot()
  from public, anon, authenticated;

-- Populate the shared identity/operator snapshot for rows that already exist.
update public.invoices d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.created_by),
      'Authorized administrator'
    )
from public.school_settings ss where ss.id = 1;

update public.receipts d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = d.collected_by_snapshot
from public.school_settings ss where ss.id = 1;

update public.feeding_receipts d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.created_by),
      'Authorized administrator'
    )
from public.school_settings ss where ss.id = 1;

update public.admission_receipts d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.created_by),
      'Authorized administrator'
    )
from public.school_settings ss where ss.id = 1;

update public.misc_receipts d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.created_by),
      'Authorized administrator'
    )
from public.school_settings ss where ss.id = 1;

update public.expenses d
set school_name_snapshot = coalesce(ss.school_name, 'Best Brain Academy'),
    school_address_snapshot = ss.address,
    school_phone_snapshot = ss.phone,
    school_email_snapshot = ss.email,
    school_motto_snapshot = ss.motto,
    school_logo_path_snapshot = ss.logo_path,
    recorded_by_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.created_by),
      'Authorized administrator'
    )
from public.school_settings ss where ss.id = 1;

create trigger invoices_document_snapshot
before insert on public.invoices
for each row execute function private.populate_finance_document_snapshot();
create trigger receipts_document_snapshot
before insert on public.receipts
for each row execute function private.populate_finance_document_snapshot();
create trigger feeding_receipts_document_snapshot
before insert on public.feeding_receipts
for each row execute function private.populate_finance_document_snapshot();
create trigger admission_receipts_document_snapshot
before insert on public.admission_receipts
for each row execute function private.populate_finance_document_snapshot();
create trigger misc_receipts_document_snapshot
before insert on public.misc_receipts
for each row execute function private.populate_finance_document_snapshot();
create trigger expenses_document_snapshot
before insert on public.expenses
for each row execute function private.populate_finance_document_snapshot();

create or replace function private.populate_finance_reference_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select name into new.payment_method_name_snapshot
  from public.payment_methods where id = new.payment_method_id;

  if tg_table_name = 'misc_receipts' then
    new.income_name_snapshot := coalesce(
      (select name from public.misc_income_categories where id = new.misc_income_category_id),
      new.description
    );
  elsif tg_table_name = 'expenses' then
    select name into new.expense_category_name_snapshot
    from public.expense_categories where id = new.expense_category_id;
  end if;
  return new;
end;
$$;
revoke all on function private.populate_finance_reference_snapshot()
  from public, anon, authenticated;

create trigger feeding_receipts_reference_snapshot
before insert on public.feeding_receipts
for each row execute function private.populate_finance_reference_snapshot();
create trigger admission_receipts_reference_snapshot
before insert on public.admission_receipts
for each row execute function private.populate_finance_reference_snapshot();
create trigger misc_receipts_reference_snapshot
before insert on public.misc_receipts
for each row execute function private.populate_finance_reference_snapshot();
create trigger expenses_reference_snapshot
before insert on public.expenses
for each row execute function private.populate_finance_reference_snapshot();

-- Existing reversals receive a permanent reference. School-fee payment and its
-- receipt deliberately share the same reversal number.
update public.invoices d
set cancellation_number = private.allocate_document_number('REV'),
    cancelled_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.cancelled_by),
      'Authorized administrator'
    )
where d.status = 'cancelled' and d.cancellation_number is null;

update public.payments d
set reversal_number = private.allocate_document_number('REV'),
    reversed_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.reversed_by),
      'Authorized administrator'
    )
where d.status = 'reversed' and d.reversal_number is null;

update public.receipts d
set reversal_number = p.reversal_number,
    reversed_by_name_snapshot = coalesce(
      (select actor.display_name from public.profiles actor where actor.id = d.reversed_by),
      'Authorized administrator'
    )
from public.payments p
where p.id = d.payment_id and d.status = 'reversed' and d.reversal_number is null;

update public.feeding_receipts d
set reversal_number = private.allocate_document_number('REV'),
    reversed_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.reversed_by),
      'Authorized administrator'
    )
where d.status = 'reversed' and d.reversal_number is null;

update public.admission_receipts d
set reversal_number = private.allocate_document_number('REV'),
    reversed_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.reversed_by),
      'Authorized administrator'
    )
where d.status = 'reversed' and d.reversal_number is null;

update public.misc_receipts d
set reversal_number = private.allocate_document_number('REV'),
    reversed_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.reversed_by),
      'Authorized administrator'
    )
where d.status = 'reversed' and d.reversal_number is null;

update public.expenses d
set reversal_number = private.allocate_document_number('REV'),
    reversed_by_name_snapshot = coalesce(
      (select p.display_name from public.profiles p where p.id = d.reversed_by),
      'Authorized administrator'
    )
where d.status = 'reversed' and d.reversal_number is null;

create or replace function private.populate_finance_reversal_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'reversed' and new.status = 'reversed' then
    if tg_table_name = 'receipts' then
      select reversal_number into new.reversal_number
      from public.payments where id = new.payment_id;
    end if;
    new.reversal_number := coalesce(
      new.reversal_number,
      private.allocate_document_number('REV')
    );
    new.reversed_by_name_snapshot := coalesce(
      nullif(btrim(new.reversed_by_name_snapshot), ''),
      (select display_name from public.profiles where id = new.reversed_by),
      'Authorized administrator'
    );
  elsif old.status = 'reversed' then
    new.reversal_number := old.reversal_number;
    new.reversed_by_name_snapshot := old.reversed_by_name_snapshot;
  end if;
  return new;
end;
$$;
revoke all on function private.populate_finance_reversal_snapshot()
  from public, anon, authenticated;

create trigger payments_reversal_snapshot
before update on public.payments
for each row execute function private.populate_finance_reversal_snapshot();
create trigger receipts_reversal_snapshot
before update on public.receipts
for each row execute function private.populate_finance_reversal_snapshot();
create trigger feeding_receipts_reversal_snapshot
before update on public.feeding_receipts
for each row execute function private.populate_finance_reversal_snapshot();
create trigger admission_receipts_reversal_snapshot
before update on public.admission_receipts
for each row execute function private.populate_finance_reversal_snapshot();
create trigger misc_receipts_reversal_snapshot
before update on public.misc_receipts
for each row execute function private.populate_finance_reversal_snapshot();
create trigger expenses_reversal_snapshot
before update on public.expenses
for each row execute function private.populate_finance_reversal_snapshot();

create or replace function private.populate_invoice_cancellation_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    new.cancellation_number := coalesce(
      new.cancellation_number,
      private.allocate_document_number('REV')
    );
    new.cancelled_by_name_snapshot := coalesce(
      nullif(btrim(new.cancelled_by_name_snapshot), ''),
      (select display_name from public.profiles where id = new.cancelled_by),
      'Authorized administrator'
    );
  elsif old.status = 'cancelled' then
    new.cancellation_number := old.cancellation_number;
    new.cancelled_by_name_snapshot := old.cancelled_by_name_snapshot;
  end if;
  return new;
end;
$$;
revoke all on function private.populate_invoice_cancellation_snapshot()
  from public, anon, authenticated;
create trigger invoices_cancellation_snapshot
before update on public.invoices
for each row execute function private.populate_invoice_cancellation_snapshot();

-- Snapshot fields required for reprints are immutable after insertion. Reversal
-- and cancellation audit fields are maintained only by the transition triggers.
create or replace function private.preserve_finance_document_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.school_name_snapshot := old.school_name_snapshot;
  new.school_address_snapshot := old.school_address_snapshot;
  new.school_phone_snapshot := old.school_phone_snapshot;
  new.school_email_snapshot := old.school_email_snapshot;
  new.school_motto_snapshot := old.school_motto_snapshot;
  new.school_logo_path_snapshot := old.school_logo_path_snapshot;
  new.recorded_by_snapshot := old.recorded_by_snapshot;
  return new;
end;
$$;
revoke all on function private.preserve_finance_document_snapshot()
  from public, anon, authenticated;

create trigger invoices_preserve_document_snapshot
before update on public.invoices
for each row execute function private.preserve_finance_document_snapshot();
create trigger receipts_preserve_document_snapshot
before update on public.receipts
for each row execute function private.preserve_finance_document_snapshot();
create trigger feeding_receipts_preserve_document_snapshot
before update on public.feeding_receipts
for each row execute function private.preserve_finance_document_snapshot();
create trigger admission_receipts_preserve_document_snapshot
before update on public.admission_receipts
for each row execute function private.preserve_finance_document_snapshot();
create trigger misc_receipts_preserve_document_snapshot
before update on public.misc_receipts
for each row execute function private.preserve_finance_document_snapshot();
create trigger expenses_preserve_document_snapshot
before update on public.expenses
for each row execute function private.preserve_finance_document_snapshot();

create or replace function private.preserve_invoice_period_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.academic_year_name_snapshot := old.academic_year_name_snapshot;
  new.academic_term_name_snapshot := old.academic_term_name_snapshot;
  return new;
end;
$$;
revoke all on function private.preserve_invoice_period_snapshot()
  from public, anon, authenticated;
create trigger invoices_preserve_period_snapshot
before update on public.invoices
for each row execute function private.preserve_invoice_period_snapshot();

create or replace function private.preserve_finance_reference_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.payment_method_name_snapshot := old.payment_method_name_snapshot;
  if tg_table_name = 'misc_receipts' then
    new.income_name_snapshot := old.income_name_snapshot;
  elsif tg_table_name = 'expenses' then
    new.expense_category_name_snapshot := old.expense_category_name_snapshot;
  end if;
  return new;
end;
$$;
revoke all on function private.preserve_finance_reference_snapshot()
  from public, anon, authenticated;

create trigger feeding_receipts_preserve_reference_snapshot
before update on public.feeding_receipts
for each row execute function private.preserve_finance_reference_snapshot();
create trigger admission_receipts_preserve_reference_snapshot
before update on public.admission_receipts
for each row execute function private.preserve_finance_reference_snapshot();
create trigger misc_receipts_preserve_reference_snapshot
before update on public.misc_receipts
for each row execute function private.preserve_finance_reference_snapshot();
create trigger expenses_preserve_reference_snapshot
before update on public.expenses
for each row execute function private.preserve_finance_reference_snapshot();

alter table public.invoices
  alter column academic_year_name_snapshot set not null,
  alter column academic_term_name_snapshot set not null,
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint invoices_cancellation_reference_check check (
    (status = 'cancelled') =
    (cancellation_number is not null and cancelled_by_name_snapshot is not null)
  );

alter table public.receipts
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint receipts_reversal_reference_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversed_by_name_snapshot is not null)
  );

alter table public.feeding_receipts
  alter column payment_method_name_snapshot set not null,
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint feeding_receipts_reversal_reference_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversed_by_name_snapshot is not null)
  );

alter table public.admission_receipts
  alter column payment_method_name_snapshot set not null,
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint admission_receipts_reversal_reference_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversed_by_name_snapshot is not null)
  );

alter table public.misc_receipts
  alter column payment_method_name_snapshot set not null,
  alter column income_name_snapshot set not null,
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint misc_receipts_reversal_reference_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversed_by_name_snapshot is not null)
  );

alter table public.expenses
  alter column expense_category_name_snapshot set not null,
  alter column payment_method_name_snapshot set not null,
  alter column school_name_snapshot set not null,
  alter column recorded_by_snapshot set not null,
  add constraint expenses_reversal_reference_check check (
    (status = 'reversed') =
    (reversal_number is not null and reversed_by_name_snapshot is not null)
  );

create unique index invoices_cancellation_number_unique
  on public.invoices (cancellation_number) where cancellation_number is not null;
create unique index payments_reversal_number_unique
  on public.payments (reversal_number) where reversal_number is not null;
create unique index receipts_reversal_number_unique
  on public.receipts (reversal_number) where reversal_number is not null;
create unique index feeding_receipts_reversal_number_unique
  on public.feeding_receipts (reversal_number) where reversal_number is not null;
create unique index admission_receipts_reversal_number_unique
  on public.admission_receipts (reversal_number) where reversal_number is not null;
create unique index misc_receipts_reversal_number_unique
  on public.misc_receipts (reversal_number) where reversal_number is not null;
create unique index expenses_reversal_number_unique
  on public.expenses (reversal_number) where reversal_number is not null;

-- Historical document logos remain available after administrators upload a new
-- current logo. Only unreferenced logo objects may be deleted through Storage.
create or replace function private.finance_document_uses_logo(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (select private.has_permission('settings.manage'))
    and (
      exists (select 1 from public.invoices where school_logo_path_snapshot = target_path)
      or exists (select 1 from public.receipts where school_logo_path_snapshot = target_path)
      or exists (select 1 from public.feeding_receipts where school_logo_path_snapshot = target_path)
      or exists (select 1 from public.admission_receipts where school_logo_path_snapshot = target_path)
      or exists (select 1 from public.misc_receipts where school_logo_path_snapshot = target_path)
      or exists (select 1 from public.expenses where school_logo_path_snapshot = target_path)
    );
$$;
revoke all on function private.finance_document_uses_logo(text)
  from public, anon, authenticated;
grant execute on function private.finance_document_uses_logo(text) to authenticated;

drop policy if exists school_branding_delete_settings on storage.objects;
create policy school_branding_delete_unreferenced_settings
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-branding'
  and (select private.has_permission('settings.manage'))
  and name ~ '^school/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'
  and not (select private.finance_document_uses_logo(name))
);
