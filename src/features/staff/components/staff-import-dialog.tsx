"use client";

import { SpreadsheetImportDialog } from "@/components/import/spreadsheet-import-dialog";

export function StaffImportDialog() {
  return (
    <SpreadsheetImportDialog
      entityLabel="Staff"
      endpoint="/api/staff/import"
      columns={[
        { key: "staffNumber", label: "Staff ID" },
        { key: "fullName", label: "Name" },
        { key: "staffType", label: "Type" },
        { key: "position", label: "Position" },
        { key: "assignedClass", label: "Assigned class" },
        { key: "knownSubjects", label: "Known subjects" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
