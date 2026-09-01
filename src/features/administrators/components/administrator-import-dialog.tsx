"use client";

import { SpreadsheetImportDialog } from "@/components/import/spreadsheet-import-dialog";

export function AdministratorImportDialog() {
  return (
    <SpreadsheetImportDialog
      entityLabel="Administrators"
      endpoint="/api/administrators/import"
      columns={[
        { key: "displayName", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
