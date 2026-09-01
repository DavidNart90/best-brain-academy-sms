import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { studentListQuerySchema } from "../schemas";
import type {
  StudentDirectoryRow,
  StudentPageResult,
  StudentReferenceData,
  StudentProfile,
} from "../types";

const studentLoadError =
  "Student records could not be loaded. Try again or contact an administrator.";
const directoryColumns =
  "id,admission_number,first_name,last_name,full_name,gender,admission_date,status,guardian_name,guardian_phone,academic_year_id,academic_year_name,academic_term_id,academic_term_name,class_id,class_name,school_location_id,school_location_name,has_disability,disability_details,religious_denomination,created_at";

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeSearchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapDirectoryRow(row: Record<string, unknown>): StudentDirectoryRow {
  return {
    id: Number(row.id),
    admissionNumber: String(row.admission_number),
    fullName: String(row.full_name),
    gender: row.gender === "male" ? "male" : "female",
    admissionDate: String(row.admission_date),
    status: row.status as StudentDirectoryRow["status"],
    guardianName: String(row.guardian_name ?? "—"),
    guardianPhone: String(row.guardian_phone ?? "—"),
    academicYearId: Number(row.academic_year_id),
    academicYearName: String(row.academic_year_name),
    academicTermId: Number(row.academic_term_id),
    academicTermName: String(row.academic_term_name),
    classId: Number(row.class_id),
    className: String(row.class_name),
    schoolLocationId: Number(row.school_location_id),
    schoolLocationName: String(row.school_location_name),
    hasDisability: row.has_disability === true,
    disabilityDetails: row.disability_details
      ? String(row.disability_details)
      : null,
    religiousDenomination: String(row.religious_denomination),
  };
}

export async function getStudentReferenceData(): Promise<StudentReferenceData> {
  const supabase = await createServerSupabaseClient();
  const [years, terms, classes, locations] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id,name,is_current")
      .eq("status", "active")
      .order("starts_on", { ascending: false })
      .limit(25),
    supabase
      .from("academic_terms")
      .select("id,academic_year_id,name,is_current")
      .eq("status", "active")
      .order("academic_year_id", { ascending: false })
      .order("sequence")
      .limit(100),
    supabase
      .from("classes")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
    supabase
      .from("school_locations")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
  ]);
  if (years.error || terms.error || classes.error || locations.error)
    throw new Error(studentLoadError);
  return {
    academicYears: years.data.map((year) => ({
      id: year.id,
      name: year.name,
      isCurrent: year.is_current,
    })),
    academicTerms: terms.data.map((term) => ({
      id: term.id,
      academicYearId: term.academic_year_id,
      name: term.name,
      isCurrent: term.is_current,
    })),
    classes: classes.data,
    locations: locations.data,
  };
}

export async function getStudentPage(
  rawQuery: Record<string, string | string[] | undefined>,
): Promise<StudentPageResult> {
  const query = studentListQuerySchema.parse({
    q: firstQueryValue(rawQuery.q),
    status: firstQueryValue(rawQuery.status),
    gender: firstQueryValue(rawQuery.gender),
    classId: firstQueryValue(rawQuery.classId),
    academicYearId: firstQueryValue(rawQuery.academicYearId),
    page: firstQueryValue(rawQuery.page),
    sort: firstQueryValue(rawQuery.sort),
    direction: firstQueryValue(rawQuery.direction),
  });
  const pageSize = 25;
  const offset = (query.page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("student_directory")
    .select(directoryColumns, { count: "exact" });
  const search = safeSearchTerm(query.q);
  if (search)
    request = request.or(
      `admission_number.ilike.%${search}%,full_name.ilike.%${search}%,guardian_phone.ilike.%${search}%`,
    );
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.gender !== "all") request = request.eq("gender", query.gender);
  if (query.classId) request = request.eq("class_id", query.classId);
  if (query.academicYearId)
    request = request.eq("academic_year_id", query.academicYearId);
  const ascending = query.direction === "asc";
  if (query.sort === "admission")
    request = request.order("admission_number", { ascending });
  else if (query.sort === "newest")
    request = request.order("created_at", { ascending });
  else {
    request = request.order("last_name", { ascending });
    request = request.order("first_name", { ascending });
  }
  const [result, allCount] = await Promise.all([
    request.order("id", { ascending }).range(offset, offset + pageSize - 1),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);
  if (result.error || allCount.error) throw new Error(studentLoadError);
  return {
    rows: (result.data as Array<Record<string, unknown>>).map(mapDirectoryRow),
    total: result.count ?? 0,
    allTotal: allCount.count ?? 0,
    page: query.page,
    pageSize,
    query,
  };
}

export async function getStudentExportRows(
  rawQuery: Record<string, string | string[] | undefined>,
) {
  const query = studentListQuerySchema.parse({
    q: firstQueryValue(rawQuery.q),
    status: firstQueryValue(rawQuery.status),
    gender: firstQueryValue(rawQuery.gender),
    classId: firstQueryValue(rawQuery.classId),
    academicYearId: firstQueryValue(rawQuery.academicYearId),
    sort: firstQueryValue(rawQuery.sort),
    direction: firstQueryValue(rawQuery.direction),
  });
  const supabase = await createServerSupabaseClient();
  let request = supabase.from("student_directory").select(directoryColumns);
  const search = safeSearchTerm(query.q);
  if (search)
    request = request.or(
      `admission_number.ilike.%${search}%,full_name.ilike.%${search}%,guardian_phone.ilike.%${search}%`,
    );
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.gender !== "all") request = request.eq("gender", query.gender);
  if (query.classId) request = request.eq("class_id", query.classId);
  if (query.academicYearId)
    request = request.eq("academic_year_id", query.academicYearId);
  const result = await request
    .order("last_name")
    .order("first_name")
    .order("id")
    .limit(5000);
  if (result.error) throw new Error(studentLoadError);
  return (result.data as Array<Record<string, unknown>>).map(mapDirectoryRow);
}

