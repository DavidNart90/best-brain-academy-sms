import { z } from "zod";

const money = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value > 0, {
    message: "Enter a positive amount.",
  })
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
    message: "Use no more than two decimal places.",
  });

export const libraryRateSchema = z
  .object({
    academicTermId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive(),
    chargeStatus: z.enum(["chargeable", "not_charged"]),
    amount: z.union([z.string(), z.number(), z.null(), z.undefined()]),
  })
  .transform((value, context) => {
    if (value.chargeStatus === "not_charged") return { ...value, amount: null };
    const parsed = money.safeParse(value.amount);
    if (!parsed.success) {
      context.addIssue({
        code: "custom",
        message: parsed.error.issues[0]?.message ?? "Enter an amount.",
        path: ["amount"],
      });
      return z.NEVER;
    }
    return { ...value, amount: parsed.data };
  });

export const libraryGenerateSchema = z.object({
  academicTermId: z.coerce.number().int().positive(),
  studentId: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) =>
      value === "" || value == null ? null : Number(value),
    )
    .refine(
      (value) => value === null || (Number.isInteger(value) && value > 0),
      {
        message: "Choose a valid student.",
      },
    ),
});

export const libraryCollectionSchema = z.object({
  requestKey: z.uuid(),
  chargeId: z.coerce.number().int().positive(),
  amount: money,
  businessDate: z.iso.date(),
  paymentMethodId: z.coerce.number().int().positive(),
  externalReference: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() || null)
    .pipe(z.string().max(120).nullable()),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() || null)
    .pipe(z.string().min(2).max(500).nullable()),
});

export const libraryReversalSchema = z.object({
  requestKey: z.uuid(),
  collectionId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(500),
});
