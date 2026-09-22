alter table public.fee_component_rates
  drop constraint fee_component_rates_amount_check,
  add constraint fee_component_rates_amount_check check (amount >= 0);

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
  if new.amount < 0 then
    raise exception using errcode = '23514', message = 'Fee amounts cannot be negative.';
  end if;
  if new.amount = 0 and component_scope <> 'location' then
    raise exception using errcode = '23514', message = 'Only location transport charges may have a zero amount.';
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

alter table public.invoice_lines
  drop constraint invoice_lines_amount_check,
  add constraint invoice_lines_amount_check check (amount >= 0);

create or replace function private.validate_invoice_line_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  component_scope text;
begin
  if new.amount < 0 then
    raise exception using errcode = '23514', message = 'Invoice line amounts cannot be negative.';
  end if;

  if new.amount = 0 then
    select scope
      into component_scope
      from public.fee_components
      where id = new.fee_component_id;

    if component_scope is distinct from 'location' then
      raise exception using
        errcode = '23514',
        message = 'Only location transport invoice lines may have a zero amount.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_invoice_line_amount() from public, anon, authenticated;

create trigger invoice_lines_amount_check
before insert or update of amount, fee_component_id on public.invoice_lines
for each row execute function private.validate_invoice_line_amount();
