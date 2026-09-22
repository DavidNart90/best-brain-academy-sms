"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Money } from "@/components/data-display/money";
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
import { Label } from "@/components/ui/label";
import { dispatchSalaryBatch, postSalaryBatch } from "../server/salary-actions";
import type { SalaryPaymentMethod } from "../types";

type Outcome = { ok: boolean; message: string } | null;

type SalaryBulkActionsProps = {
  payrollMonth: string;
  configuredCount: number;
  postEligibleCount: number;
  postGrossTotal: string;
  activeSalaryCount: number;
  dispatchEligibleCount: number;
  dispatchOutstandingTotal: string;
  paymentMethods: SalaryPaymentMethod[];
};

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthName(value: string) {
  return monthFormatter.format(new Date(`${value}T00:00:00Z`));
}

function Notice({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null;
  return (
    <p
      className={`flex items-start gap-2 text-sm font-medium ${outcome.ok ? "text-success" : "text-destructive"}`}
      role={outcome.ok ? "status" : "alert"}
    >
      {outcome.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      {outcome.message}
    </p>
  );
}

function FormField({
  id,
  label,
  required = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function PostSalaryBatchAction({
  payrollMonth,
  eligibleCount,
  skippedCount,
  grossTotal,
}: {
  payrollMonth: string;
  eligibleCount: number;
  skippedCount: number;
  grossTotal: string;
}) {
  const router = useRouter();
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const input = { payrollMonth };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await postSalaryBatch({
        ...input,
        requestKey: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        setOpen(false);
        router.refresh();
      }
    } catch {
      setOutcome({
        ok: false,
        message:
          "The result could not be confirmed. Retry unchanged to check safely.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 1 · Calculate
          </p>
          <h3 className="mt-1 font-semibold">Post all salaries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {eligibleCount} eligible · <Money value={grossTotal} /> gross. This
            does not pay employees or reduce cash.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={eligibleCount === 0}>
              <FileCheck2 />
              {eligibleCount > 0 ? "Post all salaries" : "All salaries posted"}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(94vw,36rem)]">
            <DialogHeader>
              <DialogTitle>
                Post all salaries for {monthName(payrollMonth)}?
              </DialogTitle>
              <DialogDescription>
                This snapshots configured gross salaries and applies active
                automatic deductions. It does not mark anyone paid.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit}>
              <div className="space-y-4 px-6 py-5">
                <dl className="grid gap-3 rounded-lg border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Staff to post</dt>
                    <dd className="mt-1 font-semibold">{eligibleCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gross total</dt>
                    <dd className="mt-1 font-semibold">
                      <Money value={grossTotal} />
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Already posted</dt>
                    <dd className="mt-1 font-semibold">
                      {skippedCount} {skippedCount === 1 ? "record" : "records"}{" "}
                      will be skipped
                    </dd>
                  </div>
                </dl>
                <Notice outcome={outcome} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <FileCheck2 />
                  )}
                  {pending
                    ? "Posting…"
                    : `Post ${eligibleCount} ${eligibleCount === 1 ? "salary" : "salaries"}`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {!open && <Notice outcome={outcome} />}
      </div>
    </div>
  );
}

function DispatchSalaryBatchAction({
  payrollMonth,
  unpostedCount,
  eligibleCount,
  skippedCount,
  outstandingTotal,
  paymentMethods,
}: {
  payrollMonth: string;
  unpostedCount: number;
  eligibleCount: number;
  skippedCount: number;
  outstandingTotal: string;
  paymentMethods: SalaryPaymentMethod[];
}) {
  const router = useRouter();
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [methodId, setMethodId] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const selectedMethod = paymentMethods.find(
    (method) => String(method.id) === methodId,
  );
  const canDispatch =
    unpostedCount === 0 && eligibleCount > 0 && paymentMethods.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const input = {
      payrollMonth,
      businessDate,
      paymentMethodId: methodId,
      externalReference: String(form.get("externalReference") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await dispatchSalaryBatch({
        ...input,
        requestKey: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        setOpen(false);
        router.refresh();
      }
    } catch {
      setOutcome({
        ok: false,
        message:
          "The result could not be confirmed. Retry unchanged to check safely.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const triggerLabel =
    unpostedCount > 0
      ? "Post all first"
      : eligibleCount > 0
        ? "Dispatch all salaries"
        : "All salaries dispatched";

  return (
    <div className="border-t p-4 sm:border-t-0">
      <div className="flex items-start gap-3">
        <Send className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step 2 · Pay
          </p>
          <h3 className="mt-1 font-semibold">Dispatch all salaries</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {eligibleCount} outstanding · <Money value={outstandingTotal} /> net
            pay. Employee SSNIT withheld from gross salary is remitted
            separately.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next && !businessDate)
              setBusinessDate(new Date().toISOString().slice(0, 10));
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant={unpostedCount > 0 ? "outline" : "default"}
              disabled={!canDispatch}
            >
              <Send />
              {triggerLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(94vw,38rem)]">
            <DialogHeader>
              <DialogTitle>
                Dispatch all salaries for {monthName(payrollMonth)}?
              </DialogTitle>
              <DialogDescription>
                This records each employee&apos;s full remaining net pay as a
                cash expense. The whole batch succeeds or no payment is
                recorded.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit}>
              <fieldset
                disabled={pending}
                className="grid gap-4 px-6 py-5 sm:grid-cols-2"
              >
                <div className="rounded-lg border bg-muted/25 p-4 text-sm sm:col-span-2">
                  <div className="flex flex-wrap justify-between gap-3">
                    <span className="text-muted-foreground">
                      {eligibleCount} employee payments
                    </span>
                    <strong>
                      <Money value={outstandingTotal} />
                    </strong>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {skippedCount} fully paid{" "}
                    {skippedCount === 1 ? "record" : "records"} will be skipped.
                    SSNIT remittance is not included in the employee payment.
                  </p>
                </div>
                <FormField id="salary-batch-date" label="Payment date" required>
                  <Input
                    id="salary-batch-date"
                    name="businessDate"
                    type="date"
                    value={businessDate}
                    onChange={(event) => setBusinessDate(event.target.value)}
                    required
                  />
                </FormField>
                <FormField
                  id="salary-batch-method"
                  label="Payment method"
                  required
                >
                  <select
                    id="salary-batch-method"
                    name="paymentMethodId"
                    className="native-select"
                    value={methodId}
                    onChange={(event) => setMethodId(event.target.value)}
                    required
                  >
                    <option value="">Choose method</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                        {method.requiresReference
                          ? " · reference required"
                          : ""}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  id="salary-batch-reference"
                  label={`Batch reference${selectedMethod?.requiresReference ? "" : " (optional)"}`}
                  required={selectedMethod?.requiresReference}
                >
                  <Input
                    id="salary-batch-reference"
                    name="externalReference"
                    maxLength={120}
                    required={selectedMethod?.requiresReference}
                  />
                </FormField>
                <FormField id="salary-batch-notes" label="Notes (optional)">
                  <Input id="salary-batch-notes" name="notes" maxLength={500} />
                </FormField>
                <div className="sm:col-span-2">
                  <Notice outcome={outcome} />
                </div>
              </fieldset>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={pending || !methodId || !businessDate}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  {pending ? "Dispatching…" : "Dispatch all"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {!open && <Notice outcome={outcome} />}
      </div>
    </div>
  );
}

export function SalaryBulkActions({
  payrollMonth,
  configuredCount,
  postEligibleCount,
  postGrossTotal,
  activeSalaryCount,
  dispatchEligibleCount,
  dispatchOutstandingTotal,
  paymentMethods,
}: SalaryBulkActionsProps) {
  return (
    <section className="panel p-5" aria-labelledby="salary-monthly-actions">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <h2 id="salary-monthly-actions" className="text-base font-semibold">
            Monthly salary actions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete {monthName(payrollMonth)} in two controlled steps. Each
            step is atomic, retry-safe and skips work already completed.
          </p>
        </div>
      </div>
      <div className="mt-5 grid overflow-hidden rounded-lg border sm:grid-cols-2 sm:divide-x">
        <PostSalaryBatchAction
          payrollMonth={payrollMonth}
          eligibleCount={postEligibleCount}
          skippedCount={Math.max(configuredCount - postEligibleCount, 0)}
          grossTotal={postGrossTotal}
        />
        <DispatchSalaryBatchAction
          payrollMonth={payrollMonth}
          unpostedCount={postEligibleCount}
          eligibleCount={dispatchEligibleCount}
          skippedCount={Math.max(activeSalaryCount - dispatchEligibleCount, 0)}
          outstandingTotal={dispatchOutstandingTotal}
          paymentMethods={paymentMethods}
        />
      </div>
    </section>
  );
}
