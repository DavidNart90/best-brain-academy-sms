import Link from "next/link";
import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { OutstandingInvoiceRow } from "../types";

const statusLabels = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;

export function OutstandingFeesTable({
  rows,
  canOpenStudents = false,
  canOpenInvoices = false,
  printMode = false,
}: {
  rows: OutstandingInvoiceRow[];
  canOpenStudents?: boolean;
  canOpenInvoices?: boolean;
  printMode?: boolean;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={printMode ? undefined : 0}
      role="region"
      aria-label="Outstanding invoice balances"
    >
      <table className="w-full min-w-240 text-sm">
        <thead className="bg-muted/70">
          <tr className="border-b">
            <th className="px-5 py-3 text-left font-medium">Student</th>
            <th className="py-3 text-left font-medium">Invoice</th>
            <th className="py-3 text-left font-medium">Class / location</th>
            <th className="py-3 text-left font-medium">Academic period</th>
            <th className="py-3 text-right font-medium">Total</th>
            <th className="py-3 text-right font-medium">Paid</th>
            <th className="py-3 text-right font-medium">Outstanding</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-b-0">
              <td className="px-5 py-4">
                {canOpenStudents && !printMode ? (
                  <Link
                    href={`/students/${row.studentId}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {row.studentName}
                  </Link>
                ) : (
                  <p className="font-semibold">{row.studentName}</p>
                )}
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {row.admissionNumber}
                </p>
              </td>
              <td className="py-4">
                {canOpenInvoices && !printMode ? (
                  <Link
                    href={`/financials/invoices/${row.id}`}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {row.invoiceNumber}
                  </Link>
                ) : (
                  <span className="font-mono text-xs font-semibold">
                    {row.invoiceNumber}
                  </span>
                )}
              </td>
              <td className="py-4">
                <p>{row.className}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.locationName}
                </p>
              </td>
              <td className="py-4">
                <p>{row.academicYearName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.academicTermName}
                </p>
              </td>
              <td className="py-4 text-right">
                <Money value={row.total} />
              </td>
              <td className="py-4 text-right">
                <Money value={row.amountPaid} />
              </td>
              <td className="py-4 text-right font-semibold">
                <Money value={row.outstanding} />
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={statusLabels[row.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
