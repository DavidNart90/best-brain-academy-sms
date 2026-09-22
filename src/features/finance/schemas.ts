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

const normalizedMoneyAmountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter a valid amount, e.g. 120.00")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });

export const moneyAmountSchema = normalizedMoneyAmountSchema.refine(
  (value) => Number(value) > 0,
  "Amount must be greater than zero.",
);

const transportAmountSchema = normalizedMoneyAmountSchema;

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
  amount: transportAmountSchema,
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
  name: z.string().trim().min(2, "Enter a payment method name.").max(60),
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
  name: z.string().trim().min(2, "Enter a category name.").max(80),
  sortOrder: sortOrderSchema,
  status: statusSchema,
});

export const financeConfigurationKinds = [
  "payment_method",
  "expense_category",
  "misc_income_category",
  "salary_deduction_type",
] as const;

export const deleteFinanceConfigurationSchema = z.object({
  kind: z.enum(financeConfigurationKinds),
  id: idSchema,
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
export type DeleteFinanceConfigurationInput = z.infer<
  typeof deleteFinanceConfigurationSchema
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
export const endTermInvoiceQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  classId: optionalIdSchema,
  page: z.coerce.number().int().min(1).catch(1),
});
export const endTermInvoiceConfigurationSchema = z.object({
  sourceTermId: idSchema,
  parentNotes: z.string().trim().max(2000),
});
export const generateEndTermInvoicesSchema = z.object({
  sourceTermId: idSchema,
  classId: optionalIdSchema,
  afterStudentId: optionalIdSchema,
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
export type EndTermInvoiceQuery = z.infer<typeof endTermInvoiceQuerySchema>;
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
export const dailyCollectionInputSchema = transactionBaseSchema;
export const miscReceiptInputSchema = transactionBaseSchema.extend({
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
export type DailyCollectionInput = z.infer<typeof dailyCollectionInputSchema>;
export type MiscReceiptInput = z.infer<typeof miscReceiptInputSchema>;
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

const deductionValueSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,4})?$/, "Enter a valid deduction value.")
  .refine((value) => Number(value) > 0, "Value must be greater than zero.");

export const deductionTypeInputSchema = z
  .object({
    id: optionalIdSchema,
    code: codeSchema,
    name: z.string().trim().min(2).max(80),
    calculationType: z.enum(["percentage", "fixed"]),
    defaultValue: z.string().trim().max(17).optional(),
    autoApply: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((value) =>
        typeof value === "boolean" ? value : value === "true",
      ),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.union([z.iso.date(), z.literal("")]).optional(),
    notes: z.string().trim().max(500).optional(),
    sortOrder: sortOrderSchema,
    status: statusSchema,
  })
  .superRefine((value, context) => {
    if (value.autoApply && !value.defaultValue) {
      context.addIssue({
        code: "custom",
        path: ["defaultValue"],
        message: "Automatic deductions need a default value.",
      });
    }
    if (value.defaultValue) {
      const parsed = deductionValueSchema.safeParse(value.defaultValue);
      if (!parsed.success) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: parsed.error.issues[0]?.message ?? "Enter a valid value.",
        });
      } else if (
        value.calculationType === "percentage" &&
        Number(value.defaultValue) > 100
      ) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "A percentage cannot exceed 100.",
        });
      } else if (
        value.calculationType === "fixed" &&
        !/^\d{1,12}(\.\d{1,2})?$/.test(value.defaultValue)
      ) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "A fixed amount can have no more than two decimal places.",
        });
      }
    }
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "The end date cannot be before the start date.",
      });
    }
  });

export const salaryRecordInputSchema = z.object({
  requestKey: z.uuid(),
  staffId: idSchema,
  payrollMonth: z
    .string()
    .regex(/^\d{4}-\d{2}(-01)?$/, "Choose a salary month.")
    .transform((value) => (value.length === 7 ? `${value}-01` : value)),
});
const salaryMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}(-01)?$/, "Choose a valid month.")
  .transform((value) => (value.length === 7 ? `${value}-01` : value));
export const salaryConfigurationInputSchema = z.object({
  requestKey: z.uuid(),
  staffId: idSchema,
  grossSalary: moneyAmountSchema,
  effectiveFrom: salaryMonthSchema,
  notes: z.string().trim().max(500).optional(),
});
export const salaryConfigurationEndInputSchema = z.object({
  requestKey: z.uuid(),
  configurationId: idSchema,
  effectiveTo: salaryMonthSchema,
  reason: z.string().trim().min(2, "A reason is required.").max(500),
});
export const salaryBatchPostInputSchema = z.object({
  requestKey: z.uuid(),
  payrollMonth: salaryMonthSchema,
});
export const salaryBatchDispatchInputSchema = z.object({
  requestKey: z.uuid(),
  payrollMonth: salaryMonthSchema,
  businessDate: z.string().date(),
  paymentMethodId: idSchema,
  externalReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});
export const salaryDeductionInputSchema = z.object({
  requestKey: z.uuid(),
  salaryRecordId: idSchema,
  deductionTypeId: idSchema,
  configuredValue: deductionValueSchema,
  reason: z.string().trim().max(500).optional(),
});
export const salaryReversalInputSchema = z.object({
  requestKey: z.uuid(),
  recordId: idSchema,
  reason: z.string().trim().min(2, "A reversal reason is required.").max(500),
});
export const salaryCashInputSchema = transactionBaseSchema.extend({
  salaryRecordId: idSchema,
  kind: z.enum(["salary_payment", "ssnit_remittance"]),
});
export const salaryCashReversalInputSchema = z.object({
  requestKey: z.uuid(),
  salaryRecordId: idSchema,
  expenseId: idSchema,
  reason: z.string().trim().min(2, "A reversal reason is required.").max(500),
});
export const salaryListQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}(-01)?$/)
    .transform((value) => (value.length === 7 ? `${value}-01` : value))
    .catch(""),
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", "active", "reversed"]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export type DeductionTypeInput = z.infer<typeof deductionTypeInputSchema>;
export type DeductionTypeFormValues = z.input<typeof deductionTypeInputSchema>;
export type SalaryRecordInput = z.infer<typeof salaryRecordInputSchema>;
export type SalaryConfigurationInput = z.infer<
  typeof salaryConfigurationInputSchema
>;
export type SalaryConfigurationEndInput = z.infer<
  typeof salaryConfigurationEndInputSchema
>;
export type SalaryBatchPostInput = z.infer<typeof salaryBatchPostInputSchema>;
export type SalaryBatchDispatchInput = z.infer<
  typeof salaryBatchDispatchInputSchema
>;
export type SalaryDeductionInput = z.infer<typeof salaryDeductionInputSchema>;
export type SalaryReversalInput = z.infer<typeof salaryReversalInputSchema>;
export type SalaryCashInput = z.infer<typeof salaryCashInputSchema>;
export type SalaryCashReversalInput = z.infer<
  typeof salaryCashReversalInputSchema
>;
