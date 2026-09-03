-- Run only through MCP on the authorized isolated test project.
-- All actors, sessions, staff, request keys, numbering and audit changes roll back.
-- Never substitute an existing user's identity for the synthetic actor.
begin;
do $$
declare actor uuid := gen_random_uuid(); session uuid := gen_random_uuid();
begin
  insert into auth.users(id, email) values(actor, 'staff-check-' || actor::text || '@example.invalid');
  update public.profiles set status = 'active', must_change_password = false where id = actor;
  insert into public.user_roles(user_id, role_code) values(actor, 'ADMINISTRATOR');
  insert into auth.sessions(id, user_id, not_after) values(session, actor, now() + interval '10 minutes');
  perform set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated','session_id',session)::text, true);
  perform set_config('test.staff_actor', actor::text, true);
end;
$$;
set local role authenticated;
do $$
declare
  request uuid := gen_random_uuid();
  payload jsonb;
  result jsonb;
  member_id bigint;
  before_staff bigint;
  before_audit bigint;
  assignment_id bigint;
  year_id bigint;
  term_id bigint;
  class_a bigint;
  class_b bigint;
  starts date;
begin
  select id into year_id from public.academic_years where is_current;
  select id, starts_on into term_id, starts from public.academic_terms where is_current and academic_year_id = year_id;
  select id into class_a from public.classes where status='active' order by id limit 1;
  select id into class_b from public.classes where status='active' and id <> class_a order by id limit 1;
  if starts is null or class_b is null then raise exception 'Test requires a scheduled term and two active classes'; end if;
  select count(*) into before_staff from public.staff;
  select count(*) into before_audit from public.audit_logs;
  payload := jsonb_build_object('requestKey',request,'fullName','Synthetic Staff Verification',
    'staffType','teaching','position','Teacher','status','active','knownSubjects',jsonb_build_array('Maths','Science'),
    'assignments',jsonb_build_array(
      jsonb_build_object('academicYearId',year_id,'academicTermId',term_id,'classId',class_a,'startedOn',starts,'assignmentKind','teaching','subjectName','Maths'),
      jsonb_build_object('academicYearId',year_id,'academicTermId',term_id,'classId',class_b,'startedOn',starts,'assignmentKind','teaching','subjectName','Science'),
      jsonb_build_object('academicYearId',year_id,'academicTermId',term_id,'classId',class_a,'startedOn',starts,'assignmentKind','head')));
  result := public.create_staff(payload);
  member_id := (result->>'staffId')::bigint;
  if not exists(select 1 from public.staff where id=member_id and recorded_name='Synthetic Staff Verification'
    and phone is null and email is null and date_joined is null and first_name is null and last_name is null
    and staff_number ~ '^BBS-Staff-[0-9]{3,12}$') then raise exception 'Partial-details or numbering failure'; end if;
  if (select count(*) from public.staff_assignments where staff_id=member_id) <> 3 then raise exception 'Explicit pairs/leadership not preserved'; end if;
  if (select count(*) from public.audit_logs) <> before_audit + 4 then raise exception 'Staff/assignment audit not atomic'; end if;
  if public.create_staff(payload) <> result then raise exception 'Replay result differs'; end if;
  if (select count(*) from public.staff) <> before_staff + 1 or (select count(*) from public.audit_logs) <> before_audit + 4 then raise exception 'Replay duplicated data'; end if;
  begin
    perform public.create_staff(payload || '{"position":"Different"}'::jsonb);
    raise exception 'Changed replay accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.assign_staff_class(member_id, (payload->'assignments'->0));
    raise exception 'Duplicate teaching pair accepted';
  exception when unique_violation then null; end;
  begin
    perform public.archive_staff(member_id);
    raise exception 'Active assignments allowed archive';
  exception when invalid_parameter_value then null; end;
  select id into assignment_id from public.staff_assignments where staff_id=member_id and assignment_kind='head';
  perform public.end_staff_assignment(assignment_id, starts);
  if not exists(select 1 from public.staff_assignments where id=assignment_id and status='completed' and ended_on=starts) then raise exception 'Ending lost history'; end if;
  perform public.assign_staff_class(member_id, payload->'assignments'->2);
  if (select count(*) from public.staff_assignments where staff_id=member_id and assignment_kind='head') <> 2 then raise exception 'Reappointment overwrote history'; end if;
  select count(*) into before_staff from public.staff;
  select count(*) into before_audit from public.audit_logs;
  begin
    perform public.import_staff(jsonb_build_object('requestKey',gen_random_uuid(),'rows',jsonb_build_array(
      jsonb_build_object('fullName','Synthetic Batch Good','staffType','non_teaching','position','Driver','status','active'),
      jsonb_build_object('fullName','Synthetic Batch Invalid','staffType','non_teaching','position','Driver','status','active','knownSubjects',jsonb_build_array('Maths')))));
    raise exception 'Invalid batch accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.staff) <> before_staff or (select count(*) from public.audit_logs) <> before_audit then raise exception 'Failed batch left staff/audit rows'; end if;
  begin
    perform public.create_staff((payload - 'assignments') || jsonb_build_object('requestKey',gen_random_uuid(),'phone','N/A'));
    raise exception 'Invalid phone accepted';
  exception when check_violation then null; end;
  begin
    perform public.create_staff((payload - 'assignments') || jsonb_build_object('requestKey',gen_random_uuid(),'staffNumber','BBS-Staff-999999999999'));
    raise exception 'Client number override accepted';
  exception when invalid_parameter_value then null; end;
  begin
    update public.staff set phone = '123456789' where id=member_id;
    raise exception 'Direct table write allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.staff_assignments where staff_id=member_id;
    raise exception 'Direct assignment delete allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
update public.profiles set status='disabled' where id=current_setting('test.staff_actor')::uuid;
set local role authenticated;
do $$
begin
  if exists(select 1 from public.staff) then raise exception 'Disabled actor can read staff'; end if;
  begin
    perform public.create_staff('{}'::jsonb);
    raise exception 'Disabled actor can create staff';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.create_staff('{}'::jsonb);
    raise exception 'Anonymous actor can create staff';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'PASS: staff details, pairs, headship, replay, changed payload, rollback, history, numbering, direct writes, disabled and anonymous actors; fixtures rolled back' as result;
