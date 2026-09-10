-- Approved Library scope: term-configured Books & Prospectus charges and a
-- separate collection ledger. These balances are displayed beside student
-- invoices but never change school-fee invoice totals or accounting cashflow.

set lock_timeout = '5s';

alter table public.roles drop constraint if exists roles_code_check;
alter table public.roles
  add constraint roles_code_check check (
    code in ('SUPER_ADMIN', 'ADMINISTRATOR', 'ACCOUNTANT', 'MANAGEMENT', 'LIBRARIAN')
  );

insert into public.roles (code, label)
values ('LIBRARIAN', 'Librarian / Book Keeper')
on conflict (code) do update set label = excluded.label;

insert into public.permissions (code, description) values
  ('library.read', 'View Books & Prospectus rates, student balances and collections'),
  ('library.collections.manage', 'Generate Books & Prospectus charges and record or reverse collections'),
  ('library.settings.manage', 'Configure Books & Prospectus rates by academic term and class')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code) values
  ('SUPER_ADMIN', 'library.read'),
  ('SUPER_ADMIN', 'library.collections.manage'),
  ('SUPER_ADMIN', 'library.settings.manage'),
  ('ADMINISTRATOR', 'library.read'),
  ('ADMINISTRATOR', 'library.collections.manage'),
  ('ADMINISTRATOR', 'library.settings.manage'),
  ('ACCOUNTANT', 'library.read'),
  ('MANAGEMENT', 'library.read'),
  ('LIBRARIAN', 'dashboard.read'),
  ('LIBRARIAN', 'library.read'),
  ('LIBRARIAN', 'library.collections.manage')
on conflict do nothing;

insert into private.rate_limit_policies (
  bucket, max_requests, window_seconds, description
) values (
  'library-write', 120, 600,
  'Books and Prospectus charge generation, collection posting, and reversals'
)
on conflict (bucket) do update set
  max_requests = excluded.max_requests,
  window_seconds = excluded.window_seconds,
  description = excluded.description;

alter table private.document_number_counters
  drop constraint if exists document_number_counters_document_type_check;
alter table private.document_number_counters
  add constraint document_number_counters_document_type_check check (
    document_type in ('INV', 'PAY', 'RCT', 'EXP', 'REV', 'SAL', 'DED', 'LIB')
  );

create or replace function private.allocate_document_number(target_document_type text)
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
    when 'SAL' then 'BBA/SAL'
    when 'DED' then 'BBA/DED'
    when 'LIB' then 'BBA/LIB'
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
revoke all on function private.allocate_document_number(text)
  from public, anon, authenticated;

create table public.library_term_rates (
  id bigint generated always as identity primary key,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint not null references public.classes(id) on delete restrict,
  charge_status text not null check (charge_status in ('chargeable', 'not_charged')),
  amount numeric(14, 2),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_term_rates_amount_check check (
    (charge_status = 'chargeable' and amount > 0 and amount = round(amount, 2))
    or (charge_status = 'not_charged' and amount is null)
  ),
  unique (academic_term_id, class_id)
);
create index library_term_rates_term_status_idx
  on public.library_term_rates (academic_term_id, charge_status, class_id);
create index library_term_rates_class_idx
  on public.library_term_rates (class_id, academic_term_id);
create index library_term_rates_created_by_idx
  on public.library_term_rates (created_by);
create index library_term_rates_updated_by_idx
  on public.library_term_rates (updated_by);

