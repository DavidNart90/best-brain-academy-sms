import { z } from "zod";

const idSchema = z.coerce.number().int().positive();
const optionalIdSchema = z
  .union([
    z.coerce.number().int().positive(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => (value ? Number(value) : null));
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9_]{2,20}$/,
    "Use 2-20 uppercase letters, digits or underscores.",
  );
const statusSchema = z.enum(["active", "archived"]);
const sortOrderSchema = z.coerce.number().int().min(1).max(999);

export const moneyAmountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount, e.g. 120.00")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  })
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");

export const baseClassFeeRowSchema = z.object({
  classId: idSchema,
  rateId: optionalIdSchema,
  amount: moneyAmountSchema,
});
export const baseClassFeesInputSchema = z.object({
  academicYearId: idSchema,
  academicTermId: idSchema,
  rows: z.array(baseClassFeeRowSchema).min(1).max(50),
});

export const transportChargeRowSchema = z.object({
  schoolLocationId: idSchema,
  rateId: optionalIdSchema,
  amount: moneyAmountSchema,
});
export const transportChargesInputSchema = z.object({
  academicYearId: idSchema,
  academicTermId: idSchema,
  rows: z.array(transportChargeRowSchema).min(1).max(50),
});

export const flatFeesInputSchema = z.object({
  academicYearId: idSchema,
  academicTermId: idSchema,
  feedingRateId: optionalIdSchema,
  feedingAmount: moneyAmountSchema,
  admissionRateId: optionalIdSchema,
  admissionAmount: moneyAmountSchema,
});

export const paymentMethodInputSchema = z.object({
  id: optionalIdSchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(60),
  requiresReference: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) =>
      typeof value === "boolean" ? value : value === "true",
    ),
  sortOrder: sortOrderSchema,
  status: statusSchema,
});

export const financeCategoryInputSchema = z.object({
  id: optionalIdSchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(80),
  sortOrder: sortOrderSchema,
  status: statusSchema,
});

export type BaseClassFeesInput = z.infer<typeof baseClassFeesInputSchema>;
export type BaseClassFeesFormValues = z.input<typeof baseClassFeesInputSchema>;
export type TransportChargesInput = z.infer<typeof transportChargesInputSchema>;
export type TransportChargesFormValues = z.input<
  typeof transportChargesInputSchema
>;
export type FlatFeesInput = z.infer<typeof flatFeesInputSchema>;
export type FlatFeesFormValues = z.input<typeof flatFeesInputSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;
export type PaymentMethodFormValues = z.input<typeof paymentMethodInputSchema>;
export type FinanceCategoryInput = z.infer<typeof financeCategoryInputSchema>;
export type FinanceCategoryFormValues = z.input<
  typeof financeCategoryInputSchema
>;

export const invoiceStatuses = [
  "unpaid",
  "partially_paid",
  "paid",
  "cancelled",
] as const;
export const invoiceListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", ...invoiceStatuses]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export const invoiceIdSchema = z.coerce.number().int().positive();
export const generateInvoicesInputSchema = z.object({
  studentId: optionalIdSchema,
});
export const cancelInvoiceInputSchema = z.object({
  invoiceId: idSchema,
  reason: z
    .string()
    .trim()
    .min(2, "A cancellation reason is required.")
    .max(500),
});
export const reverseFinanceInputSchema = z.object({
  requestKey: z.string().uuid(),
  requestFingerprint: z.string().trim().min(1).max(500),
  recordId: idSchema,
  reason: z.string().trim().min(2, "A reversal reason is required.").max(500),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type GenerateInvoicesInput = z.infer<typeof generateInvoicesInputSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceInputSchema>;
export type ReverseFinanceInput = z.infer<typeof reverseFinanceInputSchema>;

const transactionBaseSchema = z.object({
  requestKey: z.string().uuid(),
  requestFingerprint: z.string().trim().min(1).max(500),
  amount: moneyAmountSchema,
  businessDate: z.string().date(),
  paymentMethodId: idSchema,
  externalReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});
export const schoolFeePaymentInputSchema = transactionBaseSchema.extend({
  invoiceId: idSchema,
});
export const studentReceiptInputSchema = transactionBaseSchema.extend({
  studentId: idSchema,
});
export const miscReceiptInputSchema = transactionBaseSchema.extend({
  categoryId: idSchema,
  description: z.string().trim().min(2).max(500),
  payerName: z.string().trim().max(160).optional(),
  studentId: optionalIdSchema,
});
export const expenseInputSchema = transactionBaseSchema.extend({
  categoryId: idSchema,
  description: z.string().trim().min(2).max(500),
  attachmentPath: z.string().trim().max(300).optional(),
});
export type SchoolFeePaymentInput = z.infer<typeof schoolFeePaymentInputSchema>;
export type StudentReceiptInput = z.infer<typeof studentReceiptInputSchema>;
export type MiscReceiptInput = z.infer<typeof miscReceiptInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
