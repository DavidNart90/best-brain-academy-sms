-- Audited school asset and inventory register. Direct writes stay closed;
-- authorized staff use the allowlisted save RPC and retain disposed records.
set lock_timeout = '5s';

insert into public.permissions (code, description)
values ('assets.manage', 'View and maintain the school asset and inventory register')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role_code, permission_code)
values
  ('SUPER_ADMIN', 'assets.manage'),
  ('ACCOUNTANT', 'assets.manage'),
  ('MANAGEMENT', 'assets.manage')
on conflict (role_code, permission_code) do nothing;

create table public.asset_inventory_records (
  id bigint generated always as identity primary key,
  record_code text not null
    check (record_code ~ '^[A-Z0-9][A-Z0-9/-]{1,31}$'),
  record_type text not null
    check (record_type in ('asset', 'inventory')),
  item_name text not null
    check (char_length(btrim(item_name)) between 2 and 160),
  category text not null
    check (char_length(btrim(category)) between 2 and 80),
  description text
    check (description is null or char_length(description) <= 500),
  quantity numeric(12,2) not null default 1
    check (quantity >= 0),
  unit_name text not null default 'item'
    check (char_length(btrim(unit_name)) between 1 and 40),
  unit_cost numeric(14,2)
    check (unit_cost is null or unit_cost >= 0),
  reorder_level numeric(12,2)
    check (reorder_level is null or reorder_level >= 0),
  condition text not null default 'good'
    check (condition in ('new', 'good', 'fair', 'poor', 'damaged', 'not_applicable')),
  status text not null default 'active'
    check (status in ('active', 'in_storage', 'under_repair', 'out_of_stock', 'disposed')),
  school_location_id bigint references public.school_locations(id) on delete restrict,
  room_or_store text
    check (room_or_store is null or char_length(room_or_store) <= 120),
  acquired_on date,
  supplier text
    check (supplier is null or char_length(supplier) <= 160),
  custodian text
    check (custodian is null or char_length(custodian) <= 160),
  serial_number text
    check (serial_number is null or char_length(serial_number) <= 120),
  notes text
    check (notes is null or char_length(notes) <= 1000),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_inventory_reorder_scope_check
    check (record_type = 'inventory' or reorder_level is null)
);

create unique index asset_inventory_record_code_unique
  on public.asset_inventory_records (lower(record_code));
create index asset_inventory_type_status_updated_idx
  on public.asset_inventory_records (record_type, status, updated_at desc, id desc);
create index asset_inventory_location_idx
  on public.asset_inventory_records (school_location_id)
  where school_location_id is not null;
create index asset_inventory_created_by_idx
  on public.asset_inventory_records (created_by)
  where created_by is not null;
create index asset_inventory_updated_by_idx
  on public.asset_inventory_records (updated_by)
  where updated_by is not null;

create trigger asset_inventory_records_stamp
before insert or update on public.asset_inventory_records
for each row execute function private.stamp_configuration_record();

create trigger asset_inventory_records_audit
after insert or update or delete on public.asset_inventory_records
for each row execute function private.write_configuration_audit();

alter table public.asset_inventory_records enable row level security;

revoke all on table public.asset_inventory_records from public, anon, authenticated;
grant select on table public.asset_inventory_records to authenticated;

create policy asset_inventory_records_read_authorized
on public.asset_inventory_records
for select
to authenticated
using ((select private.has_permission('assets.manage')));

