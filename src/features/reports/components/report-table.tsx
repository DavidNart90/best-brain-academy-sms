import { Money } from "@/components/data-display/money";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReportFilters, ReportTable as ReportTableData } from "../types";

const moneyKeys = new Set([
  "amount",
  "total",
  "amountPaid",
  "outstanding",
  "debit",
  "credit",
  "balance",
]);

function pageHref(filters: ReportFilters, page: number) {
  const query = new URLSearchParams({
    view: filters.view,
    period: filters.period,
    start: filters.start,
    end: filters.end,
    status: filters.status,
    page: String(page),
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
  return `/reports?${query.toString()}`;
}

function presentValue(key: string, value: string | number | null | undefined) {
  if (value === null || value === "")
    return <span className="text-muted-foreground">—</span>;
  if (moneyKeys.has(key)) return <Money value={String(value)} />;
  if (key === "status") {
    const label = String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const alert = ["reversed", "cancelled", "disabled", "withdrawn"].includes(
      String(value).toLowerCase(),
    );
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
          alert
            ? "bg-danger-soft text-destructive"
            : "bg-muted text-foreground",
        )}
      >
        {label}
      </span>
    );
  }
  return String(value);
}

export function ReportTable({
  table,
  filters,
}: {
  table: ReportTableData;
  filters: ReportFilters;
}) {
  const pageCount = Math.max(1, Math.ceil(table.total / table.pageSize));
  return (
    <section
      className="report-document panel min-w-0 overflow-hidden"
      aria-labelledby="report-title"
    >
      <div className="border-b px-5 py-5 sm:px-6">
        <h2 id="report-title" className="text-base font-semibold">
          {table.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {table.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Period: <time dateTime={filters.start}>{filters.start}</time> to{" "}
          <time dateTime={filters.end}>{filters.end}</time>
        </p>
      </div>
      {table.columns.length > 0 && table.rows.length > 0 ? (
        <div
          className="table-scroll"
          tabIndex={0}
          aria-label={`${table.title} table`}
        >
          <Table>
            <caption className="sr-only">{table.description}</caption>
            <TableHeader>
              <TableRow className="bg-muted/60">
                {table.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.align === "right" && "text-right")}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={String(row.id ?? `${table.page}-${rowIndex}`)}>
                  {table.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "max-w-72 align-top",
                        column.align === "right" && "text-right tabular-nums",
                      )}
                    >
                      {presentValue(column.key, row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="px-5 py-16 text-center">
          <p className="font-medium">No report rows found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the filters or record the relevant activity first.
          </p>
        </div>
      )}
      {table.total > table.pageSize && (
        <div className="print:hidden">
          <DataTablePagination
            page={table.page}
            pageCount={pageCount}
            total={table.total}
            pageSize={table.pageSize}
            hrefForPage={(page) => pageHref(filters, page)}
            itemLabel="records"
          />
        </div>
      )}
    </section>
  );
}
