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
