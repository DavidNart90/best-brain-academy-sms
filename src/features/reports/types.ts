export const reportViews = [
  "financial-summary",
  "collections",
  "outstanding",
  "invoices",
  "payments",
  "expenses",
  "salary-deductions",
  "student-statement",
  "students",
  "admissions",
  "students-by-class",
  "staff",
  "classes",
] as const;

export type ReportView = (typeof reportViews)[number];

export const financialPeriods = [
  "weekly",
  "monthly",
  "term",
  "academic-cycle",
] as const;

export type FinancialPeriod = (typeof financialPeriods)[number];

export type ReportFilters = {
  view: ReportView;
  period: FinancialPeriod;
  start: string;
  end: string;
  academicYearId?: number;
  academicTermId?: number;
  classId?: number;
  studentId?: number;
  staffId?: number;
  paymentMethodId?: number;
  expenseCategoryId?: number;
  status: "active" | "reversed" | "all";
  page: number;
};

export type ReportAccess = {
  financials: boolean;
  students: boolean;
  admissions: boolean;
  staff: boolean;
  classes: boolean;
};

export type ReportingPeriod = {
  academicYears: Array<{
    id: number;
    name: string;
    startsOn: string;
    endsOn: string;
    isCurrent: boolean;
  }>;
  academicTerms: Array<{
    id: number;
    academicYearId: number;
    name: string;
    startsOn: string;
    endsOn: string;
    isCurrent: boolean;
  }>;
  classes: Array<{ id: number; name: string }>;
  students: Array<{ id: number; name: string; admissionNumber: string }>;
  staff: Array<{ id: number; name: string; staffNumber: string }>;
  paymentMethods: Array<{ id: number; name: string }>;
  expenseCategories: Array<{ id: number; name: string }>;
};

export type FinancialSummary = {
  expectedFees: string;
  schoolFeesCollected: string;
  outstandingFees: string;
  feedingCollected: string;
  admissionCollected: string;
  miscellaneousCollected: string;
  grossReceipts: string;
  otherExpenses: string;
  salaryPayments: string;
  ssnitRemittances: string;
  totalExpenses: string;
  operatingNet: string;
  salaryDeductions: string;
  ssnitWithheld: string;
  ssnitRemittedToDate: string;
  ssnitOutstanding: string;
  finalPosition: string;
  receiptCount: number;
  expenseCount: number;
  deductionCount: number;
  reversalCount: number;
};

export type ReportIdentity = {
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolMotto: string | null;
  schoolLogoPath: string | null;
};

export type FinancialTrendPoint = {
  periodStart: string;
  grossReceipts: number;
  expenses: number;
  salaryDeductions: number;
  operatingNet: number;
  finalPosition: number;
};

export type FinancialBreakdown = {
  label: string;
  count: number;
  amount: string;
};

export type RecentCollection = {
  source: string;
  reference: string;
  businessDate: string;
  amount: string;
  personName: string;
  className: string | null;
  paymentMethod: string;
};

export type FinancialSnapshot = {
  period: {
    start: string;
    end: string;
    academicYearId: number | null;
    academicTermId: number | null;
  };
  summary: FinancialSummary;
  daily: FinancialTrendPoint[];
  monthly: FinancialTrendPoint[];
  incomeBreakdown: FinancialBreakdown[];
  expenseBreakdown: FinancialBreakdown[];
  deductionBreakdown: FinancialBreakdown[];
  classCollections: FinancialBreakdown[];
  reversals: FinancialBreakdown[];
  recentCollections: RecentCollection[];
};

export type FinancialPeriodRow = {
  label: string;
  start: string;
  end: string;
  revenue: string;
  expenses: string;
  net: string;
};

export type FinancialPeriodSummary = {
  title: string;
  description: string;
  rows: FinancialPeriodRow[];
  total: {
    revenue: string;
    expenses: string;
    net: string;
  };
};

export type FinancialActivityRow = {
  id: number;
  kind: "income" | "expense" | "deduction";
  source: string;
  reference: string;
  documentReference: string | null;
  personName: string | null;
  category: string;
  className: string | null;
  amount: string;
  businessDate: string;
  status: string;
  paymentMethod: string | null;
  reversalReference: string | null;
  reversalReason: string | null;
};

export type ReportTable = {
  title: string;
  description: string;
  columns: Array<{
    key: string;
    label: string;
    align?: "left" | "right";
  }>;
  rows: Array<Record<string, string | number | null>>;
  total: number;
  page: number;
  pageSize: number;
};
