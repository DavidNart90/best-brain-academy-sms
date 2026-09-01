"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  administratorInvitationSchema,
  type AdministratorInvitation,
  type AdministratorInvitationForm,
} from "../schemas";

export function AdministratorInviteDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm<
    AdministratorInvitationForm,
    unknown,
    AdministratorInvitation
  >({
    resolver: zodResolver(administratorInvitationSchema),
    mode: "onBlur",
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      role: "ADMINISTRATOR",
      status: "active",
      temporaryPassword: "",
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const response = await fetch("/api/administrators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ administrators: [values] }),
    });
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;
    setMessage(result?.message ?? "The account could not be created.");
    if (response.ok && result?.ok) form.reset();
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMessage("");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserRoundPlus /> Add Administrator
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,42rem)]">
        <DialogHeader>
          <DialogTitle>Add administrator</DialogTitle>
          <DialogDescription>
            Create a school login with one role and a temporary password. The
            administrator must replace it at first sign-in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
            <FormField
              id="administrator-name"
              label="Full name"
              required
              error={errors.displayName?.message}
              className="sm:col-span-2"
            >
              <Input
                id="administrator-name"
                autoComplete="name"
                aria-invalid={!!errors.displayName}
                {...form.register("displayName")}
              />
            </FormField>
            <FormField
              id="administrator-email"
              label="Email"
              required
              error={errors.email?.message}
            >
              <Input
                id="administrator-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
            </FormField>
            <FormField
              id="administrator-phone"
              label="Phone"
              error={errors.phone?.message}
            >
              <Input
                id="administrator-phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                {...form.register("phone")}
              />
            </FormField>
            <FormField id="administrator-role" label="Role" required>
              <select
                id="administrator-role"
                className="native-select"
                {...form.register("role")}
              >
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="MANAGEMENT">Management</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
            </FormField>
            <FormField id="administrator-status" label="Status" required>
              <select
                id="administrator-status"
                className="native-select"
                {...form.register("status")}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </FormField>
            <FormField
              id="administrator-temporary-password"
              label="Temporary password"
              required
              error={errors.temporaryPassword?.message}
              className="sm:col-span-2"
            >
              <Input
                id="administrator-temporary-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.temporaryPassword}
                {...form.register("temporaryPassword")}
              />
            </FormField>
            <div className="flex gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:col-span-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                Share the temporary password through a trusted channel. No OTP
                or invitation email is sent, and the password is never shown in
                the administrator directory.
              </p>
            </div>
            {message && (
              <p
                className="text-sm text-muted-foreground sm:col-span-2"
                role="status"
              >
                {message}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <LoaderCircle className="animate-spin" />
              )}
              {form.formState.isSubmitting
                ? "Creating account…"
                : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