create table public.library_charges (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id) on delete restrict,
  enrollment_id bigint not null references public.student_enrollments(id) on delete restrict,
  academic_year_id bigint not null references public.academic_years(id) on delete restrict,
  academic_term_id bigint not null references public.academic_terms(id) on delete restrict,
  class_id bigint not null references public.classes(id) on delete restrict,
  term_rate_id bigint not null references public.library_term_rates(id) on delete restrict,
  student_name_snapshot text not null check (
    char_length(btrim(student_name_snapshot)) between 1 and 242
  ),
  admission_number_snapshot text not null check (
    char_length(btrim(admission_number_snapshot)) between 1 and 40
  ),
  class_name_snapshot text not null check (
    char_length(btrim(class_name_snapshot)) between 1 and 80
  ),
  academic_year_name_snapshot text not null check (
    char_length(btrim(academic_year_name_snapshot)) between 1 and 32
  ),
  academic_term_name_snapshot text not null check (
    char_length(btrim(academic_term_name_snapshot)) between 1 and 40
  ),
  description text not null default 'Books & Prospectus' check (
    char_length(btrim(description)) between 2 and 80
  ),
  expected_amount numeric(14, 2) not null check (
    expected_amount > 0 and expected_amount = round(expected_amount, 2)
  ),
  amount_paid numeric(14, 2) not null default 0 check (
    amount_paid >= 0 and amount_paid = round(amount_paid, 2)
  ),
  outstanding numeric(14, 2)
    generated always as (expected_amount - amount_paid) stored,
  status text not null default 'unpaid' check (
    status in ('unpaid', 'partially_paid', 'paid')
  ),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_charges_paid_check check (amount_paid <= expected_amount),
  constraint library_charges_payment_state_check check (
    (status = 'unpaid' and amount_paid = 0)
    or (status = 'partially_paid' and amount_paid > 0 and amount_paid < expected_amount)
    or (status = 'paid' and amount_paid = expected_amount)
  ),
  unique (student_id, academic_term_id)
);
create index library_charges_term_class_status_idx
  on public.library_charges (academic_term_id, class_id, status, id);
create index library_charges_student_term_idx
  on public.library_charges (student_id, academic_term_id);
create index library_charges_enrollment_idx
  on public.library_charges (enrollment_id);
create index library_charges_rate_idx
  on public.library_charges (term_rate_id);
create index library_charges_created_by_idx
  on public.library_charges (created_by);
create index library_charges_updated_by_idx
  on public.library_charges (updated_by);

create table public.library_collections (
  id bigint generated always as identity primary key,
  collection_number text not null,
  charge_id bigint not null references public.library_charges(id) on delete restrict,
  student_id bigint not null references public.students(id) on delete restrict,
  student_name_snapshot text not null check (
    char_length(btrim(student_name_snapshot)) between 1 and 242
  ),
  admission_number_snapshot text not null check (
    char_length(btrim(admission_number_snapshot)) between 1 and 40
  ),
  class_name_snapshot text not null check (
    char_length(btrim(class_name_snapshot)) between 1 and 80
  ),
  amount numeric(14, 2) not null check (
    amount > 0 and amount = round(amount, 2)
  ),
  business_date date not null,
  payment_method_id bigint not null references public.payment_methods(id) on delete restrict,
  payment_method_name_snapshot text not null check (
    char_length(btrim(payment_method_name_snapshot)) between 1 and 80
  ),
  external_reference text check (
    external_reference is null or char_length(btrim(external_reference)) between 1 and 120
  ),
  notes text check (notes is null or char_length(btrim(notes)) between 2 and 500),
  status text not null default 'active' check (status in ('active', 'reversed')),
  request_key uuid not null,
  reversal_request_key uuid,
  reversal_number text,
  reversal_reason text check (
    reversal_reason is null or char_length(btrim(reversal_reason)) between 2 and 500
  ),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete restrict,
  recorded_by_snapshot text not null check (
    char_length(btrim(recorded_by_snapshot)) between 1 and 120
  ),
  reversed_by_name_snapshot text check (
    reversed_by_name_snapshot is null
    or char_length(btrim(reversed_by_name_snapshot)) between 1 and 120
  ),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_collections_reversal_check check (
    (status = 'active' and reversal_request_key is null and reversal_number is null
      and reversal_reason is null and reversed_at is null and reversed_by is null
      and reversed_by_name_snapshot is null)
    or (status = 'reversed' and reversal_request_key is not null and reversal_number is not null
      and reversal_reason is not null and reversed_at is not null and reversed_by is not null
      and reversed_by_name_snapshot is not null)
  )
);
create unique index library_collections_number_unique
  on public.library_collections (collection_number);
create unique index library_collections_request_key_unique
  on public.library_collections (request_key);
create unique index library_collections_reversal_request_key_unique
  on public.library_collections (reversal_request_key)
  where reversal_request_key is not null;
create unique index library_collections_reversal_number_unique
  on public.library_collections (reversal_number)
  where reversal_number is not null;
create index library_collections_charge_status_date_idx
  on public.library_collections (charge_id, status, business_date desc, id desc);
create index library_collections_term_reporting_idx
  on public.library_collections (business_date, status, id);
create index library_collections_student_idx
  on public.library_collections (student_id, business_date desc, id desc);
create index library_collections_payment_method_idx
  on public.library_collections (payment_method_id);
