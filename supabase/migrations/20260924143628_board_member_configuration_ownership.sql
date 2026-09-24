set lock_timeout = '5s';

insert into public.role_permissions (role_code, permission_code)
values
  ('MANAGEMENT', 'settings.manage'),
  ('MANAGEMENT', 'finance.settings.manage'),
  ('MANAGEMENT', 'library.settings.manage')
on conflict (role_code, permission_code) do nothing;
