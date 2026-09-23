-- Approved student-fee rates remain editable during the active current term.
-- Issued invoices retain immutable line snapshots, while every future term stays locked.

set lock_timeout = '5s';

create or replace function private.guard_fee_rate_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_term_id bigint := case when tg_op = 'DELETE' then old.academic_term_id else new.academic_term_id end;
  target_year_id bigint := case when tg_op = 'DELETE' then old.academic_year_id else new.academic_year_id end;
  configuration_status text;
  target_is_current boolean;
begin
  if tg_op = 'UPDATE' and (
    old.academic_term_id is distinct from new.academic_term_id
    or old.academic_year_id is distinct from new.academic_year_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Move a student-fee rate by creating it in the correct term instead.';
  end if;

  select
    term.is_current
      and term.status = 'active'
      and year.is_current
      and year.status = 'active'
  into target_is_current
  from public.academic_terms term
  join public.academic_years year on year.id = term.academic_year_id
  where term.id = target_term_id
    and year.id = target_year_id
  for key share of term, year;

  if target_is_current is null then
    raise exception using
      errcode = '23514',
      message = 'The student-fee academic period is unavailable.';
  end if;
  if not target_is_current then
    raise exception using
      errcode = '23514',
      message = 'Student fees for a future term are locked until that term becomes current.';
  end if;

  select configuration.status
  into configuration_status
  from public.term_rate_configurations configuration
  where configuration.academic_term_id = target_term_id
    and configuration.domain = 'school_fees'
  for key share;

  if configuration_status is null then
    raise exception using
      errcode = '23514',
      message = 'Create a school-fee draft for this term before editing rates.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.guard_fee_rate_draft()
  from public, anon, authenticated;

comment on function private.guard_fee_rate_draft() is
  'Allows draft or approved student-fee rate edits only for the active current academic term; issued invoices retain snapshots.';
