-- Let the Super Administrator branch authorize the current object directly.
-- The student lookup remains required only for ordinary administrator cleanup
-- of unreferenced replacement uploads.

set lock_timeout = '5s';
set statement_timeout = '30s';

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
      and exists (
        select 1
        from public.students student
        where student.id::text = (storage.foldername(name))[1]
      )
    )
  )
);
