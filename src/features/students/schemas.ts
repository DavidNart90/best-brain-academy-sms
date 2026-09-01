import { z } from "zod";

const idSchema = z.coerce
  .number()
  .int()
  .positive("Choose an available option.");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid calendar date.");
const optionalDateSchema = z
  .union([dateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => value || null);
const optionalText = (maximum: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() ?? "")
    .pipe(z.string().max(maximum))
    .transform((value) => value || null);
const requiredName = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(80, `${label} must be 80 characters or fewer.`);

export const studentStatuses = [
  "active",
  "inactive",
  "graduated",
  "withdrawn",
] as const;
export const studentGenders = ["female", "male"] as const;

export const studentInputSchema = z
  .object({
    admissionNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9][A-Z0-9/-]{2,39}$/,
        "Use 3–40 letters, numbers, slashes or hyphens.",
      ),
    firstName: requiredName("First name"),
    middleName: optionalText(80),
    lastName: requiredName("Last name"),
    gender: z.enum(studentGenders, { error: "Choose a gender." }),
    dateOfBirth: optionalDateSchema,
    admissionDate: dateSchema,
    status: z.enum(studentStatuses, { error: "Choose a student status." }),
    hasDisability: z
      .union([z.enum(["yes", "no"]), z.boolean()], {
        error: "Choose Yes or No for disability status.",
      })
      .transform((value) =>
        typeof value === "boolean" ? value : value === "yes",
      ),
    disabilityDetails: optionalText(500),
    religiousDenomination: z
      .string({ error: "Religious denomination is required." })
      .trim()
      .min(2, "Religious denomination is required.")
      .max(120, "Religious denomination must be 120 characters or fewer."),
    previousSchool: optionalText(160),
    notes: optionalText(1000),
    guardianName: z
      .string()
      .trim()
      .min(2, "Guardian name is required.")
      .max(160),
    guardianRelationship: z
      .string()
      .trim()
      .min(2, "Guardian relationship is required.")
      .max(60),
    guardianPhone: z
      .string()
      .trim()
      .min(7, "Enter a valid guardian phone number.")
      .max(40),
    guardianAlternativePhone: optionalText(40),
    guardianEmail: z
      .union([
        z.literal(""),
        z.email("Enter a valid guardian email."),
        z.null(),
      ])
      .transform((value) => value || null),
    guardianAddress: optionalText(500),
    academicYearId: idSchema,
    academicTermId: idSchema,
    classId: idSchema,
    schoolLocationId: idSchema,
  })
  .superRefine((value, context) => {
    if (
      value.dateOfBirth &&
      value.admissionDate &&
      value.dateOfBirth > value.admissionDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth cannot be after the admission date.",
      });
    }
    if (value.hasDisability && !value.disabilityDetails) {
      context.addIssue({
        code: "custom",
        path: ["disabilityDetails"],
        message: "State the disability when Yes is selected.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    disabilityDetails: value.hasDisability ? value.disabilityDetails : null,
  }));

export const studentListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", ...studentStatuses]).catch("active"),
  gender: z.enum(["all", ...studentGenders]).catch("all"),
  classId: z.coerce.number().int().positive().optional().catch(undefined),
  academicYearId: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  sort: z.enum(["name", "admission", "newest"]).catch("name"),
  direction: z.enum(["asc", "desc"]).catch("asc"),
});

export const importModeSchema = z.enum(["preview", "confirm"]);

export const studentIdSchema = z.coerce.number().int().positive();

export const guardianLinkSchema = z.object({
  studentId: studentIdSchema,
  fullName: z.string().trim().min(2, "Guardian name is required.").max(160),
  relationship: z.string().trim().min(2, "Relationship is required.").max(60),
  primaryPhone: z.string().trim().min(7, "Enter a valid phone number.").max(40),
  alternativePhone: optionalText(40),
  email: z
    .union([z.literal(""), z.email("Enter a valid email."), z.null()])
    .transform((value) => value || null),
  address: optionalText(500),
  isPrimary: z.boolean(),
});

export const enrollmentChangeSchema = z.object({
  studentId: studentIdSchema,
  academicYearId: idSchema,
  academicTermId: idSchema,
  classId: idSchema,
  schoolLocationId: idSchema,
  startedOn: dateSchema,
});

export type StudentInput = z.infer<typeof studentInputSchema>;
export type StudentFormValues = z.input<typeof studentInputSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type GuardianLinkInput = z.infer<typeof guardianLinkSchema>;
export type GuardianLinkFormValues = z.input<typeof guardianLinkSchema>;
export type EnrollmentChangeInput = z.infer<typeof enrollmentChangeSchema>;
export type EnrollmentChangeFormValues = z.input<typeof enrollmentChangeSchema>;
