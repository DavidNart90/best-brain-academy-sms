import type { StaffListQuery } from "./schemas";

export type StaffReferenceData = {
  academicYears: Array<{ id: number; name: string; isCurrent: boolean }>;
  academicTerms: Array<{
    id: number;
    academicYearId: number;
    name: string;
    isCurrent: boolean;
  }>;
  classes: Array<{ id: number; name: string }>;
};

export type StaffDirectoryRow = {
  id: number;
  staffNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  staffType: "teaching" | "non_teaching";
  position: string;
  status: "active" | "inactive" | "archived";
  dateJoined: string | null;
  assignedClasses: string;
};

export type StaffPageResult = {
  rows: StaffDirectoryRow[];
  total: number;
  allTotal: number;
  page: number;
  pageSize: number;
  query: StaffListQuery;
};

export type StaffProfile = StaffDirectoryRow & {
  firstName: string;
  middleName: string | null;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  assignments: Array<{
    id: number;
    academicYearName: string;
    academicTermName: string;
    className: string;
    status: "active" | "completed";
    startedOn: string;
    endedOn: string | null;
  }>;
};

export type ImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string | null>;
  errors: string[];
};
export type ImportPreview = {
  fileName: string;
  rows: ImportPreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  canConfirm: boolean;
};
