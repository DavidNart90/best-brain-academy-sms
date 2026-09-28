import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import {
  assetInventoryListQuerySchema,
  assetInventorySummarySchema,
} from "../schemas";
import type { AssetInventoryPage, AssetInventoryRecord } from "../types";

const pageSize = 25;
const loadError =
  "The asset and inventory register could not be loaded. Try again or contact an administrator.";

type AssetRow =
  Database["public"]["Tables"]["asset_inventory_records"]["Row"] & {
    school_locations: { name: string } | null;
  };

function safeSearch(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function decimal(value: number) {
  return value.toFixed(2);
}

function mapRecord(row: AssetRow): AssetInventoryRecord {
  return {
    id: row.id,
    recordCode: row.record_code,
    recordType: row.record_type as AssetInventoryRecord["recordType"],
    itemName: row.item_name,
    category: row.category,
    description: row.description,
    quantity: decimal(row.quantity),
    unitName: row.unit_name,
    unitCost: row.unit_cost === null ? null : decimal(row.unit_cost),
    reorderLevel:
      row.reorder_level === null ? null : decimal(row.reorder_level),
    condition: row.condition as AssetInventoryRecord["condition"],
    status: row.status as AssetInventoryRecord["status"],
    schoolLocationId: row.school_location_id,
    schoolLocationName: row.school_locations?.name ?? null,
    roomOrStore: row.room_or_store,
    acquiredOn: row.acquired_on,
    supplier: row.supplier,
    custodian: row.custodian,
    serialNumber: row.serial_number,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function getAssetInventoryPage(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<AssetInventoryPage> {
  const parsed = assetInventoryListQuerySchema.parse({
    q: Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q,
    type: Array.isArray(searchParams.type)
      ? searchParams.type[0]
      : searchParams.type,
    status: Array.isArray(searchParams.status)
      ? searchParams.status[0]
      : searchParams.status,
    page: Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page,
    edit: Array.isArray(searchParams.edit)
      ? searchParams.edit[0]
      : searchParams.edit,
  });
  const q = safeSearch(parsed.q);
  const query = { ...parsed, q };
  const supabase = await createServerSupabaseClient();
  const start = (query.page - 1) * pageSize;
  const end = start + pageSize - 1;

  let listQuery = supabase
    .from("asset_inventory_records")
    .select(
      "id,record_code,record_type,item_name,category,description,quantity,unit_name,unit_cost,reorder_level,condition,status,school_location_id,room_or_store,acquired_on,supplier,custodian,serial_number,notes,updated_at,school_locations(name)",
      { count: "exact" },
    );
  if (q) {
    const pattern = `%${q}%`;
    listQuery = listQuery.or(
      `record_code.ilike.${pattern},item_name.ilike.${pattern},category.ilike.${pattern},serial_number.ilike.${pattern},custodian.ilike.${pattern}`,
    );
  }
  if (query.type !== "all") listQuery = listQuery.eq("record_type", query.type);
  if (query.status !== "all") listQuery = listQuery.eq("status", query.status);

  const editQuery = query.edit
    ? supabase
        .from("asset_inventory_records")
        .select(
          "id,record_code,record_type,item_name,category,description,quantity,unit_name,unit_cost,reorder_level,condition,status,school_location_id,room_or_store,acquired_on,supplier,custodian,serial_number,notes,updated_at,school_locations(name)",
        )
        .eq("id", query.edit)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [list, summary, locations, edit] = await Promise.all([
    listQuery
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end),
    supabase.rpc("get_asset_inventory_summary"),
    supabase
      .from("school_locations")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
    editQuery,
  ]);

  if (list.error || summary.error || locations.error || edit.error)
    throw new Error(loadError);

  const parsedSummary = assetInventorySummarySchema.safeParse(
    summary.data as Json,
  );
  if (!parsedSummary.success) throw new Error(loadError);

  return {
    rows: ((list.data ?? []) as AssetRow[]).map(mapRecord),
    total: list.count ?? 0,
    page: query.page,
    pageSize,
    query,
    summary: parsedSummary.data,
    locations: locations.data,
    editRecord: edit.data ? mapRecord(edit.data as AssetRow) : null,
  };
}
