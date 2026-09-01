import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { classListQuerySchema } from "../schemas";
import type {
  AcademicConfiguration,
  AcademicTerm,
  AcademicYear,
  AuditLog,
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
) {
  const query = classListQuerySchema.parse({
    q: Array.isArray(rawQuery.q) ? rawQuery.q[0] : rawQuery.q,
    status: Array.isArray(rawQuery.status)
      ? rawQuery.status[0]
      : rawQuery.status,
    page: Array.isArray(rawQuery.page) ? rawQuery.page[0] : rawQuery.page,
  });
  const pageSize = 25;
  const offset = (query.page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("classes")
    .select(
      "id,code,name,class_group,sort_order,status,created_by,updated_by,created_at,updated_at",
      {
        count: "exact",
      },
    );
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.q) {
    const safePattern = query.q.replace(/[\\%_]/g, "\\$&");
    request = request.ilike("name", `%${safePattern}%`);
  }
  const result = await request
    .order("sort_order")
    .order("id")
    .range(offset, offset + pageSize - 1);
  if (result.error) throw new Error(configurationError);
  return {
    rows: result.data as SchoolClass[],
    total: result.count ?? 0,
    page: query.page,
    pageSize,
    query,
  };
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
