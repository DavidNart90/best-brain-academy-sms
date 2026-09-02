import Link from "next/link";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";
import {
  PermissionDenied,
  PageState,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassFilters } from "@/features/academics/components/class-filters";
import { getClassPage } from "@/features/academics/server/queries";
import { classGroupLabels } from "@/features/academics/types";

function pageHref(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "active") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/classes?${query}` : "/classes";
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("classes.read");
  if (!context) return <PermissionDenied />;
  const result = await getClassPage(await searchParams);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <>
      <PageHeader
        title="Classes"
        description="Review the approved class catalogue in its school-wide display order."
      >
        {hasPermission(context, "settings.manage") && (
          <Button asChild>
            <Link href="/settings/academics">
              <Settings2 /> Manage academic settings
            </Link>
          </Button>
        )}
      </PageHeader>
      <section
        className="panel overflow-hidden"
        aria-labelledby="classes-table-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="classes-table-title" className="text-base font-semibold">
              Class catalogue
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.total} matching {result.total === 1 ? "class" : "classes"}
            </p>
          </div>
          <ClassFilters
            initialQuery={result.query.q}
            initialStatus={result.query.status}
          />
        </div>
        {result.rows.length === 0 ? (
          <div className="p-5">
            <PageState
              title="No classes found"
              description="Change the search or status filter to see another part of the catalogue."
            />
          </div>
        ) : (
          <Table aria-label="School classes">
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="px-5">Class</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Class group</TableHead>
                <TableHead>Display order</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((schoolClass) => (
                <TableRow key={schoolClass.id}>
                  <TableCell className="px-5 py-4 font-semibold">
                    <Link
                      href={`/classes/${schoolClass.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {schoolClass.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {schoolClass.code}
                  </TableCell>
                  <TableCell>
                    {classGroupLabels[schoolClass.class_group]}
                  </TableCell>
                  <TableCell>{schoolClass.sort_order}</TableCell>
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
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
          <span>
            Page {result.page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              aria-disabled={result.page <= 1}
              className={
                result.page <= 1 ? "pointer-events-none opacity-50" : ""
              }
            >
              <Link
                href={pageHref(
                  result.query.q,
                  result.query.status,
                  Math.max(1, result.page - 1),
                )}
              >
                <ChevronLeft /> Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              aria-disabled={result.page >= pageCount}
              className={
                result.page >= pageCount ? "pointer-events-none opacity-50" : ""
              }
            >
              <Link
                href={pageHref(
                  result.query.q,
                  result.query.status,
                  Math.min(pageCount, result.page + 1),
                )}
              >
                Next <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
