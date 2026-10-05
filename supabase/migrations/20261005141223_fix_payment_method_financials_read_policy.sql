set lock_timeout = '5s';

drop policy if exists payment_methods_read_finance_or_library
on public.payment_methods;

create policy payment_methods_read_finance_or_library
on public.payment_methods
for select
to authenticated
using (
  (select private.has_permission('financials.read'))
  or (select private.has_permission('library.read'))
);

comment on policy payment_methods_read_finance_or_library
on public.payment_methods is
  'Payment methods are readable by authorized Finance or Library operators.';
