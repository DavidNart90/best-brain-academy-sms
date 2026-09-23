import type { OutstandingInvoiceRow } from "@/features/finance/types";
import type {
  FinancialSnapshot,
  ReportFilters,
  ReportingPeriod,
  ReportTable,
} from "@/features/reports/types";

export type FinancialDashboardData = {
  snapshot: FinancialSnapshot;
  outstanding: ReportTable | null;
  classes: Array<{ id: number; name: string }>;
  classId?: number;
  periodLabel: string;
};

export type BoardDashboardData = {
  snapshot: FinancialSnapshot;
  filters: ReportFilters;
  options: Pick<ReportingPeriod, "academicYears" | "academicTerms">;
  periodLabel: string;
  trend: FinancialSnapshot["monthly"];
  trendGranularity: "day" | "month";
};

export type ClassEnrollmentSummary = {
  classId: number;
  className: string;
  studentCount: number;
};

export type AdministratorDashboardData = {
  activeStudents: number;
  admissionsToday: number;
  admissionsThisTerm: number;
  activeStaff: number;
  teachingStaff: number;
  openBalances: number;
  outstandingPage: number;
  outstandingPageSize: number;
  currentTermLabel: string;
  classEnrollment: ClassEnrollmentSummary[];
  outstandingRows: OutstandingInvoiceRow[];
};

export type SuperAdminOperationsData = {
  activeStudents: number;
  activeStaff: number;
  activeClasses: number;
  activeAccounts: number;
  libraryOutstanding: string;
  libraryTermLabel: string;
};
