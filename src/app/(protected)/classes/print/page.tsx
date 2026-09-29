import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { classListHref } from "@/features/academics/class-list-query";
import {
  getClassPage,
  getClassReportIdentity,
} from "@/features/academics/server/queries";
import { classGroupLabels } from "@/features/academics/types";
import { DocumentHeader } from "@/features/finance/components/document-header";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { requirePermission } from "@/lib/auth/access";

function statusLabel(status: "active" | "archived" | "all") {
  if (status === "all") return "All statuses";
  return status === "active" ? "Active classes" : "Archived classes";
}

export default async function ClassReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("classes.read");
  if (!context) return <PermissionDenied />;

  const rawQuery = await searchParams;
  const [result, identity] = await Promise.all([
    getClassPage(rawQuery, { mode: "print" }),
    getClassReportIdentity(),
  ]);
  const totals = result.rows.reduce(
    (sum, row) => ({
      male: sum.male + row.maleStudents,
      female: sum.female + row.femaleStudents,
      students: sum.students + row.totalStudents,
    }),
    { male: 0, female: 0, students: 0 },
  );
  const generatedOn = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <PageHeader
        title="Print class enrollment"
        description="A school-branded enrollment summary using the selected academic year and term."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={classListHref(result.query)}>
              <ArrowLeft /> Back to classes
            </Link>
          </Button>
          {result.rows.length > 0 && <PrintInvoiceButton />}
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <PageState
          kind="empty"
          title="No classes to print"
          description="Return to classes and adjust the search or status filter."
        />
      ) : (
        <section className="class-roster-report report-document panel overflow-hidden">
          <div className="p-5 sm:p-6">
            <DocumentHeader
              title="Class Enrollment Summary"
              reference={`${result.selectedYearLabel} · ${result.selectedTermLabel}`}
              identity={identity}
            >
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {generatedOn}
              </p>
            </DocumentHeader>
            <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
              <ReportFilter
                label="Academic year"
                value={result.selectedYearLabel}
              />
              <ReportFilter label="Term" value={result.selectedTermLabel} />
              <ReportFilter
                label="Class scope"
                value={
                  result.query.q
                    ? `${statusLabel(result.query.status)} matching “${result.query.q}”`
                    : statusLabel(result.query.status)
                }
              />
              <ReportFilter
                label="Students represented"
                value={String(totals.students)}
              />
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Counts use each student&apos;s latest enrollment record in the
              selected academic year and term, so the report total does not
              count a transferred student twice.
            </p>
          </div>
          {result.truncated && (
            <p className="mx-5 mb-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning sm:mx-6">
              This print view is limited to the first 100 matching classes.
              Narrow the class search before printing a complete report.
            </p>
          )}
          <Table aria-label="Class enrollment summary">
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="px-5">Class</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Class group</TableHead>
                <TableHead className="text-right">Male</TableHead>
                <TableHead className="text-right">Female</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((schoolClass) => (
                <TableRow key={schoolClass.id}>
                  <TableCell className="px-5 py-3 font-semibold">
                    {schoolClass.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {schoolClass.code}
                  </TableCell>
                  <TableCell>
                    {classGroupLabels[schoolClass.class_group]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {schoolClass.maleStudents}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {schoolClass.femaleStudents}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {schoolClass.totalStudents}
                  </TableCell>
                  <TableCell className="pr-5">
                    <StatusBadge
                      status={
                        schoolClass.status === "active" ? "Active" : "Archived"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="px-5" colSpan={3}>
                  Report total
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {totals.male}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {totals.female}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {totals.students}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      )}
    </>
  );
}

function ReportFilter({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
