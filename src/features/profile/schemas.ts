import { z } from "zod";

export const accountProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter the name shown in the application.")
    .max(120, "Use no more than 120 characters."),
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => value?.trim() ?? "")
    .pipe(
      z
        .string()
        .max(40, "Use no more than 40 characters.")
        .refine(
          (value) => !value || value.length >= 7,
          "Enter a valid phone number.",
        ),
    )
    .transform((value) => value || null),
});

export type AccountProfileInput = z.infer<typeof accountProfileSchema>;
export type AccountProfileFormValues = z.input<typeof accountProfileSchema>;
