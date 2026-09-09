-- Phase 6 security hardening: durable, per-account limits for sensitive app operations.

create table private.rate_limit_policies (
  bucket text primary key,
  max_requests integer not null check (max_requests between 1 and 1000),
  window_seconds integer not null check (window_seconds between 1 and 86400),
  description text not null,
  check (bucket ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table private.request_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null references private.rate_limit_policies(bucket) on delete cascade,
  window_started_at timestamptz not null,
  request_count bigint not null check (request_count > 0),
  updated_at timestamptz not null,
  primary key (actor_id, bucket)
);

alter table private.rate_limit_policies enable row level security;
alter table private.request_rate_limits enable row level security;

revoke all on table private.rate_limit_policies from public, anon, authenticated;
revoke all on table private.request_rate_limits from public, anon, authenticated;

insert into private.rate_limit_policies (
  bucket,
  max_requests,
  window_seconds,
  description
) values
  ('administrator-write', 20, 600, 'Administrator provisioning and account changes'),
  ('configuration-write', 60, 600, 'School and academic configuration changes'),
  ('data-export', 30, 600, 'Student, staff, and administrator exports'),
  ('data-import', 12, 600, 'Spreadsheet preview and confirmed import requests'),
  ('file-upload', 20, 600, 'Student photo and school logo uploads'),
  ('finance-settings', 60, 600, 'Financial configuration changes'),
  ('finance-write', 120, 600, 'Invoice, payment, receipt, expense, and salary mutations'),
  ('invoice-search', 120, 60, 'Interactive open-invoice searches'),
  ('password-change', 10, 600, 'Authenticated password replacement attempts'),
  ('people-write', 120, 600, 'Student and staff record changes'),
  ('report-export', 30, 600, 'CSV and workbook report exports');

create function public.consume_rate_limit(rate_limit_bucket text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := (select auth.uid());
  policy_record record;
  usage_record record;
  checked_at timestamptz := clock_timestamp();
  retry_after integer;
begin
  if current_actor_id is null or not private.is_active_staff() then
    raise exception using
      errcode = '42501',
      message = 'An active verified account is required.';
  end if;

  select policy.max_requests, policy.window_seconds
  into policy_record
  from private.rate_limit_policies policy
  where policy.bucket = rate_limit_bucket;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Unknown rate-limit bucket.';
  end if;

  insert into private.request_rate_limits (
    actor_id,
    bucket,
    window_started_at,
    request_count,
    updated_at
  ) values (
    current_actor_id,
    rate_limit_bucket,
    checked_at,
    1,
    checked_at
  )
  on conflict (actor_id, bucket) do update
  set
    window_started_at = case
      when private.request_rate_limits.window_started_at
        + make_interval(secs => policy_record.window_seconds) <= checked_at
        then checked_at
      else private.request_rate_limits.window_started_at
    end,
    request_count = case
      when private.request_rate_limits.window_started_at
        + make_interval(secs => policy_record.window_seconds) <= checked_at
        then 1
      else private.request_rate_limits.request_count + 1
    end,
    updated_at = checked_at
  returning window_started_at, request_count
  into usage_record;

  retry_after := greatest(
    1,
    ceil(extract(epoch from (
      usage_record.window_started_at
        + make_interval(secs => policy_record.window_seconds)
        - checked_at
    )))::integer
  );

  return jsonb_build_object(
    'allowed', usage_record.request_count <= policy_record.max_requests,
    'remaining', greatest(policy_record.max_requests - usage_record.request_count, 0),
    'retryAfter', retry_after
  );
end;
$$;

revoke all on function public.consume_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text) to authenticated;

comment on function public.consume_rate_limit(text) is
  'Consumes one request from a database-owned per-account policy. The caller cannot supply limits or reset windows.';
