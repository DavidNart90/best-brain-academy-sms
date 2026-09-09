import Link from "next/link";
import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportTable } from "@/features/reports/types";

function value(row: ReportTable["rows"][number], key: string) {
  return String(row[key] ?? "");
}

function reportHref(classId?: number) {
  const query = new URLSearchParams({ view: "outstanding" });
  if (classId) query.set("classId", String(classId));
  return `/reports?${query.toString()}`;
}

export function OutstandingFeesTable({
  table,
  classes,
  classId,
}: {
  table: ReportTable;
  classes: Array<{ id: number; name: string }>;
  classId?: number;
}) {
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-col gap-4 border-b p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">Outstanding fees</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Highest active student balances in the current academic term
          </p>
        </div>
        <form
          method="get"
          action="/dashboard"
          className="flex flex-wrap items-end gap-2"
        >
          <div className="field min-w-52">
            <label htmlFor="dashboard-class" className="field-label">
              Filter by class
            </label>
            <select
              id="dashboard-class"
              name="classId"
              defaultValue={classId ?? ""}
              className="native-select w-full"
            >
              <option value="">All classes</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
          {classId ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">Reset</Link>
            </Button>
          ) : null}
        </form>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="Outstanding fees table"
      >
        <Table>
          <caption className="sr-only">
            Outstanding student invoice balances for the selected class.
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="pl-6">Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row) => (
              <TableRow key={value(row, "id")}>
                <TableCell className="pl-6">
                  <p className="font-medium">{value(row, "student")}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {value(row, "admissionNumber")}
                  </p>
                </TableCell>
                <TableCell>{value(row, "className")}</TableCell>
                <TableCell className="font-mono text-xs font-semibold">
                  {value(row, "invoiceNumber")}
                </TableCell>
                <TableCell className="text-right">
                  <Money value={value(row, "total")} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={value(row, "amountPaid")} />
                </TableCell>
                <TableCell className="text-right font-semibold">
                  <Money value={value(row, "outstanding")} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      value(row, "amountPaid") === "0.00"
                        ? "Unpaid"
                        : "Partially Paid"
                    }
                  />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/financials/invoices/${value(row, "id")}`}>
                      Open
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {table.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="font-medium">No outstanding balances</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    There are no unpaid invoices for this class and term.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground sm:px-6">
        <span>
          Showing {table.rows.length} of {table.total} open balance
          {table.total === 1 ? "" : "s"}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={reportHref(classId)}>Open full outstanding report</Link>
        </Button>
      </div>
    </section>
  );
}
