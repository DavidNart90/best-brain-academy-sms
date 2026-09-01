import type { AdministratorListQuery } from "./schemas";

export type AdministratorDirectoryRow = {
  userId: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: "pending" | "active" | "disabled";
  role: string | null;
  invitationStatus: "provisioned" | "invited" | "failed";
  invitedAt: string | null;
  lastSignInAt: string | null;
  mfaEnrolled: boolean;
};
export type AdministratorPageResult = {
  rows: AdministratorDirectoryRow[];
  total: number;
  allTotal: number;
  page: number;
  pageSize: number;
  query: AdministratorListQuery;
};
export type AdministratorImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string | null>;
  errors: string[];
};
export type AdministratorImportPreview = {
  fileName: string;
  rows: AdministratorImportPreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  canConfirm: boolean;
};
