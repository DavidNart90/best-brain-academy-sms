import { z } from "zod";

const publicEnvironmentSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "https:" && !url.hostname.includes("_")) ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  }, "Supabase requires HTTPS, except on loopback test hosts."),
  publishableKey: z
    .string()
    .regex(/^sb_publishable_[A-Za-z0-9_-]{10,}$/)
    .refine((value) => !/REPLACE|YOUR_/i.test(value)),
});

export function parsePublicEnvironment(input: unknown) {
  const result = publicEnvironmentSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function getPublicEnvironment() {
  return parsePublicEnvironment({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