create or replace function public.save_asset_inventory_record(
  target_record_id bigint,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  requested_quantity numeric;
  requested_unit_cost numeric;
  requested_reorder_level numeric;
  requested_location_id bigint;
  saved_id bigint;
begin
  if actor_id is null or not (select private.has_permission('assets.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Asset and inventory management permission is required.';
  end if;

  if jsonb_typeof(payload) is distinct from 'object'
    or jsonb_typeof(payload->'recordCode') is distinct from 'string'
    or jsonb_typeof(payload->'recordType') is distinct from 'string'
    or jsonb_typeof(payload->'itemName') is distinct from 'string'
    or jsonb_typeof(payload->'category') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'description'), 'null') not in ('string', 'null')
    or jsonb_typeof(payload->'quantity') is distinct from 'string'
    or jsonb_typeof(payload->'unitName') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'unitCost'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'reorderLevel'), 'null') not in ('string', 'null')
    or jsonb_typeof(payload->'condition') is distinct from 'string'
    or jsonb_typeof(payload->'status') is distinct from 'string'
    or coalesce(jsonb_typeof(payload->'schoolLocationId'), 'null') not in ('number', 'null')
    or coalesce(jsonb_typeof(payload->'roomOrStore'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'acquiredOn'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'supplier'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'custodian'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'serialNumber'), 'null') not in ('string', 'null')
    or coalesce(jsonb_typeof(payload->'notes'), 'null') not in ('string', 'null') then
    raise exception using
      errcode = '22023',
      message = 'Review the asset or inventory details.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(payload) as item(key)
    where item.key not in (
      'recordCode',
      'recordType',
      'itemName',
      'category',
      'description',
      'quantity',
      'unitName',
      'unitCost',
      'reorderLevel',
      'condition',
      'status',
      'schoolLocationId',
      'roomOrStore',
      'acquiredOn',
      'supplier',
      'custodian',
      'serialNumber',
      'notes'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'The asset or inventory update contains an unsupported field.';
  end if;

  requested_quantity := (payload->>'quantity')::numeric;
  requested_unit_cost := nullif(payload->>'unitCost', '')::numeric;
  requested_reorder_level := nullif(payload->>'reorderLevel', '')::numeric;
  requested_location_id := (payload->>'schoolLocationId')::bigint;

  if requested_quantity < 0
    or requested_quantity > 9999999999.99
    or requested_quantity <> round(requested_quantity, 2) then
    raise exception using
      errcode = '22023',
      message = 'Quantity must be a non-negative number with up to two decimal places.';
  end if;

  if requested_unit_cost is not null and (
    requested_unit_cost < 0
    or requested_unit_cost > 999999999999.99
    or requested_unit_cost <> round(requested_unit_cost, 2)
  ) then
    raise exception using
      errcode = '22023',
      message = 'Unit cost must be a non-negative amount with up to two decimal places.';
  end if;

  if requested_reorder_level is not null and (
    requested_reorder_level < 0
    or requested_reorder_level > 9999999999.99
    or requested_reorder_level <> round(requested_reorder_level, 2)
  ) then
    raise exception using
      errcode = '22023',
      message = 'Reorder level must be a non-negative number with up to two decimal places.';
  end if;

  if lower(payload->>'recordType') not in ('asset', 'inventory')
    or lower(payload->>'condition') not in ('new', 'good', 'fair', 'poor', 'damaged', 'not_applicable')
    or lower(payload->>'status') not in ('active', 'in_storage', 'under_repair', 'out_of_stock', 'disposed') then
    raise exception using
      errcode = '22023',
      message = 'Choose valid type, condition and status values.';
  end if;

  if lower(payload->>'recordType') = 'asset' and requested_reorder_level is not null then
    raise exception using
      errcode = '22023',
      message = 'Reorder levels apply to inventory records only.';
  end if;

  if requested_location_id is not null and not exists (
    select 1
    from public.school_locations
    where id = requested_location_id and status = 'active'
  ) then
    raise exception using
      errcode = '23503',
      message = 'Choose an active school location.';
  end if;

  if target_record_id is null then
    insert into public.asset_inventory_records (
      record_code,
      record_type,
      item_name,
      category,
      description,
      quantity,
      unit_name,
      unit_cost,
      reorder_level,
      condition,
      status,
      school_location_id,
      room_or_store,
      acquired_on,
      supplier,
      custodian,
      serial_number,
      notes,
      created_by,
      updated_by
    ) values (
      upper(btrim(payload->>'recordCode')),
      lower(payload->>'recordType'),
      btrim(payload->>'itemName'),
      btrim(payload->>'category'),
      nullif(btrim(payload->>'description'), ''),
      requested_quantity,
      btrim(payload->>'unitName'),
      requested_unit_cost,
      requested_reorder_level,
      lower(payload->>'condition'),
      lower(payload->>'status'),
      requested_location_id,
      nullif(btrim(payload->>'roomOrStore'), ''),
      nullif(payload->>'acquiredOn', '')::date,
      nullif(btrim(payload->>'supplier'), ''),
      nullif(btrim(payload->>'custodian'), ''),
      nullif(btrim(payload->>'serialNumber'), ''),
      nullif(btrim(payload->>'notes'), ''),
      actor_id,
      actor_id
    )
    returning id into saved_id;
  else
    perform 1
    from public.asset_inventory_records
    where id = target_record_id
    for update;

    if not found then
      raise exception using
        errcode = '22023',
        message = 'The asset or inventory record is no longer available.';
    end if;

    update public.asset_inventory_records
    set
      record_code = upper(btrim(payload->>'recordCode')),
      record_type = lower(payload->>'recordType'),
      item_name = btrim(payload->>'itemName'),
      category = btrim(payload->>'category'),
      description = nullif(btrim(payload->>'description'), ''),
      quantity = requested_quantity,
      unit_name = btrim(payload->>'unitName'),
      unit_cost = requested_unit_cost,
      reorder_level = requested_reorder_level,
      condition = lower(payload->>'condition'),
      status = lower(payload->>'status'),
      school_location_id = requested_location_id,
      room_or_store = nullif(btrim(payload->>'roomOrStore'), ''),
      acquired_on = nullif(payload->>'acquiredOn', '')::date,
      supplier = nullif(btrim(payload->>'supplier'), ''),
      custodian = nullif(btrim(payload->>'custodian'), ''),
      serial_number = nullif(btrim(payload->>'serialNumber'), ''),
      notes = nullif(btrim(payload->>'notes'), ''),
      updated_by = actor_id
    where id = target_record_id
    returning id into saved_id;
  end if;

  return jsonb_build_object('recordId', saved_id);
end;
$$;

revoke all on function public.save_asset_inventory_record(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_asset_inventory_record(bigint, jsonb)
  to authenticated;

create or replace function public.get_asset_inventory_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not (select private.has_permission('assets.manage')) then
    raise exception using
      errcode = '42501',
      message = 'Asset and inventory management permission is required.';
  end if;

  return (
    select jsonb_build_object(
      'recordCount', count(*),
      'totalQuantity', coalesce(sum(quantity), 0),
      'activeValue', coalesce(sum(quantity * unit_cost) filter (where status <> 'disposed'), 0),
      'attentionCount', count(*) filter (
        where condition in ('poor', 'damaged')
          or status in ('under_repair', 'out_of_stock')
      ),
      'lowStockCount', count(*) filter (
        where record_type = 'inventory'
          and reorder_level is not null
          and quantity <= reorder_level
      )
    )
    from public.asset_inventory_records
  );
end;
$$;

revoke all on function public.get_asset_inventory_summary()
  from public, anon, authenticated;
grant execute on function public.get_asset_inventory_summary()
  to authenticated;

comment on table public.asset_inventory_records is
  'Audited school assets and inventory register retained through repair, stockout and disposal states.';
comment on function public.save_asset_inventory_record(bigint, jsonb) is
  'Creates or updates one allowlisted asset or inventory record for users with assets.manage.';
comment on function public.get_asset_inventory_summary() is
  'Returns bounded aggregate metrics for the asset and inventory register.';

reset lock_timeout;
