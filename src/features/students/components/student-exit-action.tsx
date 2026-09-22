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
import { endStudentActiveStatus } from "../server/actions";

const today = new Date().toISOString().slice(0, 10);

export function StudentExitAction({
  studentId,
  studentName,
  admissionNumber,
}: {
  studentId: number;
  studentName: string;
  admissionNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exitStatus, setExitStatus] = useState<
    "inactive" | "graduated" | "withdrawn"
  >("withdrawn");
  const [effectiveOn, setEffectiveOn] = useState(today);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmed =
    confirmation.trim().toLowerCase() === admissionNumber.toLowerCase();
  const canSubmit =
    confirmed && reason.trim().length >= 5 && Boolean(effectiveOn);

  function changeOpen(nextOpen: boolean) {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      if (outcome?.ok) router.refresh();
      setExitStatus("withdrawn");
      setEffectiveOn(today);
      setReason("");
      setConfirmation("");
      setOutcome(null);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);
    startTransition(async () => {
      const result = await endStudentActiveStatus({
        studentId,
        exitStatus,
        effectiveOn,
        reason,
        confirmationAdmissionNumber: confirmation,
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
          <UserMinus /> End status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>End {studentName}&apos;s active status?</DialogTitle>
          <DialogDescription>
            The student leaves active enrollment and no longer contributes open
            school-fee expectations or balances.
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
                  <li>The active enrollment will end on the selected date.</li>
                  <li>
                    Unpaid and partially paid fee invoices will be cancelled and
                    removed from expected/outstanding totals.
                  </li>
                  <li>
                    Paid invoices, payments, receipts and audit history will
                    remain available.
                  </li>
                </ul>
              </div>
              <FormField
                id={`student-exit-status-${studentId}`}
                label="Final student status"
                required
              >
                <select
                  id={`student-exit-status-${studentId}`}
                  className="native-select"
                  value={exitStatus}
                  onChange={(event) =>
                    setExitStatus(
                      event.target.value as
                        "inactive" | "graduated" | "withdrawn",
                    )
                  }
                >
                  <option value="withdrawn">Withdrawn</option>
                  <option value="graduated">Graduated</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
              <FormField
                id={`student-exit-date-${studentId}`}
                label="Effective date"
                required
              >
                <Input
                  id={`student-exit-date-${studentId}`}
                  type="date"
                  max={today}
                  value={effectiveOn}
                  onChange={(event) => setEffectiveOn(event.target.value)}
                  required
                />
              </FormField>
              <FormField
                id={`student-exit-reason-${studentId}`}
                label="Reason"
                description="Stored with the student, invoice cancellations and audit history."
                required
              >
                <textarea
                  id={`student-exit-reason-${studentId}`}
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  required
                />
              </FormField>
              <FormField
                id={`student-exit-confirm-${studentId}`}
                label={`Type ${admissionNumber} to confirm`}
                required
              >
                <Input
                  id={`student-exit-confirm-${studentId}`}
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
                {pending ? "Ending status…" : "End active status"}
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
