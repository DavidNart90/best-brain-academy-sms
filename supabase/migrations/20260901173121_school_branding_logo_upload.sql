alter table public.school_settings
  add column logo_path text;

alter table public.school_settings
  add constraint school_settings_logo_path_check
  check (
    logo_path is null
    or logo_path ~ '^school/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'
  );

comment on column public.school_settings.logo_path is
  'Current school logo object path in the school-branding Storage bucket.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'school-branding',
  'school-branding',
  true,
  2097152,
  array['image/png']
);

create policy school_branding_insert_settings
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-branding'
  and (select private.has_permission('settings.manage'))
  and name ~ '^school/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'
);

create policy school_branding_delete_settings
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-branding'
  and (select private.has_permission('settings.manage'))
  and name ~ '^school/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'
);

grant select (
  id,
  school_name,
  short_name,
  motto,
  logo_path,
  updated_at
)
on public.school_settings
to anon;

create policy school_settings_read_public_branding
on public.school_settings
for select
to anon
using (id = 1);
