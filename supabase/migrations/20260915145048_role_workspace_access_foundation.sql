-- Approved role workspace access foundation (D-14 / P6-R01).
-- Keep the stored MANAGEMENT code for compatibility while presenting it as
-- Board Member. Reset operational role grants to the reviewed least-privilege
-- matrix and add a narrow outstanding-fees read/print boundary.

set lock_timeout = '5s';

insert into public.permissions (code, description) values
  ('finance.outstanding.read', 'View unpaid and partially paid student invoice balances'),
  ('finance.outstanding.print', 'Print outstanding student balances using the active filters')
on conflict (code) do update set description = excluded.description;

update public.roles
set label = 'Board Member'
where code = 'MANAGEMENT';

delete from public.role_permissions
where role_code in ('ADMINISTRATOR', 'ACCOUNTANT', 'MANAGEMENT', 'LIBRARIAN');

insert into public.role_permissions (role_code, permission_code) values
  ('ADMINISTRATOR', 'dashboard.read'),
  ('ADMINISTRATOR', 'admissions.read'),
  ('ADMINISTRATOR', 'students.read'),
  ('ADMINISTRATOR', 'students.manage'),
  ('ADMINISTRATOR', 'students.import'),
  ('ADMINISTRATOR', 'students.export'),
  ('ADMINISTRATOR', 'classes.read'),
  ('ADMINISTRATOR', 'staff.read'),
  ('ADMINISTRATOR', 'finance.outstanding.read'),
  ('ADMINISTRATOR', 'finance.outstanding.print'),

  ('ACCOUNTANT', 'dashboard.read'),
  ('ACCOUNTANT', 'students.read'),
  ('ACCOUNTANT', 'staff.read'),
  ('ACCOUNTANT', 'financials.read'),
  ('ACCOUNTANT', 'finance.transactions.manage'),
  ('ACCOUNTANT', 'finance.settings.manage'),
  ('ACCOUNTANT', 'finance.outstanding.read'),
  ('ACCOUNTANT', 'finance.outstanding.print'),
  ('ACCOUNTANT', 'reports.read'),

  ('MANAGEMENT', 'dashboard.read'),
  ('MANAGEMENT', 'financials.read'),
  ('MANAGEMENT', 'reports.read'),

  ('LIBRARIAN', 'dashboard.read'),
  ('LIBRARIAN', 'library.read'),
  ('LIBRARIAN', 'library.collections.manage');

insert into public.role_permissions (role_code, permission_code)
select 'SUPER_ADMIN', permission.code
from public.permissions permission
on conflict (role_code, permission_code) do nothing;

create policy invoices_read_outstanding_balances
on public.invoices
for select
to authenticated
using (
  status in ('unpaid', 'partially_paid')
  and outstanding > 0
  and (select private.has_permission('finance.outstanding.read'))
);
