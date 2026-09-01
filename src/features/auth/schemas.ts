import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().max(254),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password is too long."),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResult = { error: string | null };

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a symbol.");

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your temporary password.")
      .max(128),
    newPassword: strongPassword,
    confirmPassword: z.string().max(128),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password you have not just used.",
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
