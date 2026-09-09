import { z } from "zod";
import { financialPeriods, reportViews } from "./types";

const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const reportQuerySchema = z.object({
  view: z.enum(reportViews).catch("financial-summary"),
  period: z.enum(financialPeriods).catch("term"),
  start: dateValue,
  end: dateValue,
  academicYearId: optionalId,
  academicTermId: optionalId,
  classId: optionalId,
  studentId: optionalId,
  staffId: optionalId,
  paymentMethodId: optionalId,
  expenseCategoryId: optionalId,
  status: z.enum(["active", "reversed", "all"]).catch("active"),
  page: z.coerce.number().int().min(1).max(400).catch(1),
});
