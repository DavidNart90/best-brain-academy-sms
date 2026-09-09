import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc, permission } = vi.hoisted(() => ({
  rpc: vi.fn(),
  permission: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/access", () => ({ requirePermission: permission }));
vi.mock("@/lib/security/rate-limit", () => ({
  requireRateLimitedPermission: async (permissionName: string) => {
    const context = await permission(permissionName);
    return context
      ? { ok: true, context }
      : { ok: false, message: "Permission denied." };
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));
import { recordFinanceAction, reverseFinanceAction } from "./actions";

const input = {
  requestKey: "03f0b4c3-8621-41af-b7e1-358e323b79a9",
  requestFingerprint: "synthetic",
  amount: "100.01",
  businessDate: "2026-09-08",
  paymentMethodId: "1",
  externalReference: "",
  notes: "",
};
describe("finance action contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permission.mockResolvedValue({ userId: "synthetic" });
    rpc.mockResolvedValue({ data: {}, error: null });
  });
  it.each(["feeding_receipt", "admission_receipt"] as const)(
    "posts %s without a student reference",
    async (operation) => {
      expect((await recordFinanceAction(operation, input)).ok).toBe(true);
      expect(rpc).toHaveBeenCalledWith(
        "record_daily_collection",
        expect.objectContaining({
          receipt_amount: 100.01,
          collection_type: operation,
        }),
      );
      expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("target_student_id");
    },
  );
  it("posts an income name without requiring a configured category", async () => {
    expect(
      (
        await recordFinanceAction("misc_receipt", {
          ...input,
          description: "Synthetic income",
          payerName: "",
          studentId: null,
        })
      ).ok,
    ).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "record_named_misc_receipt",
      expect.objectContaining({ income_name: "Synthetic income" }),
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty(
      "target_misc_income_category_id",
    );
  });
  it("rejects nonpositive payments and missing permission before calling the database", async () => {
    expect(
      (
        await recordFinanceAction("school_fee_payment", {
          ...input,
          invoiceId: 1,
          amount: "0",
        })
      ).ok,
    ).toBe(false);
    permission.mockResolvedValue(null);
    expect((await recordFinanceAction("feeding_receipt", input)).ok).toBe(
      false,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["reverse_school_fee_payment", "target_payment_id"],
    ["reverse_feeding_receipt", "target_receipt_id"],
    ["reverse_admission_receipt", "target_receipt_id"],
    ["reverse_misc_receipt", "target_receipt_id"],
    ["void_expense", "target_expense_id"],
  ] as const)(
    "sends only the accepted identifier for %s",
    async (operation, idKey) => {
      await reverseFinanceAction(operation, {
        requestKey: input.requestKey,
        requestFingerprint: "x",
        recordId: 9,
        reason: "Synthetic correction",
      });
      expect(rpc).toHaveBeenCalledWith(operation, {
        request_key: input.requestKey,
        request_fingerprint: "x",
        target_reason: "Synthetic correction",
        [idKey]: 9,
      });
    },
  );
});
