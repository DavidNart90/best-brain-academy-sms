"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportFilters } from "../types";

function exportHref(filters: ReportFilters, format: "csv" | "xlsx") {
  const query = new URLSearchParams({
    view: filters.view,
    period: filters.period,
    start: filters.start,
    end: filters.end,
    status: filters.status,
    format,
  });
  const optional = {
    academicYearId: filters.academicYearId,
    academicTermId: filters.academicTermId,
    classId: filters.classId,
    studentId: filters.studentId,
    staffId: filters.staffId,
    paymentMethodId: filters.paymentMethodId,
    expenseCategoryId: filters.expenseCategoryId,
  };
  Object.entries(optional).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  return `/api/reports/export?${query.toString()}`;
}

export function ReportActions({ filters }: { filters: ReportFilters }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" size="sm" asChild>
        <a href={exportHref(filters, "csv")}>
          <Download /> CSV
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={exportHref(filters, "xlsx")}>
          <FileSpreadsheet /> Excel
        </a>
      </Button>
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => window.print()}
      >
        <Printer /> Print / Save PDF
      </Button>
    </div>
  );
}
