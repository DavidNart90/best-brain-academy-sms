import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() ?? "")
    .pipe(z.string().max(maximum))
    .transform((value) => value || null);
const optionalDate = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => value || null);
const optionalId = z
  .union([
    z.coerce.number().int().positive(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => (typeof value === "number" ? value : null));
const requiredName = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(80);

export const staffTypes = ["teaching", "non_teaching"] as const;
export const staffStatuses = ["active", "inactive", "archived"] as const;

export const staffInputSchema = z
  .object({
    staffNumber: z
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
    phone: z.string().trim().min(7, "Enter a valid phone number.").max(40),
    email: z
      .union([
        z.literal(""),
        z.email("Enter a valid email."),
        z.null(),
        z.undefined(),
      ])
      .transform((value) => value || null),
    staffType: z.enum(staffTypes, { error: "Choose a staff type." }),
    position: z.string().trim().min(2, "Position is required.").max(120),
    status: z.enum(["active", "inactive"], { error: "Choose a status." }),
    dateJoined: optionalDate,
    academicYearId: optionalId,
    academicTermId: optionalId,
    classId: optionalId,
    assignmentStartedOn: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.classId && (!value.academicYearId || !value.academicTermId)) {
      context.addIssue({
        code: "custom",
        path: ["classId"],
        message: "Choose the academic year and term for this class.",
      });
    }
  });

export const staffListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", ...staffStatuses]).catch("active"),
  staffType: z.enum(["all", ...staffTypes]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});

export const staffAssignmentSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  academicYearId: z.coerce.number().int().positive(),
  academicTermId: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive(),
  startedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid start date."),
});
export const endStaffAssignmentSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  assignmentId: z.coerce.number().int().positive(),
  endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid end date."),
});
export const staffIdSchema = z.coerce.number().int().positive();
export const importModeSchema = z.enum(["preview", "confirm"]);

export type StaffInput = z.infer<typeof staffInputSchema>;
export type StaffFormValues = z.input<typeof staffInputSchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
