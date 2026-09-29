"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdministratorEmailEditor({
  userId,
  email,
  currentEmail,
  confirmed,
  pending,
  onChange,
  onSave,
}: {
  userId: string;
  email: string;
  currentEmail: string;
  confirmed: boolean;
  pending: boolean;
  onChange: (email: string) => void;
  onSave: () => void;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const helpId = `email-help-${userId}`;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`email-${userId}`}>
        Login email
      </label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          id={`email-${userId}`}
          type="email"
          autoComplete="off"
          spellCheck={false}
          value={email}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={helpId}
        />
        <Button
          type="button"
          onClick={onSave}
          disabled={
            !confirmed ||
            pending ||
            !normalizedEmail ||
            normalizedEmail === currentEmail.toLowerCase()
          }
        >
          {pending && <LoaderCircle className="animate-spin" />} Save email
        </Button>
      </div>
      <p id={helpId} className="text-xs text-muted-foreground">
        Updates the sign-in email immediately. The password stays the same.
      </p>
    </div>
  );
}
