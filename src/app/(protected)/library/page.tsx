import Link from "next/link";
import {
  BookOpenText,
  CircleAlert,
  HandCoins,
  Search,
  Settings2,
} from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { Money } from "@/components/data-display/money";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatCard } from "@/components/data-display/stat-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GenerateLibraryChargesButton,
  LibraryCollectionDialog,
  LibraryRateForm,
  LibraryReversalDialog,
} from "@/features/library/components/library-actions";
import { getLibraryPage } from "@/features/library/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export const dynamic = "force-dynamic";

const statusLabels = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
} as const;

const mediumDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const date = (value: string) =>
  mediumDate.format(new Date(`${value}T00:00:00Z`));

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("library.read");
  if (!context) return <PermissionDenied />;
  const result = await getLibraryPage(await searchParams);
  const canCollect = hasPermission(context, "library.collections.manage");
  const canConfigure = hasPermission(context, "library.settings.manage");
  const selectedTerm = result.terms.find(
    (term) => term.id === result.selectedTermId,
  );
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  function hrefForPage(page: number) {
    const query = new URLSearchParams();
    query.set("termId", String(result.selectedTermId));
    if (result.selectedClassId)
      query.set("classId", String(result.selectedClassId));
    if (result.search) query.set("q", result.search);
    if (page > 1) query.set("page", String(page));
    return `/library?${query}`;
  }

  return (
    <>
      <PageHeader
        title="Library collections"
        description="Configure and collect the term Books & Prospectus bill separately from school fees and accounting cashflow."
      >
        {canCollect && (
          <GenerateLibraryChargesButton
            academicTermId={result.selectedTermId}
          />
        )}
      </PageHeader>

      <div className="space-y-5">
        <section className="panel p-5" aria-labelledby="library-filter-title">
          <div className="mb-4">
            <h2 id="library-filter-title" className="text-base font-semibold">
              Student balances
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter billed students by term or class before recording a
              collection.
            </p>
          </div>
          <LiveFilterForm
            ariaLabel="Filter Library balances"
            className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_minmax(11rem,0.7fr)_minmax(13rem,1fr)_auto]"
          >
            <select
              name="termId"
              defaultValue={result.selectedTermId}
              className="native-select"
              aria-label="Academic term"
            >
              {result.terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                  {term.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
            <select
              name="classId"
              defaultValue={result.selectedClassId ?? ""}
              className="native-select"
              aria-label="Class"
            >
              <option value="">All classes</option>
              {result.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={result.search}
                placeholder="Student or admission number"
                aria-label="Search Library balances"
                className="pl-9"
              />
            </div>
            <Button asChild type="button" variant="ghost">
              <Link href="/library">Clear</Link>
            </Button>
          </LiveFilterForm>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Books and Prospectus totals"
        >
          <StatCard
            label="Expected"
            amount={result.summary.expected}
            note={`${result.summary.studentCount} billed ${result.summary.studentCount === 1 ? "student" : "students"}`}
            icon={BookOpenText}
          />
          <StatCard
            label="Paid"
            amount={result.summary.paid}
            note="Active Library collections"
            icon={HandCoins}
            accent
          />
          <StatCard
            label="Net"
            amount={result.summary.outstanding}
            note="Expected less paid · outstanding"
            icon={CircleAlert}
          />
        </section>

        <section className="panel min-w-0 overflow-hidden">
          <div className="border-b px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold">
              Books &amp; Prospectus balances
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTerm?.label ?? "Selected term"}. These amounts do not
              enter the school-fee balance.
            </p>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="Student Library balances"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="pl-6">Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  {canCollect && (
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{charge.studentName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {charge.admissionNumber}
                      </p>
                    </TableCell>
                    <TableCell>{charge.className}</TableCell>
                    <TableCell className="text-right">
                      <Money value={charge.expected} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={charge.paid} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={charge.outstanding} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={statusLabels[charge.status]} />
                    </TableCell>
                    {canCollect && (
                      <TableCell className="pr-6 text-right">
                        <LibraryCollectionDialog
                          charge={charge}
                          paymentMethods={result.paymentMethods}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {result.charges.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canCollect ? 7 : 6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No Library charges match these filters. Configure rates,
                      then generate term charges.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            page={result.page}
            pageCount={pageCount}
            total={result.total}
            pageSize={result.pageSize}
            hrefForPage={hrefForPage}
            itemLabel="Library balances"
          />
        </section>

        <section className="panel min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold">
                Term rate configuration
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Missing is intentionally different from not charged. Rate
                changes never rewrite generated student bills.
              </p>
            </div>
            <Settings2
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="Library term rates"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="pl-6">Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Term amount</TableHead>
                  {canConfigure && (
                    <TableHead className="pr-6 text-right">Configure</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rates.map((rate) => (
                  <TableRow key={rate.classId}>
                    <TableCell className="pl-6 font-medium">
                      {rate.className}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full">
                        {rate.status === "unconfigured"
                          ? "Not configured"
                          : rate.status === "not_charged"
                            ? "Not charged"
                            : "Configured"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {rate.amount ? <Money value={rate.amount} /> : "—"}
                    </TableCell>
                    {canConfigure && (
                      <TableCell className="pr-6 text-right">
                        <LibraryRateForm
                          rate={rate}
                          academicTermId={result.selectedTermId}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="panel min-w-0 overflow-hidden">
          <div className="border-b px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold">
              Recent Library collections
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest Books &amp; Prospectus collection references across terms.
            </p>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            aria-label="Recent Library collections"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="pl-6">Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {canCollect && (
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="pl-6 font-medium">
                      {collection.collectionNumber}
                      {collection.reversalNumber && (
                        <p className="mt-0.5 text-xs text-destructive">
                          {collection.reversalNumber}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {collection.studentName}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {collection.admissionNumber}
                      </p>
                    </TableCell>
                    <TableCell>{collection.className}</TableCell>
                    <TableCell>{date(collection.businessDate)}</TableCell>
                    <TableCell>{collection.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      <Money value={collection.amount} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          collection.status === "active" ? "Active" : "Reversed"
                        }
                      />
                    </TableCell>
                    {canCollect && (
                      <TableCell className="pr-6 text-right">
                        {collection.status === "active" ? (
                          <LibraryReversalDialog
                            collectionId={collection.id}
                            collectionNumber={collection.collectionNumber}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Retained
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {result.collections.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canCollect ? 8 : 7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No Library collections have been recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}
