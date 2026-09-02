import Link from "next/link";
import {
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Plus,
  Upload,
  UserRoundPlus,
} from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { DirectoryEmptyState } from "@/components/data-display/directory-empty-state";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StudentFilters } from "@/features/students/components/student-filters";
import { StudentImportDialog } from "@/features/students/components/student-import-dialog";
import {
  getStudentPage,
  getStudentReferenceData,
} from "@/features/students/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function admissionHref(
  query: Awaited<ReturnType<typeof getStudentPage>>["query"],
  page?: number,
  includeDefaults = false,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (includeDefaults || query.status !== "all")
    params.set("status", query.status);
  if (query.gender !== "all") params.set("gender", query.gender);
  if (query.classId) params.set("classId", String(query.classId));
  if (query.academicYearId)
    params.set("academicYearId", String(query.academicYearId));
  if (includeDefaults || query.sort !== "newest")
    params.set("sort", query.sort);
  if (includeDefaults || query.direction !== "desc")
    params.set("direction", query.direction);
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admissions?${suffix}` : "/admissions";
}

function DisabledAction({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" disabled>
      {children}
    </Button>
  );
}

export default async function AdmissionRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("admissions.read");
  if (!context) return <PermissionDenied />;

  const rawQuery = await searchParams;
  const admissionQuery = {
    ...rawQuery,
    status: rawQuery.status ?? "all",
    sort: rawQuery.sort ?? "newest",
    direction: rawQuery.direction ?? "desc",
  };
  const [result, reference] = await Promise.all([
    getStudentPage(admissionQuery),
    getStudentReferenceData(),
  ]);
  const canManage = hasPermission(context, "students.manage");
  const canImport = hasPermission(context, "students.import");
  const canExport = hasPermission(context, "students.export");
  const canReadStudents = hasPermission(context, "students.read");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const exportHref = admissionHref(result.query, undefined, true).replace(
    "/admissions",
    "/api/students/export",
  );

  return (
    <>
      <PageHeader
        title="Admission records"
        description="Review admitted students, their first enrollment context and guardian contact details."
      >
        {canManage && (
          <Button asChild>
            <Link href="/admissions/new">
              <Plus /> New admission
            </Link>
          </Button>
        )}
      </PageHeader>

      {result.allTotal === 0 ? (
        <DirectoryEmptyState
          title="Your admission register is ready"
          description="Create one admission or use the reviewed spreadsheet workflow. Student, guardian and enrollment records are saved together only after validation and confirmation."
          actions={[
            {
              label: "New Admission",
              description: "Create one student, guardian and first enrollment.",
              icon: UserRoundPlus,
              content: canManage ? (
                <Button asChild>
                  <Link href="/admissions/new">
                    <Plus /> New Admission
                  </Link>
                </Button>
              ) : (
                <DisabledAction>
                  <Plus /> New Admission
                </DisabledAction>
              ),
            },
            {
              label: "Download Excel Template",
              description: "Use the approved admission and guardian columns.",
              icon: FileSpreadsheet,
              content: canImport ? (
                <Button asChild variant="outline">
                  <Link href="/api/students/template" prefetch={false}>
                    <FileDown /> Download Excel Template
                  </Link>
                </Button>
              ) : (
                <DisabledAction>
                  <FileDown /> Download Excel Template
                </DisabledAction>
              ),
            },
            {
              label: "Import Admissions",
              description: "Preview row errors and duplicates before saving.",
              icon: Upload,
              content: canImport ? (
                <StudentImportDialog entityLabel="Admissions" />
              ) : (
                <DisabledAction>
                  <Upload /> Import Admissions
                </DisabledAction>
              ),
            },
          ]}
        />
      ) : (
        <section
          className="panel overflow-hidden"
          aria-labelledby="admission-register-title"
        >
          <div className="border-b p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="admission-register-title"
                  className="text-base font-semibold"
                >
                  Admission register
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total} matching{" "}
                  {result.total === 1 ? "record" : "records"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canImport && (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/api/students/template" prefetch={false}>
                        <FileSpreadsheet /> Template
                      </Link>
                    </Button>
                    <StudentImportDialog entityLabel="Admissions" />
                  </>
                )}
                {canExport && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={exportHref} prefetch={false}>
                      <Download /> Export table
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <StudentFilters initial={result.query} reference={reference} />
          </div>

          {result.rows.length === 0 ? (
            <div className="p-5">
              <PageState
                title="No admission records match this search"
                description="Try another student, admission number, class, academic year or status."
              />
            </div>
          ) : (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Admission records table"
              >
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-5">Admission no.</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Admission date</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Academic year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="px-5 font-mono text-xs">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell className="py-4 font-semibold">
                          {student.fullName}
                        </TableCell>
                        <TableCell>{student.className}</TableCell>
                        <TableCell>
                          {dateFormatter.format(
                            new Date(`${student.admissionDate}T00:00:00Z`),
                          )}
                        </TableCell>
                        <TableCell>
                          <p>{student.guardianName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.guardianPhone}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{student.academicYearName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.academicTermName}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={statusLabels[student.status]} />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {canReadStudents ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/students/${student.id}`}>
                                <Eye /> View
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Read only
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                page={result.page}
                pageCount={pageCount}
                pageSize={result.pageSize}
                total={result.total}
                itemLabel={result.total === 1 ? "record" : "records"}
                hrefForPage={(page) => admissionHref(result.query, page)}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
