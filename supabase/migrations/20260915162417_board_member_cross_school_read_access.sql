-- Expand Board Member visibility across every operational workspace while
-- keeping all mutation, configuration and Super Administrator permissions out.

set lock_timeout = '5s';

delete from public.role_permissions
where role_code = 'MANAGEMENT';

insert into public.role_permissions (role_code, permission_code) values
  ('MANAGEMENT', 'dashboard.read'),
  ('MANAGEMENT', 'admissions.read'),
  ('MANAGEMENT', 'students.read'),
  ('MANAGEMENT', 'classes.read'),
  ('MANAGEMENT', 'staff.read'),
  ('MANAGEMENT', 'financials.read'),
  ('MANAGEMENT', 'finance.outstanding.read'),
  ('MANAGEMENT', 'finance.outstanding.print'),
  ('MANAGEMENT', 'library.read'),
  ('MANAGEMENT', 'reports.read');
