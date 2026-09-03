-- P3-04 correctness fix: complete the pending idempotency row on the posting call.
-- The first helper call reserves the request key with a pending result; the second
-- call in the same transaction must replace that placeholder with the committed result.

create or replace function private.persist_finance_request(
  request_key uuid,
  target_operation text,
  actor_id uuid,
  target_fingerprint text,
  target_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_request record;
  existing_request record;
begin
  if request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;
  if nullif(btrim(target_fingerprint), '') is null then
    raise exception using errcode = '22023', message = 'The request fingerprint is required.';
  end if;

  insert into private.finance_requests (
    request_key, actor_id, operation, fingerprint, result
  ) values (
    request_key, actor_id, target_operation, target_fingerprint, target_result
  )
  on conflict (request_key) do nothing
  returning * into inserted_request;

  if inserted_request is not null then
    return target_result;
  end if;

  select * into existing_request
  from private.finance_requests
  where request_key = persist_finance_request.request_key
  for update;

  if existing_request.operation <> target_operation then
    raise exception using errcode = '23505',
      message = 'This request key is already in use for a different operation.';
  end if;
  if existing_request.fingerprint <> target_fingerprint then
    raise exception using errcode = '23505',
      message = 'This request key was already used with different data.';
  end if;

  if existing_request.result->>'status' = 'pending' then
    update private.finance_requests
    set result = target_result
    where request_key = persist_finance_request.request_key;
    return target_result;
  end if;

  return existing_request.result;
end;
$$;
revoke all on function private.persist_finance_request(uuid, text, uuid, text, jsonb)
  from public, anon, authenticated;
