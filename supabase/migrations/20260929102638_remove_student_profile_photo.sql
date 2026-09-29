-- Allow Super Administrators to remove an attached student profile photo while
-- preserving ordinary administrator cleanup for uploads that are no longer in use.

set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function private.student_photo_is_attached(
  target_photo_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.has_permission('students.manage'))
    and exists (
      select 1
      from public.students
      where photo_path = target_photo_path
    );
$$;

revoke all on function private.student_photo_is_attached(text)
  from public, anon, authenticated;
grant execute on function private.student_photo_is_attached(text)
  to authenticated;

drop policy if exists student_photos_delete_authorized on storage.objects;
create policy student_photos_delete_authorized
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-photos'
  and (
    (select private.has_permission('administrators.manage'))
    or (
      (select private.has_permission('students.manage'))
      and not (select private.student_photo_is_attached(name))
    )
  )
  and exists (
    select 1
    from public.students student
    where student.id::text = (storage.foldername(name))[1]
  )
);

create or replace function public.remove_student_photo(
  target_student_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  removed_photo_path text;
begin
  if actor_id is null or not (select private.has_aal2()) then
    raise exception using
      errcode = '42501',
      message = 'Super Administrator access is required.';
  end if;

  select photo_path
  into removed_photo_path
  from public.students
  where id = target_student_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;
  if removed_photo_path is null then
    raise exception using
      errcode = '22023',
      message = 'This student does not have a profile photo.';
  end if;

  update public.students
  set photo_path = null
  where id = target_student_id;

  return jsonb_build_object('removedPhotoPath', removed_photo_path);
end;
$$;

revoke all on function public.remove_student_photo(bigint)
  from public, anon, authenticated;
grant execute on function public.remove_student_photo(bigint)
  to authenticated;

create or replace function public.restore_student_photo_after_failed_removal(
  target_student_id bigint,
  target_photo_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_photo_path text;
begin
  if (select auth.uid()) is null or not (select private.has_aal2()) then
    raise exception using
      errcode = '42501',
      message = 'Super Administrator access is required.';
  end if;
  if target_photo_path !~ ('^' || target_student_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception using
      errcode = '22023',
      message = 'The student photo path is invalid.';
  end if;

  select photo_path
  into current_photo_path
  from public.students
  where id = target_student_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;
  if current_photo_path is not null then
    return false;
  end if;
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'student-photos'
      and name = target_photo_path
  ) then
    return false;
  end if;

  update public.students
  set photo_path = target_photo_path
  where id = target_student_id;

  return true;
end;
$$;

revoke all on function public.restore_student_photo_after_failed_removal(bigint, text)
  from public, anon, authenticated;
grant execute on function public.restore_student_photo_after_failed_removal(bigint, text)
  to authenticated;

comment on function private.student_photo_is_attached(text) is
  'RLS helper that distinguishes an attached student photo from an unreferenced upload cleanup target.';
comment on function public.remove_student_photo(bigint) is
  'Super Administrator-only operation that clears an attached student photo and returns its private Storage path for API deletion.';
comment on function public.restore_student_photo_after_failed_removal(bigint, text) is
  'Conditionally restores a cleared student photo reference when the Storage API deletion fails and no newer photo was attached.';
