-- Guarded deletion for configuration records that have never been used.
-- Historical/current settings remain protected by explicit checks and existing
-- ON DELETE RESTRICT foreign keys. Deletes continue to flow through the
-- configuration audit triggers without granting table-level DELETE access.

create or replace function public.delete_academic_configuration(
  target_kind text,
  target_id bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_name text;
  record_is_current boolean := false;
  record_label text;
begin
  if (select auth.uid()) is null
    or not (select private.has_permission('settings.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Academic settings permission is required.';
  end if;

  if target_id is null or target_id <= 0 then
    raise exception using errcode = '22023', message = 'Choose a valid setting.';
  end if;

  case target_kind
    when 'academic_year' then
      record_label := 'Academic year';
      select name, is_current
      into record_name, record_is_current
      from public.academic_years
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Academic year not found.';
      end if;
      if record_is_current then
        raise exception using
          errcode = '23514',
          message = 'The current academic year cannot be deleted. Choose another current year first.';
      end if;

      delete from public.academic_years where id = target_id;

    when 'academic_term' then
      record_label := 'Academic term';
      select name, is_current
      into record_name, record_is_current
      from public.academic_terms
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Academic term not found.';
      end if;
      if record_is_current then
        raise exception using
          errcode = '23514',
          message = 'The current academic term cannot be deleted. Choose another current term first.';
      end if;

      delete from public.academic_terms where id = target_id;

    when 'class' then
      record_label := 'Class';
      select name into record_name
      from public.classes
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Class not found.';
      end if;

      delete from public.classes where id = target_id;

    when 'school_location' then
      record_label := 'Location';
      select name into record_name
      from public.school_locations
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Location not found.';
      end if;

      delete from public.school_locations where id = target_id;

    else
      raise exception using errcode = '22023', message = 'Unsupported academic setting.';
  end case;

  return format('%s "%s" deleted.', record_label, record_name);
exception
  when foreign_key_violation then
    raise exception using
      errcode = '23503',
      message = format(
        '%s "%s" is already in use and cannot be deleted. Archive it instead.',
        coalesce(record_label, 'Setting'),
        coalesce(record_name, 'Unknown')
      );
end;
$$;

revoke all on function public.delete_academic_configuration(text, bigint)
  from public, anon, authenticated;
grant execute on function public.delete_academic_configuration(text, bigint)
  to authenticated;

create or replace function public.delete_finance_configuration(
  target_kind text,
  target_id bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_name text;
  record_label text;
begin
  if (select auth.uid()) is null
    or not (select private.has_permission('finance.settings.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Financial settings permission is required.';
  end if;

  if target_id is null or target_id <= 0 then
    raise exception using errcode = '22023', message = 'Choose a valid setting.';
  end if;

  case target_kind
    when 'payment_method' then
      record_label := 'Payment method';
      select name into record_name
      from public.payment_methods
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Payment method not found.';
      end if;

      delete from public.payment_methods where id = target_id;

    when 'expense_category' then
      record_label := 'Expense category';
      select name into record_name
      from public.expense_categories
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Expense category not found.';
      end if;

      delete from public.expense_categories where id = target_id;

    when 'misc_income_category' then
      record_label := 'Income category';
      select name into record_name
      from public.misc_income_categories
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Income category not found.';
      end if;

      delete from public.misc_income_categories where id = target_id;

    when 'salary_deduction_type' then
      record_label := 'Deduction type';
      select name into record_name
      from public.salary_deduction_types
      where id = target_id
      for update;

      if record_name is null then
        raise exception using errcode = 'P0002', message = 'Deduction type not found.';
      end if;

      delete from public.salary_deduction_types where id = target_id;

    else
      raise exception using errcode = '22023', message = 'Unsupported financial setting.';
  end case;

  return format('%s "%s" deleted.', record_label, record_name);
exception
  when foreign_key_violation then
    raise exception using
      errcode = '23503',
      message = format(
        '%s "%s" is already in use and cannot be deleted. Archive it instead.',
        coalesce(record_label, 'Setting'),
        coalesce(record_name, 'Unknown')
      );
end;
$$;

revoke all on function public.delete_finance_configuration(text, bigint)
  from public, anon, authenticated;
grant execute on function public.delete_finance_configuration(text, bigint)
  to authenticated;