create index library_collections_created_by_idx
  on public.library_collections (created_by);
create index library_collections_updated_by_idx
  on public.library_collections (updated_by);
create index library_collections_reversed_by_idx
  on public.library_collections (reversed_by)
  where reversed_by is not null;

create trigger library_term_rates_stamp
before insert or update on public.library_term_rates
for each row execute function private.stamp_configuration_record();
create trigger library_term_rates_audit
after insert or update or delete on public.library_term_rates
for each row execute function private.write_configuration_audit();
create trigger library_charges_stamp
before insert or update on public.library_charges
for each row execute function private.stamp_configuration_record();
create trigger library_charges_audit
after insert or update or delete on public.library_charges
for each row execute function private.write_configuration_audit();
create trigger library_collections_stamp
before insert or update on public.library_collections
for each row execute function private.stamp_configuration_record();
create trigger library_collections_audit
after insert or update or delete on public.library_collections
for each row execute function private.write_configuration_audit();

alter table public.library_term_rates enable row level security;
alter table public.library_charges enable row level security;
alter table public.library_collections enable row level security;

revoke all on public.library_term_rates, public.library_charges,
  public.library_collections from public, anon, authenticated;
grant select on public.library_term_rates, public.library_charges,
  public.library_collections to authenticated;

create policy library_term_rates_read_authorized
  on public.library_term_rates for select to authenticated
  using ((select private.has_permission('library.read')));
create policy library_charges_read_authorized
  on public.library_charges for select to authenticated
  using ((select private.has_permission('library.read')));
create policy library_collections_read_authorized
  on public.library_collections for select to authenticated
  using ((select private.has_permission('library.read')));
create policy payment_methods_read_library
  on public.payment_methods for select to authenticated
  using ((select private.has_permission('library.read')));

create or replace function public.set_library_term_rate(
  target_academic_term_id bigint,
  target_class_id bigint,
  target_charge_status text,
  target_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_status text := lower(btrim(target_charge_status));
  saved_rate public.library_term_rates%rowtype;
begin
  if not (select private.has_permission('library.settings.manage')) then
    raise exception using errcode = '42501',
      message = 'Library settings permission is required.';
  end if;
  if normalized_status not in ('chargeable', 'not_charged') then
    raise exception using errcode = '22023',
      message = 'Choose a valid Library charge status.';
  end if;
  if normalized_status = 'chargeable'
    and (target_amount is null or target_amount <= 0 or target_amount <> round(target_amount, 2)) then
    raise exception using errcode = '22023',
      message = 'Enter a positive Books & Prospectus amount with no more than two decimals.';
  end if;
  if normalized_status = 'not_charged' then
    target_amount := null;
  end if;
  if not exists (
    select 1
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    join public.classes class on class.id = target_class_id
    where term.id = target_academic_term_id
      and term.status = 'active'
      and year.status = 'active'
      and class.status = 'active'
  ) then
    raise exception using errcode = '23514',
      message = 'Choose an active academic term and class.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_academic_term_id::text || ':' || target_class_id::text, 0)
  );
  insert into public.library_term_rates (
    academic_term_id, class_id, charge_status, amount, created_by, updated_by
  ) values (
    target_academic_term_id, target_class_id, normalized_status, target_amount,
    actor_id, actor_id
  )
  on conflict (academic_term_id, class_id) do update set
    charge_status = excluded.charge_status,
    amount = excluded.amount,
    updated_by = actor_id,
    updated_at = now()
  returning * into saved_rate;

  return jsonb_build_object(
    'ok', true,
    'rateId', saved_rate.id,
    'chargeStatus', saved_rate.charge_status,
    'amount', saved_rate.amount
  );
end;
$$;
revoke all on function public.set_library_term_rate(bigint, bigint, text, numeric)
  from public, anon, authenticated;
grant execute on function public.set_library_term_rate(bigint, bigint, text, numeric)
  to authenticated;

