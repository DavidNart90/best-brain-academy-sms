-- Assign immutable AST-001-style register codes in the database. The preview
-- exposed to the form is advisory; the insert trigger serializes allocation.
set lock_timeout = '5s';

create or replace function private.next_asset_inventory_record_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'AST-' || pg_catalog.lpad(
    (
      coalesce(
        pg_catalog.max(
          pg_catalog.substring(record_code, '^AST-([0-9]+)$')::bigint
        ),
        0
      ) + 1
    )::text,
    3,
    '0'
  )
  from public.asset_inventory_records
  where record_code ~ '^AST-[0-9]+$';
$$;

revoke all on function private.next_asset_inventory_record_code()
  from public, anon, authenticated;

create or replace function private.guard_asset_inventory_record_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('asset_inventory_record_code', 0)
    );
    new.record_code := private.next_asset_inventory_record_code();
  elsif new.record_code is distinct from old.record_code then
    raise exception using
      errcode = '22023',
      message = 'Asset and inventory record codes are assigned automatically and cannot be changed.';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_asset_inventory_record_code()
  from public, anon, authenticated;

drop trigger if exists asset_inventory_record_code_guard
  on public.asset_inventory_records;

create trigger asset_inventory_record_code_guard
before insert or update of record_code on public.asset_inventory_records
for each row execute function private.guard_asset_inventory_record_code();

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
      ),
      'nextRecordCode', private.next_asset_inventory_record_code()
    )
    from public.asset_inventory_records
  );
end;
$$;

revoke all on function public.get_asset_inventory_summary()
  from public, anon, authenticated;
grant execute on function public.get_asset_inventory_summary()
  to authenticated;

comment on function private.next_asset_inventory_record_code() is
  'Returns the next AST-001-style preview code from retained register records.';
comment on function private.guard_asset_inventory_record_code() is
  'Serializes generated asset register codes and prevents later code changes.';
comment on function public.get_asset_inventory_summary() is
  'Returns bounded register metrics plus the next advisory AST record code.';

reset lock_timeout;
