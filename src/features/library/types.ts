import type { TermRateConfiguration } from "@/types/term-rate-configuration";

export type LibraryRateStatus = "unconfigured" | "chargeable" | "not_charged";

export type LibraryRateRow = {
  classId: number;
  classCode: string;
  className: string;
  status: LibraryRateStatus;
  amount: string | null;
};

export type LibraryChargeRow = {
  id: number;
  studentId: number;
  studentName: string;
  admissionNumber: string;
  classId: number;
  className: string;
  expected: string;
  paid: string;
  outstanding: string;
  status: "unpaid" | "partially_paid" | "paid";
};

export type LibraryCollectionRow = {
  id: number;
  collectionNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: string;
  businessDate: string;
  paymentMethod: string;
  status: "active" | "reversed";
  reversalNumber: string | null;
};

export type LibrarySummary = {
  expected: string;
  paid: string;
  outstanding: string;
  studentCount: number;
};

export type LibraryTermOption = {
  id: number;
  academicYearId: number;
  label: string;
  isCurrent: boolean;
};

export type LibraryClassOption = {
  id: number;
  code: string;
  name: string;
};

export type LibraryPaymentMethod = {
  id: number;
  name: string;
  requiresReference: boolean;
};

export type LibraryPageResult = {
  terms: LibraryTermOption[];
  classes: LibraryClassOption[];
  rates: LibraryRateRow[];
  charges: LibraryChargeRow[];
  collections: LibraryCollectionRow[];
  paymentMethods: LibraryPaymentMethod[];
  summary: LibrarySummary;
  selectedTermId: number;
  selectedClassId: number | null;
  search: string;
  page: number;
  pageSize: number;
  total: number;
  rateConfiguration: TermRateConfiguration;
};

export type InvoiceLibraryBalance = {
  description: string;
  expected: string;
  paid: string;
  outstanding: string;
  status: "unpaid" | "partially_paid" | "paid";
};
