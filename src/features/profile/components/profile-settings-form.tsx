"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  accountProfileSchema,
  type AccountProfileFormValues,
} from "../schemas";
import { saveOwnProfile, type ProfileActionResult } from "../server/actions";
import type { AccountProfile } from "../types";

export function ProfileSettingsForm({ profile }: { profile: AccountProfile }) {
  const router = useRouter();
  const [result, setResult] = useState<ProfileActionResult | null>(null);
  const form = useForm<AccountProfileFormValues>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      displayName: profile.displayName,
      phone: profile.phone ?? "",
    },
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={form.handleSubmit(
        async (values) => {
          setResult(null);
          const outcome = await saveOwnProfile(values);
          setResult(outcome);
          if (outcome.ok) router.refresh();
        },
        () =>
          setResult({
            ok: false,
            message: "Review the highlighted fields and try again.",
          }),
      )}
    >
      <FormField
        id="profile-display-name"
        label="Display name"
        required
        description="This name appears in the application and on future activity records."
        error={form.formState.errors.displayName?.message}
      >
        <Input
          id="profile-display-name"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.displayName)}
          aria-describedby={
            form.formState.errors.displayName
              ? "profile-display-name-error"
              : undefined
          }
          {...form.register("displayName")}
        />
      </FormField>

      <FormField
        id="profile-phone"
        label="Phone number"
        description="Optional. Used as the contact number on your staff account."
        error={form.formState.errors.phone?.message}
      >
        <Input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="e.g. 024 000 0000"
          aria-invalid={Boolean(form.formState.errors.phone)}
          aria-describedby={
            form.formState.errors.phone ? "profile-phone-error" : undefined
          }
          {...form.register("phone")}
        />
      </FormField>

      <div className="field">
        <label className="text-sm font-medium" htmlFor="profile-email">
          Email address
        </label>
        <Input
          id="profile-email"
          type="email"
          value={profile.email}
          readOnly
          aria-readonly="true"
          className="bg-muted/55 text-muted-foreground"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Your sign-in email is controlled by a Super Administrator.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save aria-hidden="true" />
          {form.formState.isSubmitting ? "Saving…" : "Save profile"}
        </Button>
        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            className={
              result.ok ? "text-sm text-success" : "text-sm text-destructive"
            }
          >
            {result.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
