import { z } from "zod";

const idSchema = z.coerce.number().int().positive();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid calendar date.");
const optionalDateSchema = z
  .union([dateSchema, z.literal(""), z.null()])
  .transform((value) => value || null);
const statusSchema = z.enum(["active", "archived"]);

export const academicYearInputSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(3).max(32),
    shortName: z.string().trim().min(3).max(16),
    startsOn: dateSchema,
    endsOn: dateSchema,
    status: statusSchema.default("active"),
  })
  .refine((value) => value.startsOn < value.endsOn, {
    message: "The academic year must end after it starts.",
    path: ["endsOn"],
  });

export const academicTermInputSchema = z
  .object({
    id: idSchema.optional(),
    academicYearId: idSchema,
    name: z.string().trim().min(2).max(40),
    sequence: z.coerce.number().int().min(1).max(12),
    startsOn: optionalDateSchema,
    endsOn: optionalDateSchema,
    status: statusSchema.default("active"),
  })
  .superRefine((value, context) => {
    if ((value.startsOn === null) !== (value.endsOn === null)) {
      context.addIssue({
        code: "custom",
        message: "Set both the start and end date, or leave both unscheduled.",
        path: [value.startsOn ? "endsOn" : "startsOn"],
      });
    }
    if (value.startsOn && value.endsOn && value.startsOn > value.endsOn) {
      context.addIssue({
        code: "custom",
        message: "The term must end on or after its start date.",
        path: ["endsOn"],
      });
    }
  });

export const classGroups = [
  "early_years",
  "lower_basic",
  "upper_basic",
  "jhs",
] as const;

export const classInputSchema = z.object({
  id: idSchema.optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_]{2,20}$/,
      "Use 2–20 uppercase letters, numbers or underscores.",
    ),
  name: z.string().trim().min(2).max(80),
  classGroup: z.enum(classGroups),
  sortOrder: z.coerce.number().int().min(1).max(999),
  status: statusSchema.default("active"),
});

export const locationInputSchema = z.object({
  id: idSchema.optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_]{2,32}$/,
      "Use 2–32 uppercase letters, numbers or underscores.",
    ),
  name: z.string().trim().min(2).max(120),
  sortOrder: z.coerce.number().int().min(1).max(999),
  status: statusSchema.default("active"),
});

const optionalTrimmedString = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

export const schoolSettingsInputSchema = z.object({
  schoolName: z.string().trim().min(2).max(160),
  shortName: optionalTrimmedString(40),
  address: optionalTrimmedString(500),
  phone: optionalTrimmedString(40),
  email: z
    .union([z.literal(""), z.email()])
    .transform((value) => value || null),
  motto: optionalTrimmedString(160),
  locationChargeLabel: z.string().trim().min(2).max(80),
});

export const currentAcademicContextSchema = z.object({
  academicYearId: idSchema,
  academicTermId: idSchema,
});

export const classListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", "active", "archived"]).catch("active"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type AcademicYearInput = z.infer<typeof academicYearInputSchema>;
export type AcademicTermInput = z.infer<typeof academicTermInputSchema>;
export type ClassInput = z.infer<typeof classInputSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type SchoolSettingsInput = z.infer<typeof schoolSettingsInputSchema>;
export type CurrentAcademicContextInput = z.infer<
  typeof currentAcademicContextSchema
>;
export type AcademicYearFormValues = z.input<typeof academicYearInputSchema>;
export type AcademicTermFormValues = z.input<typeof academicTermInputSchema>;
export type ClassFormValues = z.input<typeof classInputSchema>;
export type LocationFormValues = z.input<typeof locationInputSchema>;
export type SchoolSettingsFormValues = z.input<
  typeof schoolSettingsInputSchema
>;
export type CurrentAcademicContextFormValues = z.input<
  typeof currentAcademicContextSchema
>;