export async function getStudentProfile(
  studentId: number,
): Promise<StudentProfile | null> {
  const supabase = await createServerSupabaseClient();
  const student = await supabase
    .from("students")
    .select(
      "id,admission_number,first_name,middle_name,last_name,gender,date_of_birth,admission_date,status,previous_school,notes,has_disability,disability_details,religious_denomination,photo_path",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (student.error) throw new Error(studentLoadError);
  if (!student.data) return null;

  const [links, enrollments] = await Promise.all([
    supabase
      .from("student_guardians")
      .select("id,guardian_id,relationship,is_primary")
      .eq("student_id", studentId)
      .order("is_primary", { ascending: false })
      .order("id"),
    supabase
      .from("student_enrollments")
      .select(
        "id,academic_year_id,academic_term_id,class_id,school_location_id,status,started_on,ended_on",
      )
      .eq("student_id", studentId)
      .order("started_on", { ascending: false })
      .order("id", { ascending: false }),
  ]);
  if (links.error || enrollments.error) throw new Error(studentLoadError);
  const guardianIds = links.data.map((link) => link.guardian_id);
  const enrollmentRows = enrollments.data;
  const [guardians, years, terms, classes, locations] = await Promise.all([
    guardianIds.length
      ? supabase
          .from("guardians")
          .select("id,full_name,primary_phone,alternative_phone,email,address")
          .in("id", guardianIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("academic_years")
      .select("id,name")
      .in(
        "id",
        enrollmentRows.map((row) => row.academic_year_id),
      ),
    supabase
      .from("academic_terms")
      .select("id,name")
      .in(
        "id",
        enrollmentRows.map((row) => row.academic_term_id),
      ),
    supabase
      .from("classes")
      .select("id,name")
      .in(
        "id",
        enrollmentRows.map((row) => row.class_id),
      ),
    supabase
      .from("school_locations")
      .select("id,name")
      .in(
        "id",
        enrollmentRows.map((row) => row.school_location_id),
      ),
  ]);
  if (
    guardians.error ||
    years.error ||
    terms.error ||
    classes.error ||
    locations.error
  )
    throw new Error(studentLoadError);
  const guardianById = new Map(guardians.data.map((row) => [row.id, row]));
  const names = (rows: Array<{ id: number; name: string }>) =>
    new Map(rows.map((row) => [row.id, row.name]));
  const yearNames = names(years.data);
  const termNames = names(terms.data);
  const classNames = names(classes.data);
  const locationNames = names(locations.data);
  const row = student.data;
  return {
    id: row.id,
    admissionNumber: row.admission_number,
    fullName: [row.first_name, row.middle_name, row.last_name]
      .filter(Boolean)
      .join(" "),
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    gender: row.gender === "male" ? "male" : "female",
    dateOfBirth: row.date_of_birth,
    admissionDate: row.admission_date,
    status: row.status as StudentProfile["status"],
    previousSchool: row.previous_school,
    notes: row.notes,
    hasDisability: row.has_disability,
    disabilityDetails: row.disability_details,
    religiousDenomination: row.religious_denomination,
    hasPhoto: Boolean(row.photo_path),
    guardians: links.data.flatMap((link) => {
      const guardian = guardianById.get(link.guardian_id);
      return guardian
        ? [
            {
              id: guardian.id,
              fullName: guardian.full_name,
              relationship: link.relationship,
              primaryPhone: guardian.primary_phone,
              alternativePhone: guardian.alternative_phone,
              email: guardian.email,
              address: guardian.address,
              isPrimary: link.is_primary,
            },
          ]
        : [];
    }),
    enrollments: enrollmentRows.map((enrollment) => ({
      id: enrollment.id,
      academicYearName:
        yearNames.get(enrollment.academic_year_id) ?? "Unknown year",
      academicTermName:
        termNames.get(enrollment.academic_term_id) ?? "Unknown term",
      className: classNames.get(enrollment.class_id) ?? "Unknown class",
      studentLocationName:
        locationNames.get(enrollment.school_location_id) ?? "Unknown location",
      status:
        enrollment.status as StudentProfile["enrollments"][number]["status"],
      startedOn: enrollment.started_on,
      endedOn: enrollment.ended_on,
    })),
  };
}
