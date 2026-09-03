import { z } from "zod";

const optionalText = (maximum: number) =>
  z
    .string()
    .nullish()
    .transform((value) => value?.trim() || null)
    .pipe(z.string().max(maximum).nullable());
const date = z.iso.date("Choose a valid calendar date.");
const optionalDate = optionalText(10).pipe(date.nullable());
const subject = z.string().trim().min(1).max(120);
export const subjectListSchema = z
  .union([
    z.string().transform((value) =>
      value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
    z.array(subject),
  ])
  .pipe(z.array(subject).max(30))
  .default([])
  .refine(
    (values) =>
      new Set(values.map((value) => value.toLowerCase())).size ===
      values.length,
    "List each subject once.",
  );
export const staffTypes = ["teaching", "non_teaching"] as const;
export const staffStatuses = ["active", "inactive", "archived"] as const;
export const requestKeySchema = z.uuid("A valid request key is required.");
export const assignmentKinds = ["teaching", "head", "general"] as const;
export const assignmentDetailsSchema = z
  .object({
    academicYearId: z.coerce.number().int().positive(),
    academicTermId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive(),
    startedOn: date,
    assignmentKind: z.enum(assignmentKinds),
    subjectName: optionalText(120),
  })
  .superRefine((value, context) => {
    if (value.assignmentKind === "teaching" && !value.subjectName)
      context.addIssue({
        code: "custom",
        path: ["subjectName"],
        message: "Enter the subject, or All subjects.",
      });
    if (value.assignmentKind !== "teaching" && value.subjectName)
      context.addIssue({
        code: "custom",
        path: ["subjectName"],
        message: "Head/class links do not imply a teaching subject.",
      });
  });

export const staffInputSchema = z
  .object({
    staffNumber: optionalText(40).pipe(
      z
        .string()
        .regex(
          /^BBS-Staff-\d{3,12}$/,
          "Use BBS-Staff-001 format, or leave blank for automatic numbering.",
        )
        .nullable(),
    ),
    fullName: optionalText(242),
    firstName: optionalText(80),
    middleName: optionalText(80),
    lastName: optionalText(80),
    phone: optionalText(40).pipe(
      z
        .string()
        .min(7, "Enter a valid phone number, or leave it blank.")
        .nullable(),
    ),
    email: optionalText(254).pipe(z.email("Enter a valid email.").nullable()),
    staffType: z.enum(staffTypes),
    position: z.string().trim().min(2, "Position is required.").max(120),
    status: z.enum(["active", "inactive"]),
    dateJoined: optionalDate,
    knownSubjects: subjectListSchema,
    assignments: z.array(assignmentDetailsSchema).max(100).default([]),
  })
  .superRefine((value, context) => {
    if (!value.fullName && (!value.firstName || !value.lastName))
      context.addIssue({
        code: "custom",
        path: ["fullName"],
        message:
          "Enter the full name as supplied, or both first and last name.",
      });
    if (
      value.staffType === "non_teaching" &&
      (value.knownSubjects.length || value.assignments.length)
    )
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message:
          "Non-teaching staff cannot have subjects or classroom assignments.",
      });
    if (value.status !== "active" && value.assignments.length)
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Only active staff can receive assignments.",
      });
    const pairs = value.assignments.map((item) =>
      [
        item.academicYearId,
        item.academicTermId,
        item.classId,
        item.assignmentKind,
        item.subjectName?.toLowerCase(),
      ].join("|"),
    );
    if (new Set(pairs).size !== pairs.length)
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message:
          "Each class, subject and assignment role must be listed only once.",
      });
  });

export const staffListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", ...staffStatuses]).catch("active"),
  staffType: z.enum(["all", ...staffTypes]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export const staffAssignmentSchema = assignmentDetailsSchema.and(
  z.object({ staffId: z.coerce.number().int().positive() }),
);
export const endStaffAssignmentSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  assignmentId: z.coerce.number().int().positive(),
  endedOn: date,
});
export const staffIdSchema = z.coerce.number().int().positive();
export const importModeSchema = z.enum(["preview", "confirm"]);
export const staffUpdateSchema = z
  .object({
    staffId: staffIdSchema,
    fullName: optionalText(242),
    firstName: optionalText(80),
    middleName: optionalText(80),
    lastName: optionalText(80),
    phone: optionalText(40).pipe(
      z
        .string()
        .min(7, "Enter a valid phone number, or leave it blank.")
        .nullable(),
    ),
    email: optionalText(254).pipe(z.email("Enter a valid email.").nullable()),
    position: z.string().trim().min(2, "Position is required.").max(120),
    status: z.enum(["active", "inactive"]),
    dateJoined: optionalDate,
    dateOfBirth: optionalDate,
    knownSubjects: subjectListSchema,
  })
  .superRefine((value, context) => {
    if (!value.fullName && (!value.firstName || !value.lastName))
      context.addIssue({
        code: "custom",
        path: ["fullName"],
        message:
          "Enter the full name as supplied, or both first and last name.",
      });
    if (
      value.dateOfBirth &&
      value.dateJoined &&
      value.dateOfBirth > value.dateJoined
    )
      context.addIssue({
        code: "custom",
        path: ["dateOfBirth"],
        message: "Date of birth must be before the date joined.",
      });
  });
export type StaffInput = z.infer<typeof staffInputSchema>;
export type StaffFormValues = z.input<typeof staffInputSchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
export type StaffAssignmentInput = z.infer<typeof staffAssignmentSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
export type StaffUpdateFormValues = z.input<typeof staffUpdateSchema>;
