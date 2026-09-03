"use client";

import { SpreadsheetImportDialog } from "@/components/import/spreadsheet-import-dialog";

export function StudentImportDialog({
  triggerVariant = "outline",
  entityLabel = "Students",
}: {
  triggerVariant?: "default" | "outline";
  entityLabel?: "Students" | "Admissions";
}) {
  return (
    <SpreadsheetImportDialog
      entityLabel={entityLabel}
      endpoint="/api/students/import"
      triggerVariant={triggerVariant}
      columns={[
        { key: "admissionNumber", label: "Admission number" },
        { key: "firstName", label: "First name" },
        { key: "lastName", label: "Last name" },
        { key: "className", label: "Class" },
        { key: "schoolLocation", label: "Student location" },
        { key: "hasDisability", label: "Disability" },
        { key: "religiousDenomination", label: "Denomination" },
      ]}
    />
  );
}
