import { z } from "zod";

export const assetRecordTypes = ["asset", "inventory"] as const;
export const assetConditions = [
  "new",
  "good",
  "fair",
  "poor",
  "damaged",
  "not_applicable",
] as const;
export const assetStatuses = [
  "active",
  "in_storage",
  "under_repair",
  "out_of_stock",
  "disposed",
] as const;

const optionalIdSchema = z
  .union([
    z.coerce.number().int().positive(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => (value ? Number(value) : null));

const decimalSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,10}(\.\d{1,2})?$/,
    "Enter a non-negative number with up to two decimal places.",
  )
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });

const optionalDecimalSchema = z
  .union([decimalSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

function optionalText(max: number) {
  return z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => value || null);
}

export const assetInventoryInputSchema = z
  .object({
    id: optionalIdSchema,
    recordCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(32)
      .regex(
        /^AST-\d{3,}$/,
        "Record codes are assigned automatically in the AST-001 format.",
      ),
    recordType: z.enum(assetRecordTypes),
    itemName: z.string().trim().min(2, "Enter the item name.").max(160),
    category: z.string().trim().min(2, "Enter a category.").max(80),
    description: optionalText(500),
    quantity: decimalSchema,
    unitName: z.string().trim().min(1, "Enter the unit name.").max(40),
    unitCost: optionalDecimalSchema,
    reorderLevel: optionalDecimalSchema,
    condition: z.enum(assetConditions),
    status: z.enum(assetStatuses),
    schoolLocationId: optionalIdSchema,
    roomOrStore: optionalText(120),
    acquiredOn: z
      .union([z.iso.date(), z.literal(""), z.null(), z.undefined()])
      .transform((value) => value || null),
    supplier: optionalText(160),
    custodian: optionalText(160),
    serialNumber: optionalText(120),
    notes: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (value.recordType === "asset" && value.reorderLevel !== null) {
      context.addIssue({
        code: "custom",
        path: ["reorderLevel"],
        message: "Reorder level applies to inventory records only.",
      });
    }
  });

export const assetInventoryListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  type: z.enum(["all", ...assetRecordTypes]).catch("all"),
  status: z.enum(["all", ...assetStatuses]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
  edit: optionalIdSchema.catch(null),
});

export const assetInventorySummarySchema = z.object({
  recordCount: z.coerce.number().int().nonnegative(),
  totalQuantity: z.coerce.number().nonnegative(),
  activeValue: z.coerce.number().nonnegative(),
  attentionCount: z.coerce.number().int().nonnegative(),
  lowStockCount: z.coerce.number().int().nonnegative(),
  nextRecordCode: z.string().regex(/^AST-\d{3,}$/),
});

export type AssetInventoryInput = z.infer<typeof assetInventoryInputSchema>;
export type AssetInventoryFormValues = z.input<
  typeof assetInventoryInputSchema
>;
export type AssetInventoryListQuery = z.infer<
  typeof assetInventoryListQuerySchema
>;
