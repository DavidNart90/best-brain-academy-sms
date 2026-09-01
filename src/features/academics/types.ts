import type { Tables } from "@/types/database";

export type AcademicYear = Tables<"academic_years">;
export type AcademicTerm = Tables<"academic_terms">;
export type SchoolClass = Tables<"classes">;
export type SchoolLocation = Tables<"school_locations">;
export type SchoolSettings = Tables<"school_settings">;
export type AuditLog = Tables<"audit_logs">;

export type AcademicConfiguration = {
  years: AcademicYear[];
  terms: AcademicTerm[];
  classes: SchoolClass[];
  locations: SchoolLocation[];
  settings: SchoolSettings;
  audit: AuditLog[];
};

export const classGroupLabels: Record<SchoolClass["class_group"], string> = {
  early_years: "Early Years",
  lower_basic: "Lower Basic",
  upper_basic: "Upper Basic",
  jhs: "Junior High School",
};
