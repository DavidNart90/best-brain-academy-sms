-- Require the private Storage object to exist before attaching it to a student.

create or replace function public.set_student_photo(
  target_student_id bigint,
  target_photo_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_photo_path text;
begin
  if not (select private.has_permission('students.manage')) then
    raise exception using errcode = '42501', message = 'Student management permission is required.';
  end if;
  if target_photo_path !~ ('^' || target_student_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception using errcode = '22023', message = 'The student photo path is invalid.';
  end if;
  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'student-photos' and name = target_photo_path
  ) then
    raise exception using errcode = '23503', message = 'The uploaded student photo was not found.';
  end if;
  select photo_path into previous_photo_path
  from public.students
  where id = target_student_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;
  update public.students
  set photo_path = target_photo_path
  where id = target_student_id;
  return jsonb_build_object('previousPhotoPath', previous_photo_path);
end;
$$;

revoke all on function public.set_student_photo(bigint, text)
  from public, anon, authenticated;
grant execute on function public.set_student_photo(bigint, text) to authenticated;

