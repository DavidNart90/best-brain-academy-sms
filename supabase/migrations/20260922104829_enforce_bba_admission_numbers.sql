create or replace function private.enforce_bba_admission_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.admission_number is not distinct from old.admission_number then
    return new;
  end if;

  new.admission_number := upper(btrim(new.admission_number));

  if new.admission_number !~ '^BBA-[0-9]{3,36}$' then
    raise exception using
      errcode = '23514',
      message = 'Admission number must use BBA- followed by at least three digits, for example BBA-001.',
      constraint = 'students_bba_admission_number_format';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_bba_admission_number() from public;
revoke all on function private.enforce_bba_admission_number() from anon;
revoke all on function private.enforce_bba_admission_number() from authenticated;

drop trigger if exists enforce_bba_admission_number on public.students;
create trigger enforce_bba_admission_number
before insert or update of admission_number on public.students
for each row
execute function private.enforce_bba_admission_number();

comment on function private.enforce_bba_admission_number() is
  'Normalizes and enforces BBA-001-style admission numbers for new or changed identifiers while preserving unchanged legacy identifiers.';
