"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, LoaderCircle, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  approveTermRateConfiguration,
  prepareTermRateDraft,
} from "@/features/settings/server/term-rate-actions";
import type {
  TermRateConfiguration,
  TermRateDomain,
} from "@/types/term-rate-configuration";
import { cn } from "@/lib/utils";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TermRateWorkflow({
  canManage,
  configuration,
  domain,
  isCurrentTerm,
  termId,
  termLabel,
}: {
  canManage: boolean;
  configuration: TermRateConfiguration;
  domain: TermRateDomain;
  isCurrentTerm: boolean;
  termId: number;
  termLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const noun = domain === "school_fees" ? "school fees" : "Books & Prospectus";
  const isFutureTerm = !isCurrentTerm;
  const isEditableApprovedCurrentTerm =
    isCurrentTerm && configuration.status === "approved";
  const statusLabel = isFutureTerm
    ? "Locked"
    : configuration.status === "approved"
      ? "Approved"
      : configuration.status === "draft"
        ? "Draft"
        : "Not started";

  function run(action: "prepare" | "approve") {
    setMessage("");
    startTransition(async () => {
      const result = await (action === "prepare"
        ? prepareTermRateDraft({ academicTermId: termId, domain })
        : approveTermRateConfiguration({ academicTermId: termId, domain }));
      setMessage(result.message);
      if (result.ok) {
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <section
      className="panel p-5 sm:p-6"
      aria-label={`${termLabel} ${noun} workflow`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{termLabel}</h3>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full",
                configuration.status === "approved" &&
                  "bg-success-soft text-success",
                configuration.status === "draft" &&
                  "bg-warning-soft text-warning",
                isFutureTerm && "bg-muted text-muted-foreground",
              )}
            >
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isFutureTerm
              ? `${noun === "school fees" ? "Student fees" : noun} for this future term are locked. They will open when the term becomes current.`
              : isEditableApprovedCurrentTerm
                ? domain === "school_fees"
                  ? "Approved for billing. Current-term student fees remain editable; issued invoices keep their original amounts."
                  : "Approved for billing. Current-term Books & Prospectus prices remain editable; generated student charges keep their original amounts."
                : configuration.status === "approved"
                  ? `These ${noun} are locked and available for billing.`
                  : configuration.status === "draft"
                    ? `Review and edit the copied ${noun}. Approve only when every amount is ready for billing.`
                    : configuration.previousTermLabel
                      ? `Copy ${configuration.previousTermLabel} into an editable draft for this term.`
                      : `Create an editable ${noun} draft for this term.`}
          </p>
          {configuration.sourceTermLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Copied from {configuration.sourceTermLabel}
            </p>
          ) : null}
          {configuration.approvedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Approved {dateTime.format(new Date(configuration.approvedAt))}
            </p>
          ) : null}
        </div>

        {canManage &&
        !isFutureTerm &&
        configuration.status === "not_started" ? (
          <Button
            type="button"
            onClick={() => run("prepare")}
            disabled={pending}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Copy />}
            {configuration.previousTermLabel
              ? "Copy previous term"
              : "Create draft"}
          </Button>
        ) : null}

        {canManage && !isFutureTerm && configuration.status === "draft" ? (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button type="button" disabled={pending}>
                <CheckCircle2 /> Approve rates
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[min(94vw,34rem)]">
              <DialogHeader>
                <DialogTitle>
                  Approve {noun} for {termLabel}?
                </DialogTitle>
                <DialogDescription>
                  Approval makes this configuration available for billing. While
                  this term remains current, prices can still be corrected;
                  existing invoices or charges keep their original amounts.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border bg-muted/35 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <LockKeyhole className="size-4 text-primary" /> Final review
                </p>
                <p className="mt-2 text-muted-foreground">
                  Check every class, location and term amount before making the
                  rates available for billing.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Continue editing
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={() => run("approve")}
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  Approve for billing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
      {message ? (
        <p className="mt-4 text-sm font-medium" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
