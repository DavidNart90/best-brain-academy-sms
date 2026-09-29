export type ClassListQuery = {
  q: string;
  status: "active" | "archived" | "all";
  academicYearId: number | null;
  academicTermId: number | null;
};

export type EnrollmentGenderRow = {
  enrollmentId: number;
  classId: number;
  studentId: number;
  gender: "male" | "female";
};

export type ClassGenderCounts = {
  femaleStudents: number;
  maleStudents: number;
  totalStudents: number;
};

export function classListHref(
  query: ClassListQuery,
  options: {
    page?: number;
    pathname?: "/classes" | "/classes/print";
  } = {},
) {
  const params = new URLSearchParams();
  const normalizedQuery = query.q.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (query.status !== "active") params.set("status", query.status);
  if (query.academicYearId)
    params.set("academicYearId", String(query.academicYearId));
  if (query.academicTermId)
    params.set("academicTermId", String(query.academicTermId));
  if (options.page && options.page > 1)
    params.set("page", String(options.page));

  const pathname = options.pathname ?? "/classes";
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

export function aggregateClassGenderCounts(rows: EnrollmentGenderRow[]) {
  const counts = new Map<number, ClassGenderCounts>();
  const latestEnrollmentByStudent = new Map<number, EnrollmentGenderRow>();

  for (const row of rows) {
    const current = latestEnrollmentByStudent.get(row.studentId);
    if (!current || row.enrollmentId > current.enrollmentId)
      latestEnrollmentByStudent.set(row.studentId, row);
  }

  for (const row of latestEnrollmentByStudent.values()) {
    const current = counts.get(row.classId) ?? {
      femaleStudents: 0,
      maleStudents: 0,
      totalStudents: 0,
    };
    if (row.gender === "female") current.femaleStudents += 1;
    else current.maleStudents += 1;
    current.totalStudents += 1;
    counts.set(row.classId, current);
  }

  return counts;
}
