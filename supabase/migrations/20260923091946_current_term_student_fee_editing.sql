-- Student-fee drafts belong to the active academic term. Future terms remain
-- locked until the academic configuration marks them current.

set lock_timeout = '5s';

create or replace function private.guard_current_term_school_fee_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.domain = 'school_fees' and not exists (
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
      message = 'Student fees for a future term are locked until that term becomes current.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_current_term_school_fee_configuration()
  from public, anon, authenticated;

create trigger term_rate_configurations_current_school_fee_guard
before insert or update on public.term_rate_configurations
for each row execute function private.guard_current_term_school_fee_configuration();

comment on function private.guard_current_term_school_fee_configuration() is
  'Keeps student-fee configuration editable only for the active current term; Books & Prospectus retains its separate workflow.';
