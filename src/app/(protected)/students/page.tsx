import Link from "next/link";
import {
  Download,
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

function queryHref(
  query: Awaited<ReturnType<typeof getStudentPage>>["query"],
  page?: number,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "active") params.set("status", query.status);
  if (query.gender !== "all") params.set("gender", query.gender);
  if (query.classId) params.set("classId", String(query.classId));
  if (query.academicYearId)
    params.set("academicYearId", String(query.academicYearId));
  if (query.sort !== "name") params.set("sort", query.sort);
  if (query.direction !== "asc") params.set("direction", query.direction);
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/students?${suffix}` : "/students";
}

function DisabledAction({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" disabled>
      {children}
    </Button>
  );
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("students.read");
  if (!context) return <PermissionDenied />;
  const rawQuery = await searchParams;
  const [result, reference] = await Promise.all([
    getStudentPage(rawQuery),
    getStudentReferenceData(),
  ]);
  const canManage = hasPermission(context, "students.manage");
  const canImport = hasPermission(context, "students.import");
  const canExport = hasPermission(context, "students.export");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const notice = Array.isArray(rawQuery.notice)
    ? rawQuery.notice[0]
    : rawQuery.notice;
  const exportHref = queryHref(result.query).replace(
    "/students",
    "/api/students/export",
  );

  return (
    <>
      <PageHeader
        title="Students"
        description="Find current students, review their enrollment context and onboard new records."
      >
        {canManage && (
          <Button asChild>
            <Link href="/students/new">
              <Plus /> Add student
            </Link>
          </Button>
        )}
      </PageHeader>

      {notice === "student-added" && (
        <div
          className="mb-5 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          Student and first enrollment added successfully.
        </div>
      )}

      {result.allTotal === 0 ? (
        <DirectoryEmptyState
          title="Your student directory is ready"
          description="Start with one student or use the reviewed spreadsheet workflow for a larger intake. No student is saved until the final import confirmation."
          actions={[
            {
              label: "Add Student",
              description: "Create one complete student and enrollment record.",
              icon: UserRoundPlus,
              content: canManage ? (
                <Button asChild>
                  <Link href="/students/new">
                    <Plus /> Add Student
                  </Link>
                </Button>
              ) : (
                <DisabledAction>
                  <Plus /> Add Student
                </DisabledAction>
              ),
            },
            {
              label: "Download Excel Template",
              description:
                "Use the approved columns and school reference values.",
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
              label: "Import Students",
              description: "Review every row before anything is saved.",
              icon: Upload,
              content: canImport ? (
                <StudentImportDialog />
              ) : (
                <DisabledAction>
                  <Upload /> Import Students
                </DisabledAction>
              ),
            },
          ]}
        />
      ) : (
        <section
          className="panel overflow-hidden"
          aria-labelledby="student-directory-title"
        >
          <div className="border-b p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="student-directory-title"
                  className="text-base font-semibold"
                >
                  Student directory
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total} matching{" "}
                  {result.total === 1 ? "student" : "students"}
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
                    <StudentImportDialog />
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
                title="No students match this search"
                description="Try a different name, admission number, status, class or academic year."
              />
            </div>
          ) : (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Student directory table"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-5">Student</TableHead>
                      <TableHead>Admission no.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Academic period</TableHead>
                      <TableHead>Student location</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead className="pr-5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="px-5 py-4">
                          <Link
                            className="font-semibold hover:text-primary hover:underline"
                            href={`/students/${student.id}`}
                          >
                            {student.fullName}
                          </Link>
                          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                            {student.gender}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell>{student.className}</TableCell>
                        <TableCell>
                          <p>{student.academicYearName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.academicTermName}
                          </p>
                        </TableCell>
                        <TableCell>{student.schoolLocationName}</TableCell>
                        <TableCell>
                          <p>{student.guardianName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.guardianPhone}
                          </p>
                        </TableCell>
                        <TableCell className="pr-5">
                          <StatusBadge status={statusLabels[student.status]} />
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
                itemLabel={result.total === 1 ? "student" : "students"}
                hrefForPage={(page) => queryHref(result.query, page)}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
