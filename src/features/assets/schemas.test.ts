import { describe, expect, it } from "vitest";
import { assetInventoryInputSchema } from "./schemas";

const validRecord = {
  id: "",
  recordCode: "ast-001",
  recordType: "asset",
  itemName: "Classroom projector",
  category: "ICT equipment",
  description: "",
  quantity: "1",
  unitName: "unit",
  unitCost: "4200.5",
  reorderLevel: "",
  condition: "good",
  status: "active",
  schoolLocationId: "",
  roomOrStore: "ICT laboratory",
  acquiredOn: "2026-09-01",
  supplier: "School supplier",
  custodian: "ICT department",
  serialNumber: "SYN-001",
  notes: "",
};

describe("asset and inventory validation", () => {
  it("normalizes codes, decimals and optional fields", () => {
    expect(assetInventoryInputSchema.parse(validRecord)).toMatchObject({
      id: null,
      recordCode: "AST-001",
      quantity: "1.00",
      unitCost: "4200.50",
      description: null,
      schoolLocationId: null,
      notes: null,
    });
  });

  it("supports decimal inventory quantities and a reorder level", () => {
    const result = assetInventoryInputSchema.parse({
      ...validRecord,
      recordCode: "AST-002",
      recordType: "inventory",
      quantity: "25.5",
      unitName: "ream",
      reorderLevel: "10",
      condition: "not_applicable",
    });
    expect(result.quantity).toBe("25.50");
    expect(result.reorderLevel).toBe("10.00");
  });

  it("rejects invalid precision and asset-only reorder mistakes", () => {
    expect(
      assetInventoryInputSchema.safeParse({
        ...validRecord,
        quantity: "1.001",
      }).success,
    ).toBe(false);
    expect(
      assetInventoryInputSchema.safeParse({
        ...validRecord,
        reorderLevel: "2",
      }).success,
    ).toBe(false);
  });

  it("rejects manually structured codes and unsupported lifecycle values", () => {
    expect(
      assetInventoryInputSchema.safeParse({
        ...validRecord,
        recordCode: "INV-STAT-001",
      }).success,
    ).toBe(false);
    expect(
      assetInventoryInputSchema.safeParse({
        ...validRecord,
        status: "deleted",
      }).success,
    ).toBe(false);
  });
});