create or replace function public.generate_library_term_charges(
  target_academic_term_id bigint,
  target_student_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  enrollment record;
  created_rows jsonb := '[]'::jsonb;
  skipped_rows jsonb := '[]'::jsonb;
  new_charge_id bigint;
begin
  if not (select private.has_permission('library.collections.manage')) then
    raise exception using errcode = '42501',
      message = 'Library collection permission is required.';
  end if;
  if not exists (
    select 1 from public.academic_terms
    where id = target_academic_term_id and status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic term.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('library-term:' || target_academic_term_id::text, 0));
  for enrollment in
    select
      student.id as student_id,
      student_enrollment.id as enrollment_id,
      student_enrollment.academic_year_id,
      student_enrollment.academic_term_id,
      student_enrollment.class_id,
      rate.id as rate_id,
      rate.charge_status,
      rate.amount,
      concat_ws(' ', student.first_name, student.middle_name, student.last_name) as student_name,
      student.admission_number,
      class.name as class_name,
      academic_year.name as academic_year_name,
      academic_term.name as academic_term_name
    from public.student_enrollments student_enrollment
    join public.students student on student.id = student_enrollment.student_id
    join public.classes class on class.id = student_enrollment.class_id
    join public.academic_years academic_year on academic_year.id = student_enrollment.academic_year_id
    join public.academic_terms academic_term on academic_term.id = student_enrollment.academic_term_id
    left join public.library_term_rates rate
      on rate.academic_term_id = student_enrollment.academic_term_id
      and rate.class_id = student_enrollment.class_id
    where student_enrollment.academic_term_id = target_academic_term_id
      and student_enrollment.status = 'active'
      and student.status = 'active'
      and (target_student_id is null or student.id = target_student_id)
    order by student.id
  loop
    if enrollment.rate_id is null then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'Books & Prospectus is not configured for this class.'
      ));
      continue;
    end if;
    if enrollment.charge_status = 'not_charged' then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'This class is not charged for Books & Prospectus.'
      ));
      continue;
    end if;
    if exists (
      select 1 from public.library_charges
      where student_id = enrollment.student_id
        and academic_term_id = enrollment.academic_term_id
    ) then
      skipped_rows := skipped_rows || jsonb_build_array(jsonb_build_object(
        'studentId', enrollment.student_id,
        'reason', 'A Library charge already exists for this term.'
      ));
      continue;
    end if;

    insert into public.library_charges (
      student_id, enrollment_id, academic_year_id, academic_term_id, class_id,
      term_rate_id, student_name_snapshot, admission_number_snapshot,
      class_name_snapshot, academic_year_name_snapshot, academic_term_name_snapshot,
      expected_amount, created_by, updated_by
    ) values (
      enrollment.student_id, enrollment.enrollment_id, enrollment.academic_year_id,
      enrollment.academic_term_id, enrollment.class_id, enrollment.rate_id,
      enrollment.student_name, enrollment.admission_number, enrollment.class_name,
      enrollment.academic_year_name, enrollment.academic_term_name,
      enrollment.amount, actor_id, actor_id
    )
    returning id into new_charge_id;
    created_rows := created_rows || jsonb_build_array(jsonb_build_object(
      'studentId', enrollment.student_id,
      'chargeId', new_charge_id
    ));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'createdCount', jsonb_array_length(created_rows),
    'created', created_rows,
    'skipped', skipped_rows
  );
