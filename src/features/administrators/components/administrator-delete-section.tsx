"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAdministratorAccount } from "../server/actions";
import type { AdministratorDirectoryRow } from "../types";

export function AdministratorDeleteSection({
  account,
}: {
  account: AdministratorDirectoryRow;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const canDelete =
    confirmation.trim().toLowerCase() === account.email.toLowerCase();

  function runDelete() {
    setOutcome(null);
    startTransition(async () => {
      const result = await deleteAdministratorAccount({
        userId: account.userId,
        confirmationEmail: confirmation,
      });
      setOutcome(result);
    });
  }

  return (
    <section
      className="rounded-lg border border-destructive/20 bg-danger-soft p-4"
      aria-labelledby={`delete-account-${account.userId}`}
    >
      <div className="flex items-start gap-3">
        <Trash2
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3
            id={`delete-account-${account.userId}`}
            className="text-sm font-semibold text-destructive"
          >
            Delete account
          </h3>
          <p
            id={`delete-account-help-${account.userId}`}
            className="mt-1 text-xs leading-5 text-muted-foreground"
          >
            This permanently removes the login, profile and role. Type the email
            below to confirm. Accounts linked to school or audit records must be
            disabled instead.
          </p>
          <label
            className="mt-3 block text-xs font-medium"
            htmlFor={`delete-confirmation-${account.userId}`}
          >
            Type {account.email}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id={`delete-confirmation-${account.userId}`}
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-describedby={`delete-account-help-${account.userId}`}
            />
            <Button
              type="button"
              variant="destructive"
              onClick={runDelete}
              disabled={!canDelete || pending}
            >
              {pending && <LoaderCircle className="animate-spin" />}
              Delete account
            </Button>
          </div>
          {outcome && (
            <p
              role={outcome.ok ? "status" : "alert"}
              className={
                outcome.ok
                  ? "mt-3 text-sm text-success"
                  : "mt-3 text-sm text-destructive"
              }
            >
              {outcome.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
