-- Books & Prospectus follows the current-term editing rule used by school fees:
-- the approved current term remains editable, while every non-current term is locked.

set lock_timeout = '5s';

alter function private.guard_current_term_school_fee_configuration()
  rename to guard_current_term_rate_configuration;

alter trigger term_rate_configurations_current_school_fee_guard
  on public.term_rate_configurations
  rename to term_rate_configurations_current_term_guard;

create or replace function private.guard_current_term_rate_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.academic_terms term
    join public.academic_years year on year.id = term.academic_year_id
    where term.id = new.academic_term_id
      and term.is_current
      and term.status = 'active'
      and year.is_current
      and year.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = case new.domain
        when 'school_fees'
          then 'Student fees for a future term are locked until that term becomes current.'
        else 'Books & Prospectus prices for a future term are locked until that term becomes current.'
      end;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_current_term_rate_configuration()
  from public, anon, authenticated;

comment on function private.guard_current_term_rate_configuration() is
  'Keeps school-fee and Books & Prospectus configuration writable only for the active current academic term.';

create or replace function private.guard_library_rate_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_term_id bigint := case when tg_op = 'DELETE' then old.academic_term_id else new.academic_term_id end;
  configuration_status text;
  target_is_current boolean;
begin
  if tg_op = 'UPDATE'
    and old.academic_term_id is distinct from new.academic_term_id then
    raise exception using
      errcode = '23514',
      message = 'Move a Books & Prospectus price by creating it in the correct term instead.';
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
  for key share of term, year;

  if target_is_current is null then
    raise exception using
      errcode = '23514',
      message = 'The Books & Prospectus academic period is unavailable.';
  end if;
  if not target_is_current then
    raise exception using
      errcode = '23514',
      message = 'Books & Prospectus prices for a future term are locked until that term becomes current.';
  end if;

  select configuration.status
  into configuration_status
  from public.term_rate_configurations configuration
  where configuration.academic_term_id = target_term_id
    and configuration.domain = 'library_prospectus'
  for key share;

  if configuration_status is null then
    raise exception using
      errcode = '23514',
      message = 'Create a Books & Prospectus draft for this term before editing prices.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.guard_library_rate_draft()
  from public, anon, authenticated;

comment on function private.guard_library_rate_draft() is
  'Allows draft or approved Books & Prospectus price edits only for the active current academic term; generated charges retain snapshots.';

comment on function public.prepare_term_rate_configuration(bigint, text) is
  'Creates an editable current-term rate draft and copies the immediately previous approved term when available.';

comment on function public.approve_term_rate_configuration(bigint, text) is
  'Approves current-term rates for billing; approved current-term prices remain editable and historical billing snapshots remain unchanged.';
