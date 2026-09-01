-- P2-05 advisor hardening: cover request foreign keys and keep one read policy per table.
create index administrator_requests_provider_user_idx
  on public.administrator_provisioning_requests(provider_user_id)
  where provider_user_id is not null;
create index administrator_requests_role_idx
  on public.administrator_provisioning_requests(role_code);

drop policy profiles_read_self on public.profiles;
drop policy profiles_read_administrators on public.profiles;
create policy profiles_read_authorized on public.profiles for select to authenticated
  using (
    (id = (select auth.uid()) and (select private.has_valid_session()))
    or (select private.has_permission('administrators.manage'))
  );

drop policy user_roles_read_self on public.user_roles;
drop policy user_roles_read_administrators on public.user_roles;
create policy user_roles_read_authorized on public.user_roles for select to authenticated
  using (
    (user_id = (select auth.uid()) and (select private.is_active_staff()))
    or (select private.has_permission('administrators.manage'))
  );