end;
$$;
revoke all on function public.generate_library_term_charges(bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.generate_library_term_charges(bigint, bigint)
  to authenticated;

create or replace function public.record_library_collection(
  target_request_key uuid,
  target_charge_id bigint,
  payment_amount numeric,
  target_business_date date,
  target_payment_method_id bigint,
  target_external_reference text default null,
  target_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing public.library_collections%rowtype;
  charge public.library_charges%rowtype;
  method public.payment_methods%rowtype;
  allocated_number text;
  new_paid numeric(14, 2);
  new_status text;
  recorder text;
  collection_id bigint;
begin
  if not (select private.has_permission('library.collections.manage')) then
    raise exception using errcode = '42501',
      message = 'Library collection permission is required.';
  end if;
  if target_request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if payment_amount is null or payment_amount <= 0
    or payment_amount <> round(payment_amount, 2) then
    raise exception using errcode = '22023',
      message = 'Enter a positive amount with no more than two decimals.';
  end if;
  if target_business_date is null or target_business_date > current_date then
    raise exception using errcode = '22023',
      message = 'The collection date cannot be in the future.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_request_key::text, 0));
  select * into existing
  from public.library_collections
  where library_collections.request_key = target_request_key;
  if found then
    if existing.charge_id <> target_charge_id
      or existing.amount <> payment_amount
      or existing.business_date <> target_business_date
      or existing.payment_method_id <> target_payment_method_id
      or coalesce(existing.external_reference, '') <> coalesce(nullif(btrim(target_external_reference), ''), '')
      or coalesce(existing.notes, '') <> coalesce(nullif(btrim(target_notes), ''), '') then
      raise exception using errcode = '23505',
        message = 'That request key was already used for different collection details.';
    end if;
    return jsonb_build_object(
      'ok', true, 'collectionId', existing.id,
      'collectionNumber', existing.collection_number,
      'amount', existing.amount, 'replayed', true
    );
  end if;

  select * into charge from public.library_charges
  where id = target_charge_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'Library charge not found.';
  end if;
  if payment_amount > charge.outstanding then
    raise exception using errcode = '22023',
      message = 'The collection exceeds the outstanding Library balance.';
  end if;
  select * into method from public.payment_methods
  where id = target_payment_method_id and status = 'active';
  if not found then
    raise exception using errcode = '23503', message = 'Choose an active payment method.';
  end if;
  if method.requires_reference and nullif(btrim(target_external_reference), '') is null then
    raise exception using errcode = '22023',
      message = 'A payment reference is required for this payment method.';
  end if;

  new_paid := charge.amount_paid + payment_amount;
  new_status := case
    when new_paid = charge.expected_amount then 'paid'
    when new_paid > 0 then 'partially_paid'
    else 'unpaid'
  end;
  select coalesce(nullif(btrim(display_name), ''), 'Authorized Library staff')
  into recorder from public.profiles where id = actor_id;
  allocated_number := private.allocate_document_number('LIB');

  update public.library_charges
  set amount_paid = new_paid, status = new_status, updated_by = actor_id
  where id = charge.id;
  insert into public.library_collections (
    collection_number, charge_id, student_id, student_name_snapshot,
    admission_number_snapshot, class_name_snapshot, amount, business_date,
    payment_method_id, payment_method_name_snapshot, external_reference, notes,
    request_key, recorded_by_snapshot, created_by, updated_by
  ) values (
    allocated_number, charge.id, charge.student_id, charge.student_name_snapshot,
    charge.admission_number_snapshot, charge.class_name_snapshot, payment_amount,
    target_business_date, method.id, method.name,
    nullif(btrim(target_external_reference), ''), nullif(btrim(target_notes), ''),
    target_request_key, recorder, actor_id, actor_id
  ) returning id into collection_id;

  return jsonb_build_object(
    'ok', true, 'collectionId', collection_id,
    'collectionNumber', allocated_number, 'amount', payment_amount,
    'remainingBalance', charge.expected_amount - new_paid, 'replayed', false
  );
end;
$$;
revoke all on function public.record_library_collection(uuid, bigint, numeric, date, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.record_library_collection(uuid, bigint, numeric, date, bigint, text, text)
  to authenticated;

create or replace function public.reverse_library_collection(
  target_request_key uuid,
  target_collection_id bigint,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  collection public.library_collections%rowtype;
  charge public.library_charges%rowtype;
  reversal_reference text;
  reverser text;
  new_paid numeric(14, 2);
  new_status text;
begin
  if not (select private.has_permission('library.collections.manage')) then
    raise exception using errcode = '42501',
      message = 'Library collection permission is required.';
  end if;
  if target_request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if char_length(btrim(coalesce(target_reason, ''))) not between 2 and 500 then
    raise exception using errcode = '22023',
      message = 'Enter a reversal reason between 2 and 500 characters.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_request_key::text, 0));
  select * into collection from public.library_collections
  where reversal_request_key = target_request_key;
  if found then
    if collection.id <> target_collection_id then
      raise exception using errcode = '23505',
        message = 'That request key was already used for another reversal.';
    end if;
    return jsonb_build_object(
      'ok', true, 'collectionId', collection.id,
      'reversalNumber', collection.reversal_number, 'replayed', true
    );
  end if;

  select * into collection from public.library_collections
  where id = target_collection_id for update;
  if not found then
    raise exception using errcode = '23503', message = 'Library collection not found.';
  end if;
  if collection.status <> 'active' then
    raise exception using errcode = '22023',
      message = 'Only an active Library collection can be reversed.';
  end if;
  select * into charge from public.library_charges
  where id = collection.charge_id for update;
  if not found or charge.amount_paid < collection.amount then
    raise exception using errcode = '23514',
      message = 'The Library balance could not be reconciled for reversal.';
  end if;

  new_paid := charge.amount_paid - collection.amount;
  new_status := case
    when new_paid = 0 then 'unpaid'
    when new_paid < charge.expected_amount then 'partially_paid'
    else 'paid'
  end;
  reversal_reference := private.allocate_document_number('REV');
  select coalesce(nullif(btrim(display_name), ''), 'Authorized Library staff')
  into reverser from public.profiles where id = actor_id;

  update public.library_charges
  set amount_paid = new_paid, status = new_status, updated_by = actor_id
  where id = charge.id;
  update public.library_collections
  set status = 'reversed', reversal_request_key = target_request_key,
      reversal_number = reversal_reference, reversal_reason = btrim(target_reason),
      reversed_at = now(), reversed_by = actor_id,
      reversed_by_name_snapshot = reverser, updated_by = actor_id
  where id = collection.id;

  return jsonb_build_object(
    'ok', true, 'collectionId', collection.id,
    'reversalNumber', reversal_reference,
    'remainingBalance', charge.expected_amount - new_paid, 'replayed', false
  );
end;
$$;
revoke all on function public.reverse_library_collection(uuid, bigint, text)
  from public, anon, authenticated;
grant execute on function public.reverse_library_collection(uuid, bigint, text)
  to authenticated;

-- Current Term 1 decisions supplied by the Chief Engineer. Nursery 1 and
-- Nursery 2 intentionally have no rows because their amounts are unconfirmed.
-- JHS 3 is explicit so it is distinguishable from missing configuration.
insert into public.library_term_rates (
  academic_term_id, class_id, charge_status, amount
)
select term.id, class.id, configured.charge_status, configured.amount
from public.academic_terms term
join public.academic_years year on year.id = term.academic_year_id
cross join (values
  ('KG1', 'chargeable', 198.50::numeric),
  ('KG2', 'chargeable', 198.50::numeric),
  ('BAS1', 'chargeable', 291.50::numeric),
  ('BAS2', 'chargeable', 291.50::numeric),
  ('BAS3', 'chargeable', 291.50::numeric),
  ('BAS4', 'chargeable', 500.00::numeric),
  ('BAS5', 'chargeable', 500.00::numeric),
  ('BAS6', 'chargeable', 500.00::numeric),
  ('JHS1', 'chargeable', 924.00::numeric),
  ('JHS2', 'chargeable', 924.00::numeric),
  ('JHS3', 'not_charged', null::numeric)
) as configured(class_code, charge_status, amount)
join public.classes class on class.code = configured.class_code
where year.is_current and term.is_current
on conflict (academic_term_id, class_id) do nothing;

-- Bring existing current-term enrollments into the new Library ledger. This
-- only creates expected charges for confirmed chargeable rates; it posts no cash.
insert into public.library_charges (
  student_id, enrollment_id, academic_year_id, academic_term_id, class_id,
  term_rate_id, student_name_snapshot, admission_number_snapshot,
  class_name_snapshot, academic_year_name_snapshot, academic_term_name_snapshot,
  expected_amount, created_by, updated_by
)
select
  student.id, enrollment.id, enrollment.academic_year_id,
  enrollment.academic_term_id, enrollment.class_id, rate.id,
  concat_ws(' ', student.first_name, student.middle_name, student.last_name),
  student.admission_number, class.name, year.name, term.name, rate.amount,
  enrollment.created_by, enrollment.updated_by
from public.student_enrollments enrollment
join public.students student on student.id = enrollment.student_id
join public.classes class on class.id = enrollment.class_id
join public.academic_years year on year.id = enrollment.academic_year_id
join public.academic_terms term on term.id = enrollment.academic_term_id
join public.library_term_rates rate
  on rate.academic_term_id = enrollment.academic_term_id
  and rate.class_id = enrollment.class_id
  and rate.charge_status = 'chargeable'
where enrollment.status = 'active'
  and student.status = 'active'
  and year.is_current
  and term.is_current
on conflict (student_id, academic_term_id) do nothing;

comment on table public.library_term_rates is
  'Per-term, per-class Books & Prospectus configuration. Missing means unconfirmed; not_charged is an explicit decision.';
comment on table public.library_charges is
  'Immutable expected Books & Prospectus snapshots with a separate Library balance; excluded from school-fee accounting.';
comment on table public.library_collections is
  'Books & Prospectus collections recorded by Library staff with retry and reversal controls.';
