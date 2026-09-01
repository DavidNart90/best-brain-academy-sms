"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  academicTermInputSchema,
  academicYearInputSchema,
  classInputSchema,
  currentAcademicContextSchema,
  locationInputSchema,
  schoolSettingsInputSchema,
} from "../schemas";

export type ConfigurationActionResult = {
  ok: boolean;
  message: string;
};

const denied: ConfigurationActionResult = {
  ok: false,
  message: "Your account cannot change school configuration.",
};

function databaseMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "The change could not be saved.";
  if (error.code === "23505")
    return "That name, code, sequence or display order is already in use.";
  if (error.code === "23503")
    return "This record is linked to unavailable configuration.";
  if (error.code === "23514")
    return error.message?.includes("term") || error.message?.includes("Term")
      ? error.message
      : "The dates or status conflict with the current academic configuration.";
  if (error.code === "42501") return denied.message;
  return "The change could not be saved. Review the values and try again.";
}

function refreshConfiguration() {
  revalidatePath("/classes");
  revalidatePath("/settings/academics");
  revalidatePath("/settings/school");
}

async function canManageConfiguration() {
  return requirePermission("settings.manage");
}

export async function saveAcademicYear(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = academicYearInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the academic year.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    name: parsed.data.name,
    short_name: parsed.data.shortName,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase
        .from("academic_years")
        .update(values)
        .eq("id", parsed.data.id)
    : await supabase.from("academic_years").insert({
        ...values,
        created_by: context.id,
      });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return {
    ok: true,
    message: parsed.data.id ? "Academic year updated." : "Academic year added.",
  };
}

export async function saveAcademicTerm(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = academicTermInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the term schedule.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    academic_year_id: parsed.data.academicYearId,
    name: parsed.data.name,
    sequence: parsed.data.sequence,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase
        .from("academic_terms")
        .update(values)
        .eq("id", parsed.data.id)
    : await supabase.from("academic_terms").insert({
        ...values,
        created_by: context.id,
      });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return {
    ok: true,
    message: parsed.data.id ? "Term schedule updated." : "Term added.",
  };
}

export async function saveClass(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = classInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the class.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    code: parsed.data.code,
    name: parsed.data.name,
    class_group: parsed.data.classGroup,
    sort_order: parsed.data.sortOrder,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase.from("classes").update(values).eq("id", parsed.data.id)
    : await supabase
        .from("classes")
        .insert({ ...values, created_by: context.id });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return {
    ok: true,
    message: parsed.data.id ? "Class updated." : "Class added.",
  };
}

export async function saveLocation(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = locationInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the location.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    code: parsed.data.code,
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase
        .from("school_locations")
        .update(values)
        .eq("id", parsed.data.id)
    : await supabase
        .from("school_locations")
        .insert({ ...values, created_by: context.id });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return {
    ok: true,
    message: parsed.data.id ? "Location updated." : "Location added.",
  };
}

export async function saveSchoolSettings(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = schoolSettingsInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the school details.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("school_settings")
    .update({
      school_name: parsed.data.schoolName,
      short_name: parsed.data.shortName,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      motto: parsed.data.motto,
      location_charge_label: parsed.data.locationChargeLabel,
      updated_by: context.id,
    })
    .eq("id", 1);
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return { ok: true, message: "School settings updated." };
}

export async function setCurrentAcademicContext(
  input: unknown,
): Promise<ConfigurationActionResult> {
  const context = await canManageConfiguration();
  if (!context) return denied;
  const parsed = currentAcademicContextSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Choose a scheduled academic year and term." };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("set_current_academic_context", {
    target_year_id: parsed.data.academicYearId,
    target_term_id: parsed.data.academicTermId,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshConfiguration();
  return { ok: true, message: "Current academic context updated." };
}
