import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  aggregateClassGenderCounts,
  type EnrollmentGenderRow,
} from "../class-list-query";
import { classListQuerySchema } from "../schemas";
import type {
  AcademicConfiguration,
  AcademicTerm,
  AcademicYear,
  AuditLog,
  ClassReportIdentity,
  ClassRosterPeriod,
  ClassRosterRow,
  SchoolClass,
  SchoolLocation,
  SchoolSettings,
} from "../types";

const configurationError =
  "Academic configuration could not be loaded. Try again or contact an administrator.";

export async function getAcademicConfiguration(): Promise<AcademicConfiguration> {
  const supabase = await createServerSupabaseClient();
  const [years, terms, classes, locations, settings, audit] = await Promise.all(
    [
      supabase
        .from("academic_years")
        .select(
          "id,name,short_name,starts_on,ends_on,is_current,status,created_by,updated_by,created_at,updated_at",
        )
        .order("starts_on", { ascending: false })
        .order("id", { ascending: false })
        .limit(25),
      supabase
        .from("academic_terms")
        .select(
          "id,academic_year_id,name,sequence,starts_on,ends_on,is_current,status,created_by,updated_by,created_at,updated_at",
        )
        .order("academic_year_id", { ascending: false })
        .order("sequence")
        .order("id")
        .limit(100),
      supabase
        .from("classes")
        .select(
          "id,code,name,class_group,sort_order,status,created_by,updated_by,created_at,updated_at",
        )
        .order("sort_order")
        .order("id")
        .limit(100),
      supabase
        .from("school_locations")
        .select(
          "id,code,name,sort_order,status,created_by,updated_by,created_at,updated_at",
        )
        .order("sort_order")
        .order("id")
        .limit(100),
      supabase
        .from("school_settings")
        .select(
          "id,school_name,short_name,address,phone,email,motto,location_charge_label,logo_path,created_by,updated_by,created_at,updated_at",
        )
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("audit_logs")
        .select(
          "id,actor_user_id,action,entity_type,entity_id,old_values,new_values,created_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(25),
    ],
  );
  if (
    years.error ||
    terms.error ||
    classes.error ||
    locations.error ||
    settings.error ||
    audit.error ||
    !settings.data
  ) {
    throw new Error(configurationError);
  }
  return {
    years: years.data as AcademicYear[],
    terms: terms.data as AcademicTerm[],
    classes: classes.data as SchoolClass[],
    locations: locations.data as SchoolLocation[],
    settings: settings.data as SchoolSettings,
    audit: audit.data as AuditLog[],
  };
}

export async function getClassPage(
  rawQuery: Record<string, string | string[] | undefined>,
  options: { mode?: "page" | "print" } = {},
) {
  const parsedQuery = classListQuerySchema.parse({
    q: Array.isArray(rawQuery.q) ? rawQuery.q[0] : rawQuery.q,
    status: Array.isArray(rawQuery.status)
      ? rawQuery.status[0]
      : rawQuery.status,
    page: Array.isArray(rawQuery.page) ? rawQuery.page[0] : rawQuery.page,
    academicYearId: Array.isArray(rawQuery.academicYearId)
      ? rawQuery.academicYearId[0]
      : rawQuery.academicYearId,
    academicTermId: Array.isArray(rawQuery.academicTermId)
      ? rawQuery.academicTermId[0]
      : rawQuery.academicTermId,
  });
  const isPrint = options.mode === "print";
  const page = isPrint ? 1 : parsedQuery.page;
  const pageSize = isPrint ? 100 : 25;
  const offset = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("classes")
    .select(
      "id,code,name,class_group,sort_order,status,created_by,updated_by,created_at,updated_at",
      {
        count: "exact",
      },
    );
  if (parsedQuery.status !== "all")
    request = request.eq("status", parsedQuery.status);
  if (parsedQuery.q) {
    const safePattern = parsedQuery.q.replace(/[\\%_]/g, "\\$&");
    request = request.ilike("name", `%${safePattern}%`);
  }
  const [result, yearsResult, termsResult] = await Promise.all([
    request
      .order("sort_order")
      .order("id")
      .range(offset, offset + pageSize - 1),
    supabase
      .from("academic_years")
      .select("id,name,is_current,status,starts_on")
      .order("starts_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(25),
    supabase
      .from("academic_terms")
      .select("id,academic_year_id,name,sequence,is_current,status")
      .order("academic_year_id", { ascending: false })
      .order("sequence")
      .order("id")
      .limit(100),
  ]);
  if (result.error || yearsResult.error || termsResult.error)
    throw new Error(configurationError);

  const requestedYear = yearsResult.data.find(
    (year) => year.id === parsedQuery.academicYearId,
  );
  const selectedYear =
    requestedYear ??
    yearsResult.data.find((year) => year.is_current) ??
    yearsResult.data[0] ??
    null;
  const availableTerms = selectedYear
    ? termsResult.data.filter(
        (term) => term.academic_year_id === selectedYear.id,
      )
    : [];
  const requestedTerm = availableTerms.find(
    (term) => term.id === parsedQuery.academicTermId,
  );
  const selectedTerm =
    requestedTerm ??
    availableTerms.find((term) => term.is_current) ??
    availableTerms[0] ??
    null;
  const query = {
    q: parsedQuery.q,
    status: parsedQuery.status,
    academicYearId: selectedYear?.id ?? null,
    academicTermId: selectedTerm?.id ?? null,
  };

  const classes = result.data as SchoolClass[];
  const genderRows =
    selectedYear && selectedTerm && classes.length > 0
      ? await getEnrollmentGenderRows(
          supabase,
          classes.map((schoolClass) => schoolClass.id),
          selectedYear.id,
          selectedTerm.id,
        )
      : [];
  const counts = aggregateClassGenderCounts(genderRows);
  const rows: ClassRosterRow[] = classes.map((schoolClass) => ({
    ...schoolClass,
    ...(counts.get(schoolClass.id) ?? {
      femaleStudents: 0,
      maleStudents: 0,
      totalStudents: 0,
    }),
  }));
  const years: ClassRosterPeriod[] = yearsResult.data.map((year) => ({
    id: year.id,
    label: `${year.name}${year.status === "active" ? "" : " · Archived"}`,
    isCurrent: year.is_current,
  }));
  const terms: ClassRosterPeriod[] = termsResult.data.map((term) => ({
    id: term.id,
    academicYearId: term.academic_year_id,
    label: `${term.name}${term.status === "active" ? "" : " · Archived"}`,
    isCurrent: term.is_current,
  }));

  return {
    rows,
    total: result.count ?? 0,
    page,
    pageSize,
    query,
    years,
    terms,
    selectedYearLabel: selectedYear?.name ?? "No academic year",
    selectedTermLabel: selectedTerm?.name ?? "No academic term",
    truncated: isPrint && (result.count ?? 0) > pageSize,
  };
}

type AcademicSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

function asEnrollmentGenderRows(rows: unknown[]): EnrollmentGenderRow[] {
  const normalized: EnrollmentGenderRow[] = [];
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const nestedStudent = Array.isArray(row.student)
      ? row.student[0]
      : row.student;
    if (!nestedStudent || typeof nestedStudent !== "object") continue;
    const gender = (nestedStudent as Record<string, unknown>).gender;
    if (
      typeof row.id !== "number" ||
      typeof row.class_id !== "number" ||
      typeof row.student_id !== "number" ||
      (gender !== "male" && gender !== "female")
    )
      continue;
    normalized.push({
      enrollmentId: row.id,
      classId: row.class_id,
      studentId: row.student_id,
      gender,
    });
  }
  return normalized;
}

async function getEnrollmentGenderRows(
  supabase: AcademicSupabaseClient,
  classIds: number[],
  academicYearId: number,
  academicTermId: number,
) {
  const pageSize = 1_000;
  const maximumRows = 5_000;
  const rows: EnrollmentGenderRow[] = [];
  let offset = 0;

  while (offset < maximumRows) {
    const result = await supabase
      .from("student_enrollments")
      .select(
        "id,class_id,student_id,student:students!student_enrollments_student_id_fkey(gender)",
        { count: offset === 0 ? "exact" : undefined },
      )
      .eq("academic_year_id", academicYearId)
      .eq("academic_term_id", academicTermId)
      .in("class_id", classIds)
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (result.error) throw new Error(configurationError);
    if (offset === 0 && (result.count ?? 0) > maximumRows) {
      throw new Error(
        "Class enrollment counts exceed the supported report size. Narrow the class search and try again.",
      );
    }
    rows.push(...asEnrollmentGenderRows(result.data as unknown[]));
    if (result.data.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

export async function getClassReportIdentity(): Promise<ClassReportIdentity> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("school_settings")
    .select("school_name,address,phone,email,motto,logo_path")
    .eq("id", 1)
    .single();
  if (result.error)
    throw new Error(
      "School identity could not be loaded for this report. Try again or contact an administrator.",
    );
  return {
    schoolName: result.data.school_name,
    schoolAddress: result.data.address,
    schoolPhone: result.data.phone,
    schoolEmail: result.data.email,
    schoolMotto: result.data.motto,
    schoolLogoPath: result.data.logo_path,
  };
}

export async function getSchoolClass(
  classId: number,
): Promise<SchoolClass | null> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("classes")
    .select(
      "id,code,name,class_group,sort_order,status,created_by,updated_by,created_at,updated_at",
    )
    .eq("id", classId)
    .maybeSingle();
  if (result.error) throw new Error(configurationError);
  return result.data as SchoolClass | null;
}

export async function getSchoolLocations(): Promise<{
  settings: SchoolSettings;
  locations: SchoolLocation[];
}> {
  const supabase = await createServerSupabaseClient();
  const [settings, locations] = await Promise.all([
    supabase.from("school_settings").select("*").eq("id", 1).single(),
    supabase
      .from("school_locations")
      .select("*")
      .order("sort_order")
      .order("id")
      .limit(100),
  ]);
  if (settings.error || locations.error) throw new Error(configurationError);
  return {
    settings: settings.data as SchoolSettings,
    locations: locations.data as SchoolLocation[],
  };
}

export async function getSettingsSummary() {
  const supabase = await createServerSupabaseClient();
  const [settings, currentYear, currentTerm, classes, locations] =
    await Promise.all([
      supabase
        .from("school_settings")
        .select("school_name,short_name,motto,updated_at")
        .eq("id", 1)
        .single(),
      supabase
        .from("academic_years")
        .select("name")
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("academic_terms")
        .select("name")
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("school_locations")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  if (
    settings.error ||
    currentYear.error ||
    currentTerm.error ||
    classes.error ||
    locations.error
  )
    throw new Error(configurationError);

  return {
    schoolName: settings.data.school_name,
    shortName: settings.data.short_name,
    motto: settings.data.motto,
    updatedAt: settings.data.updated_at,
    currentYear: currentYear.data?.name ?? "Not selected",
    currentTerm: currentTerm.data?.name ?? "Not selected",
    activeClasses: classes.count ?? 0,
    activeLocations: locations.count ?? 0,
  };
}
