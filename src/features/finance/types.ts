export type FeeComponentScope = "class" | "location" | "flat";

export type FeeComponent = {
  id: number;
  code: string;
  name: string;
  scope: FeeComponentScope;
  isRequired: boolean;
  sortOrder: number;
  status: "active" | "archived";
};

export type FeeComponentRate = {
  id: number;
  feeComponentId: number;
  academicYearId: number;
  academicTermId: number;
  classId: number | null;
  schoolLocationId: number | null;
  amount: string;
  status: "active" | "archived";
};

export type BaseClassFeeRow = {
  classId: number;
  className: string;
  rateId: number | null;
  amount: string | null;
};

export type TransportChargeRow = {
  schoolLocationId: number;
  locationName: string;
  rateId: number | null;
  amount: string | null;
};

export type FlatFeeRow = {
  code: "feeding_fee" | "admission_fee";
  name: string;
  rateId: number | null;
  amount: string | null;
};

export type FinanceCategory = {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  status: "active" | "archived";
};

export type PaymentMethod = FinanceCategory & {
  requiresReference: boolean;
};

export type FinanceSettings = {
  academicYearId: number;
  academicYearName: string;
  academicTermId: number;
  academicTermName: string;
  baseClassFees: BaseClassFeeRow[];
  transportCharges: TransportChargeRow[];
  flatFees: FlatFeeRow[];
  paymentMethods: PaymentMethod[];
  expenseCategories: FinanceCategory[];
  miscIncomeCategories: FinanceCategory[];
};

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "cancelled";

export type InvoiceListRow = {
  id: number;
  invoiceNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  locationName: string;
  academicYearName: string;
  academicTermName: string;
  total: string;
  amountPaid: string;
  outstanding: string;
  status: InvoiceStatus;
  issuedOn: string;
};

export type InvoiceLineRow = {
  id: number;
  description: string;
  amount: string;
  sortOrder: number;
};

export type InvoiceDetail = InvoiceListRow & {
  studentId: number;
  academicTermId: number;
  subtotal: string;
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolMotto: string | null;
  schoolLogoPath: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancellationNumber: string | null;
  cancellationReason: string | null;
  createdByName: string;
  createdAt: string;
  lines: InvoiceLineRow[];
  libraryBalance:
    import("@/features/library/types").InvoiceLibraryBalance | null;
};

export type GenerateInvoicesResult = {
  createdCount: number;
  created: Array<{
    studentId: number;
    invoiceId: number;
    invoiceNumber: string;
  }>;
  skipped: Array<{ studentId: number; reason: string }>;
};
export type OpenInvoiceOption = {
  id: number;
  invoiceNumber: string;
  studentName: string;
  outstanding: string;
};

export type DeductionType = {
  id: number;
  code: string;
  name: string;
  calculationType: "percentage" | "fixed";
  defaultValue: string | null;
  autoApply: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  sortOrder: number;
  status: "active" | "archived";
};

export type SalaryStaffOption = {
  id: number;
  staffNumber: string;
  name: string;
  position: string;
  grossSalary: string;
};

export type SalaryConfiguration = {
  id: number;
  staffId: number;
  staffNumber: string;
  staffName: string;
  position: string;
  grossSalary: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "active" | "ended";
  notes: string | null;
  endReason: string | null;
};

export type SalaryConfigurationStaffOption = {
  id: number;
  staffNumber: string;
  name: string;
  position: string;
};

export type SalaryListRow = {
  id: number;
  salaryNumber: string;
  staffId: number;
  staffNumber: string;
  staffName: string;
  position: string;
  payrollMonth: string;
  grossSalary: string;
  totalDeductions: string;
  netSalary: string;
  status: "active" | "reversed";
  reversalNumber: string | null;
};

export type SalaryDeductionRow = {
  id: number;
  deductionNumber: string;
  deductionTypeId: number;
  deductionTypeName: string;
  calculationType: "percentage" | "fixed";
  configuredValue: string;
  grossSalary: string;
  amount: string;
  reason: string | null;
  status: "active" | "reversed";
  reversalNumber: string | null;
  reversalReason: string | null;
};

export type SalaryPaymentStatus = "unpaid" | "partial" | "paid" | "reversed";

export type SsnitRemittanceStatus =
  "not_due" | "due" | "partial" | "remitted" | "reversed";

export type SalaryCashPosition = {
  netSalary: string;
  salaryPaid: string;
  salaryOutstanding: string;
  salaryPaymentStatus: SalaryPaymentStatus;
  ssnitDue: string;
  ssnitRemitted: string;
  ssnitOutstanding: string;
  ssnitStatus: SsnitRemittanceStatus;
};

export type SalaryCashEntry = {
  id: number;
  expenseNumber: string;
  kind: "salary_payment" | "ssnit_remittance";
  amount: string;
  businessDate: string;
  paymentMethod: string;
  externalReference: string | null;
  notes: string | null;
  status: "active" | "reversed";
  reversalNumber: string | null;
  reversalReason: string | null;
  salaryDeductionId: number | null;
};

export type SalaryPaymentMethod = {
  id: number;
  name: string;
  requiresReference: boolean;
};

export type SalaryDetail = SalaryListRow & {
  recordedBy: string;
  createdAt: string;
  reversalReason: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  deductions: SalaryDeductionRow[];
  cashPosition: SalaryCashPosition;
  cashEntries: SalaryCashEntry[];
};
