"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserMinus } from "lucide-react";
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
import { removeStaffFromSchool } from "../server/actions";

const today = new Date().toISOString().slice(0, 10);

export function StaffRemovalAction({
  staffId,
  staffName,
  staffNumber,
}: {
  staffId: number;
  staffName: string;
  staffNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmed =
    confirmation.trim().toLowerCase() === staffNumber.toLowerCase();
  const canSubmit =
    confirmed && reason.trim().length >= 5 && Boolean(effectiveOn);

  function changeOpen(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      if (outcome?.ok) router.refresh();
      setOutcome(null);
      setConfirmation("");
      setReason("");
      setEffectiveOn(today);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);
    startTransition(async () => {
      const result = await removeStaffFromSchool({
        staffId,
        effectiveOn,
        reason,
        confirmationStaffNumber: confirmation,
      });
      setOutcome(result);
    });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-danger-soft hover:text-destructive"
        >
          <UserMinus /> Remove
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Remove {staffName} from active staff?</DialogTitle>
          <DialogDescription>
            This ends active employment operations without erasing posted
            financial or audit history.
          </DialogDescription>
        </DialogHeader>
        {outcome?.ok ? (
          <div className="px-6 py-5">
            <p className="text-sm leading-6 text-success" role="status">
              {outcome.message}
            </p>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={submit}
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="rounded-lg border border-destructive/20 bg-danger-soft p-4 text-sm leading-6">
                <p className="font-semibold text-destructive">
                  Review these effects before continuing
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Active class assignments and salary setup will end.</li>
                  <li>
                    Unpaid salary calculations with no cash activity will be
                    reversed.
                  </li>
                  <li>
                    Paid salaries, deductions, expenses and audit records will
                    remain available.
                  </li>
                </ul>
              </div>
              <FormField
                id={`staff-removal-date-${staffId}`}
                label="Employment end date"
                required
              >
                <Input
                  id={`staff-removal-date-${staffId}`}
                  type="date"
                  max={today}
                  value={effectiveOn}
                  onChange={(event) => setEffectiveOn(event.target.value)}
                  required
                />
              </FormField>
              <FormField
                id={`staff-removal-reason-${staffId}`}
                label="Reason"
                description="Stored in the staff, salary and audit history."
                required
              >
                <textarea
                  id={`staff-removal-reason-${staffId}`}
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  required
                />
              </FormField>
              <FormField
                id={`staff-removal-confirm-${staffId}`}
                label={`Type ${staffNumber} to confirm`}
                required
              >
                <Input
                  id={`staff-removal-confirm-${staffId}`}
                  autoComplete="off"
                  spellCheck={false}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </FormField>
              {outcome && (
                <p className="text-sm text-destructive" role="alert">
                  {outcome.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={!canSubmit || pending}
              >
                {pending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <UserMinus />
                )}
                {pending ? "Removing…" : "Remove from active staff"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {outcome?.ok && (
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Done</Button>
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
