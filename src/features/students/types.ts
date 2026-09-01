import type { StudentInput, StudentListQuery } from "./schemas";

export type StudentDirectoryRow = {
  id: number;
  admissionNumber: string;
  fullName: string;
  gender: "female" | "male";
  admissionDate: string;
  status: "active" | "inactive" | "graduated" | "withdrawn";
  guardianName: string;
  guardianPhone: string;
  academicYearId: number;
  academicYearName: string;
  academicTermId: number;
  academicTermName: string;
  classId: number;
  className: string;
  schoolLocationId: number;
  schoolLocationName: string;
  hasDisability: boolean;
  disabilityDetails: string | null;
  religiousDenomination: string;
};

export type StudentReferenceData = {
  academicYears: Array<{ id: number; name: string; isCurrent: boolean }>;
  academicTerms: Array<{
    id: number;
    academicYearId: number;
    name: string;
    isCurrent: boolean;
  }>;
  classes: Array<{ id: number; name: string }>;
  locations: Array<{ id: number; name: string }>;
};

export type StudentPageResult = {
  rows: StudentDirectoryRow[];
  total: number;
  allTotal: number;
  page: number;
  pageSize: number;
  query: StudentListQuery;
};

export type StudentGuardian = {
  id: number;
  fullName: string;
  relationship: string;
  primaryPhone: string;
  alternativePhone: string | null;
  email: string | null;
  address: string | null;
  isPrimary: boolean;
};

export type StudentEnrollment = {
  id: number;
  academicYearName: string;
  academicTermName: string;
  className: string;
  studentLocationName: string;
  status: "active" | "completed" | "transferred" | "withdrawn";
  startedOn: string;
  endedOn: string | null;
};

export type StudentProfile = {
  id: number;
  admissionNumber: string;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: "female" | "male";
  dateOfBirth: string | null;
  admissionDate: string;
  status: StudentDirectoryRow["status"];
  previousSchool: string | null;
  notes: string | null;
  hasDisability: boolean;
  disabilityDetails: string | null;
  religiousDenomination: string;
  hasPhoto: boolean;
  guardians: StudentGuardian[];
  enrollments: StudentEnrollment[];
};

export type ImportPreviewRow = {
  rowNumber: number;
  values: Pick<
    StudentInput,
    | "admissionNumber"
    | "firstName"
    | "middleName"
    | "lastName"
    | "gender"
    | "admissionDate"
    | "status"
  > & {
    academicYear: string;
    academicTerm: string;
    className: string;
    schoolLocation: string;
    hasDisability: string;
    disabilityDetails: string | null;
    religiousDenomination: string;
  };
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
