import { z } from "zod";

export const administratorRoles = [
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "ACCOUNTANT",
  "MANAGEMENT",
] as const;
export const administratorStatuses = ["active", "disabled"] as const;

const temporaryPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol.");

export const administratorInvitationSchema = z.object({
  displayName: z.string().trim().min(2, "Enter the full name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() ?? "")
    .pipe(
      z
        .string()
        .max(40)
        .refine(
          (value) => !value || value.length >= 7,
          "Enter a valid phone number.",
        ),
    )
    .transform((value) => value || null),
  role: z.enum(administratorRoles, { error: "Choose a role." }),
  status: z.enum(administratorStatuses, { error: "Choose a status." }),
  temporaryPassword: temporaryPasswordSchema,
});
export const administratorInvitationBatchSchema = z
  .array(administratorInvitationSchema)
  .min(1)
  .max(100);
export const administratorListQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", "pending", ...administratorStatuses]).catch("all"),
  role: z.enum(["all", ...administratorRoles]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
});
export const administratorRoleChangeSchema = z.object({
  userId: z.uuid(),
  role: z.enum(administratorRoles),
});
export const administratorStatusChangeSchema = z.object({
  userId: z.uuid(),
  status: z.enum(administratorStatuses),
});
export const administratorImportModeSchema = z.enum(["preview", "confirm"]);

export type AdministratorInvitation = z.infer<
  typeof administratorInvitationSchema
>;
export type AdministratorInvitationForm = z.input<
  typeof administratorInvitationSchema
>;
export type AdministratorListQuery = z.infer<
  typeof administratorListQuerySchema
>;
