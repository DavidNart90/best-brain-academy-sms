-- Phase 3 finance core (P3-03 fix): propagate created invoice details from generate_term_invoices.
-- The previous version only returned a count for created invoices; callers (including tests and the
-- future UI) need the invoiceId/invoiceNumber for each created invoice, not just a total.

create or replace function public.generate_term_invoices(
  target_academic_year_id bigint,
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
  enrollment_row record;
  outcome jsonb;
  created jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
begin
  if actor_id is null or not (select private.has_permission('finance.transactions.manage')) then
    raise exception using errcode = '42501', message = 'Finance transaction permission is required.';
  end if;
  if not exists (
    select 1 from public.academic_terms t
    join public.academic_years y on y.id = t.academic_year_id
    where t.id = target_academic_term_id and y.id = target_academic_year_id
      and t.status = 'active' and y.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'Choose an active academic year and term.';
  end if;

  if target_student_id is not null then
    begin
      outcome := private.generate_invoice_for_student(
        target_student_id, target_academic_year_id, target_academic_term_id, actor_id
      );
    exception when others then
      outcome := jsonb_build_object('studentId', target_student_id, 'status', 'skipped', 'reason', sqlerrm);
    end;
    if outcome->>'status' = 'created' then
      created := jsonb_build_array(outcome);
    else
      skipped := jsonb_build_array(outcome);
    end if;
  else
    for enrollment_row in
      select distinct se.student_id
      from public.student_enrollments se
      where se.academic_year_id = target_academic_year_id
        and se.academic_term_id = target_academic_term_id
        and se.status = 'active'
      order by se.student_id
    loop
      begin
        outcome := private.generate_invoice_for_student(
          enrollment_row.student_id, target_academic_year_id, target_academic_term_id, actor_id
        );
      exception when others then
        outcome := jsonb_build_object(
          'studentId', enrollment_row.student_id, 'status', 'skipped', 'reason', sqlerrm
        );
      end;
      if outcome->>'status' = 'created' then
        created := created || jsonb_build_array(outcome);
      else
        skipped := skipped || jsonb_build_array(outcome);
      end if;
    end loop;
  end if;

  return jsonb_build_object('createdCount', jsonb_array_length(created), 'created', created, 'skipped', skipped);
end;
$$;
revoke all on function public.generate_term_invoices(bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.generate_term_invoices(bigint, bigint, bigint) to authenticated;
