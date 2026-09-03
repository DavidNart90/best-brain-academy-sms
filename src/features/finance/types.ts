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
  subtotal: string;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancellationReason: string | null;
  createdByName: string;
  createdAt: string;
  lines: InvoiceLineRow[];
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
