-- Run this file in session A, and concurrently with pg_sleep(0) in session B.
-- Session B must wait for session A's staff-number row lock; both roll back.
-- This verifies lock serialization, not distinct numbering across committed requests.
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
declare started timestamptz := clock_timestamp(); result jsonb;
begin
result := public.create_staff(jsonb_build_object('requestKey',gen_random_uuid(),'fullName','Synthetic Concurrent Staff','staffType','non_teaching','position','Driver','status','active'));
perform set_config('test.staff_lock_elapsed',extract(epoch from clock_timestamp()-started)::text,true);
perform pg_sleep(8);
end;
$$;
select current_setting('test.staff_lock_elapsed') as rpc_seconds;
reset role;
rollback;
