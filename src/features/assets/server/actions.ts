"use server";

import { revalidatePath } from "next/cache";
import { requireRateLimitedPermission } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { assetInventoryInputSchema } from "../schemas";

export type AssetInventoryActionResult = {
  ok: boolean;
  message: string;
  recordId?: number;
};

function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return "That asset or inventory code already exists.";
  if (error.code === "23503")
    return error.message ?? "Choose an active school location.";
  if (["22023", "22P02", "23514"].includes(error.code ?? ""))
    return error.message ?? "Review the record details and try again.";
  if (error.code === "42501")
    return "Your account cannot manage assets and inventory.";
  return "The record could not be saved. Review the details and try again.";
}

export async function saveAssetInventoryRecord(
  input: unknown,
): Promise<AssetInventoryActionResult> {
  const access = await requireRateLimitedPermission(
    "assets.manage",
    "finance-write",
  );
  if (!access.ok) return { ok: false, message: access.message };

  const parsed = assetInventoryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Review the asset or inventory details.",
    };

  const value = parsed.data;
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("save_asset_inventory_record", {
    // Postgres accepts NULL here to select the create branch, while generated
    // RPC argument types cannot express nullable function parameters.
    target_record_id: value.id ?? (null as never),
    payload: {
      recordCode: value.recordCode,
      recordType: value.recordType,
      itemName: value.itemName,
      category: value.category,
      description: value.description,
      quantity: value.quantity,
      unitName: value.unitName,
      unitCost: value.unitCost,
      reorderLevel: value.reorderLevel,
      condition: value.condition,
      status: value.status,
      schoolLocationId: value.schoolLocationId,
      roomOrStore: value.roomOrStore,
      acquiredOn: value.acquiredOn,
      supplier: value.supplier,
      custodian: value.custodian,
      serialNumber: value.serialNumber,
      notes: value.notes,
    },
  });

  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };

  const data = result.data as Json;
  const recordId =
    data && typeof data === "object" && !Array.isArray(data)
      ? Number(data.recordId)
      : NaN;
  if (!Number.isSafeInteger(recordId) || recordId <= 0)
    return { ok: false, message: "The saved record could not be confirmed." };

  revalidatePath("/financials/assets");
  return {
    ok: true,
    message: value.id ? "Record updated." : "Record added to the register.",
    recordId,
  };
}
