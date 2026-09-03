import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { staffListQuerySchema } from "../schemas";
import type {
  StaffDirectoryRow,
  StaffPageResult,
  StaffProfile,
  StaffReferenceData,
} from "../types";

const loadError =
  "Staff records could not be loaded. Try again or contact an administrator.";
const directoryColumns =
  "id,staff_number,first_name,middle_name,last_name,full_name,phone,email,staff_type,position,status,date_joined,assigned_classes,known_subjects,created_at";
const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const safeSearch = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s@.+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function mapRow(row: Record<string, unknown>): StaffDirectoryRow {
  return {
    id: Number(row.id),
    staffNumber: String(row.staff_number),
    fullName: String(row.full_name),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    staffType: row.staff_type === "non_teaching" ? "non_teaching" : "teaching",
    position: String(row.position),
    status: row.status as StaffDirectoryRow["status"],
    dateJoined: row.date_joined ? String(row.date_joined) : null,
    assignedClasses: String(row.assigned_classes ?? ""),
    knownSubjects: Array.isArray(row.known_subjects)
      ? row.known_subjects.map(String)
      : [],
  };
}

export async function getStaffReferenceData(): Promise<StaffReferenceData> {
  const supabase = await createServerSupabaseClient();
  const [years, terms, classes] = await Promise.all([
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
  ]);
  if (years.error || terms.error || classes.error) throw new Error(loadError);
  return {
    academicYears: years.data.map((row) => ({
      id: row.id,
      name: row.name,
      isCurrent: row.is_current,
    })),
    academicTerms: terms.data.map((row) => ({
      id: row.id,
      academicYearId: row.academic_year_id,
      name: row.name,
      isCurrent: row.is_current,
    })),
    classes: classes.data,
  };
}

export async function getStaffPage(
  raw: Record<string, string | string[] | undefined>,
): Promise<StaffPageResult> {
  const query = staffListQuerySchema.parse({
    q: firstValue(raw.q),
    status: firstValue(raw.status),
    staffType: firstValue(raw.staffType),
    page: firstValue(raw.page),
  });
  const pageSize = 25;
  const offset = (query.page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("staff_directory")
    .select(directoryColumns, { count: "exact" });
  const search = safeSearch(query.q);
  if (search)
    request = request.or(
      `staff_number.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`,
    );
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.staffType !== "all")
    request = request.eq("staff_type", query.staffType);
  const [result, allCount] = await Promise.all([
    request
      .order("full_name")
      .order("id")
      .range(offset, offset + pageSize - 1),
    supabase.from("staff").select("id", { count: "exact", head: true }),
  ]);
  if (result.error || allCount.error) throw new Error(loadError);
  return {
    rows: (result.data as Array<Record<string, unknown>>).map(mapRow),
    total: result.count ?? 0,
    allTotal: allCount.count ?? 0,
    page: query.page,
    pageSize,
    query,
  };
}

export async function getStaffExportRows(
  raw: Record<string, string | string[] | undefined>,
) {
  const query = staffListQuerySchema.parse({
    q: firstValue(raw.q),
    status: firstValue(raw.status),
    staffType: firstValue(raw.staffType),
  });
  const supabase = await createServerSupabaseClient();
  let request = supabase.from("staff_directory").select(directoryColumns);
  const search = safeSearch(query.q);
  if (search)
    request = request.or(
      `staff_number.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`,
    );
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.staffType !== "all")
    request = request.eq("staff_type", query.staffType);
  const result = await request.order("full_name").order("id").limit(5000);
  if (result.error) throw new Error(loadError);
  return (result.data as Array<Record<string, unknown>>).map(mapRow);
}

export async function getStaffProfile(
  staffId: number,
): Promise<StaffProfile | null> {
  const supabase = await createServerSupabaseClient();
  const member = await supabase
    .from("staff")
    .select(
      "id,staff_number,recorded_name,first_name,middle_name,last_name,phone,email,staff_type,position,status,date_joined,date_of_birth,known_subjects,created_at,updated_at,created_by,updated_by",
    )
    .eq("id", staffId)
    .maybeSingle();
  if (member.error) throw new Error(loadError);
  if (!member.data) return null;
  const assignments = await supabase
    .from("staff_assignments")
    .select(
      "id,academic_year_id,academic_term_id,class_id,status,started_on,ended_on,assignment_kind,subject_name",
    )
    .eq("staff_id", staffId)
    .order("started_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);
  if (assignments.error) throw new Error(loadError);
  const ids = <T>(rows: T[], key: keyof T) => [
    ...new Set(rows.map((row) => Number(row[key]))),
  ];
  const [years, terms, classes, profiles] = await Promise.all([
    assignments.data.length
      ? supabase
          .from("academic_years")
          .select("id,name")
          .in("id", ids(assignments.data, "academic_year_id"))
      : Promise.resolve({ data: [], error: null }),
    assignments.data.length
      ? supabase
          .from("academic_terms")
          .select("id,name")
          .in("id", ids(assignments.data, "academic_term_id"))
      : Promise.resolve({ data: [], error: null }),
    assignments.data.length
      ? supabase
          .from("classes")
          .select("id,name")
          .in("id", ids(assignments.data, "class_id"))
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", [member.data.created_by, member.data.updated_by]),
  ]);
  if (years.error || terms.error || classes.error || profiles.error)
    throw new Error(loadError);
  const names = (rows: Array<{ id: number; name: string }>) =>
    new Map(rows.map((row) => [row.id, row.name]));
  const profileNames = new Map(
    profiles.data.map((row) => [row.id, row.display_name]),
  );
  const row = member.data;
  return {
    ...mapRow({
      ...row,
      full_name:
        row.recorded_name ??
        [row.first_name, row.middle_name, row.last_name]
          .filter(Boolean)
          .join(" "),
      assigned_classes: assignments.data
        .filter((item) => item.status === "active")
        .map((item) => names(classes.data).get(item.class_id))
        .filter(Boolean)
        .join(", "),
    }),
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: profileNames.get(row.created_by) || "Authorized administrator",
    updatedBy: profileNames.get(row.updated_by) || "Authorized administrator",
    assignments: assignments.data.map((item) => ({
      id: item.id,
      academicYearName:
        names(years.data).get(item.academic_year_id) ?? "Unknown year",
      academicTermName:
        names(terms.data).get(item.academic_term_id) ?? "Unknown term",
      className: names(classes.data).get(item.class_id) ?? "Unknown class",
      assignmentKind:
        item.assignment_kind === "teaching"
          ? "teaching"
          : item.assignment_kind === "head"
            ? "head"
            : "general",
      subjectName: item.subject_name,
      status: item.status === "completed" ? "completed" : "active",
      startedOn: item.started_on,
      endedOn: item.ended_on,
    })),
  };
}
