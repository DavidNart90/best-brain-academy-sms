"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { Check, Circle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from "@/features/auth/schemas";

type ChangeResponse = { error?: string; next?: string };

const rules = [
  {
    label: "8 or more characters",
    matches: (value: string) => value.length >= 8,
  },
  {
    label: "Uppercase and lowercase letters",
    matches: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  },
  {
    label: "At least one number",
    matches: (value: string) => /[0-9]/.test(value),
  },
  {
    label: "At least one symbol",
    matches: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

function PasswordField({
  id,
  label,
  error,
  autoComplete,
  registration,
}: {
  id: string;
  label: string;
  error?: string;
  autoComplete: string;
  registration: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="h-11 pr-12"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        <button
          type="button"
          className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const newPassword = useWatch({ control, name: "newPassword" }) ?? "";

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const response = await fetch("/api/auth/change-password", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          const result = (await response.json()) as ChangeResponse;
          if (!response.ok || !result.next) {
            setError(result.error ?? "Your password could not be changed.");
            return;
          }
          window.location.assign(result.next);
        } catch {
          setError("Your password could not be changed. Please try again.");
        }
      })}
    >
      <PasswordField
        id="current-password"
        label="Temporary password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        registration={register("currentPassword")}
      />
      <PasswordField
        id="new-password"
        label="New password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        registration={register("newPassword")}
      />

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/45 p-3 sm:grid-cols-2">
        {rules.map((rule) => {
          const met = rule.matches(newPassword);
          return (
            <span
              key={rule.label}
              className={
                met
                  ? "flex items-center gap-2 text-xs text-success"
                  : "flex items-center gap-2 text-xs text-muted-foreground"
              }
            >
              {met ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Circle size={10} aria-hidden="true" />
              )}
              {rule.label}
            </span>
          );
        })}
      </div>

      <PasswordField
        id="confirm-password"
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        registration={register("confirmPassword")}
      />

      <AnimatePresence initial={false}>
        {error && (
          <m.p
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            role="alert"
            className="rounded-md bg-danger-soft p-3 text-sm leading-5 text-destructive"
          >
            {error}
          </m.p>
        )}
      </AnimatePresence>

      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
        {isSubmitting ? "Securing account…" : "Set new password"}
      </Button>
    </form>
  );
}
