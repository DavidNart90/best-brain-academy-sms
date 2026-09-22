"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileStack,
  LoaderCircle,
  RotateCcw,
  WalletCards,
} from "lucide-react";
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
  generateLibraryCharges,
  recordLibraryCollection,
  reverseLibraryCollection,
  saveLibraryRate,
} from "../server/actions";
import type {
  LibraryChargeRow,
  LibraryPaymentMethod,
  LibraryRateRow,
} from "../types";

export function LibraryRateForm({
  rate,
  academicTermId,
}: {
  rate: LibraryRateRow;
  academicTermId: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"chargeable" | "not_charged">(
    rate.status === "not_charged" ? "not_charged" : "chargeable",
  );
  const [amount, setAmount] = useState(rate.amount ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await saveLibraryRate({
        academicTermId,
        classId: rate.classId,
        chargeStatus: mode,
        amount,
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="min-w-[21rem]">
      <div className="flex items-center justify-end gap-2">
        <select
          aria-label={`${rate.className} charge status`}
          className="native-select h-9 w-36"
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as "chargeable" | "not_charged")
          }
          disabled={pending}
        >
          <option value="chargeable">Charge amount</option>
          <option value="not_charged">Not charged</option>
        </select>
        {mode === "chargeable" && (
          <Input
            aria-label={`${rate.className} amount in GHS`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="h-9 w-28 text-right"
            required
            disabled={pending}
          />
        )}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />} Save
        </Button>
      </div>
      {message && (
        <p
          className="mt-1 text-right text-xs text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}

export function GenerateLibraryChargesButton({
  academicTermId,
  disabled = false,
}: {
  academicTermId: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run() {
    setMessage("");
    startTransition(async () => {
      const result = await generateLibraryCharges({ academicTermId });
      const skipped = result.skipped?.length ?? 0;
      setMessage(
        skipped > 0
          ? `${result.message} ${skipped} student${skipped === 1 ? " was" : "s were"} skipped.`
          : result.message,
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {message && (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
      <Button type="button" onClick={run} disabled={pending || disabled}>
        {pending ? <LoaderCircle className="animate-spin" /> : <FileStack />}
        {pending ? "Generating…" : "Generate term charges"}
      </Button>
    </div>
  );
}

export function LibraryCollectionDialog({
  charge,
  paymentMethods,
}: {
  charge: LibraryChargeRow;
  paymentMethods: LibraryPaymentMethod[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [message, setMessage] = useState("");
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const selectedMethod = paymentMethods.find(
    (method) => String(method.id) === methodId,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      chargeId: charge.id,
      amount: String(form.get("amount") ?? ""),
      businessDate: String(form.get("businessDate") ?? ""),
      paymentMethodId: methodId,
      externalReference: String(form.get("externalReference") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    setPending(true);
    setMessage("");
    try {
      const result = await recordLibraryCollection({
        ...input,
        requestKey: retry.current.key,
      });
      setMessage(result.message);
      if (result.ok) {
        retry.current = null;
        router.refresh();
      }
    } catch {
      setMessage(
        "The result could not be confirmed. Retry without changing the details.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMessage("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={Number(charge.outstanding) <= 0}>
          <WalletCards /> Record
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,38rem)]">
        <DialogHeader>
          <DialogTitle>Record Library collection</DialogTitle>
          <DialogDescription>
            {charge.studentName} · {charge.admissionNumber} · {charge.className}
            . The current Library balance is GHS {charge.outstanding}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <fieldset
            disabled={pending}
            className="grid gap-4 px-6 py-5 sm:grid-cols-2"
          >
            <FormField
              id={`library-amount-${charge.id}`}
              label="Amount (GHS)"
              required
            >
              <Input
                id={`library-amount-${charge.id}`}
                name="amount"
                inputMode="decimal"
                defaultValue={charge.outstanding}
                required
              />
            </FormField>
            <FormField
              id={`library-date-${charge.id}`}
              label="Collection date"
              required
            >
              <Input
                id={`library-date-${charge.id}`}
                name="businessDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </FormField>
            <FormField
              id={`library-method-${charge.id}`}
              label="Payment method"
              required
            >
              <select
                id={`library-method-${charge.id}`}
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
                    {method.requiresReference ? " · reference required" : ""}
                  </option>
                ))}
              </select>
            </FormField>
            {selectedMethod?.requiresReference && (
              <FormField
                id={`library-reference-${charge.id}`}
                label="External reference"
                required
              >
                <Input
                  id={`library-reference-${charge.id}`}
                  name="externalReference"
                  maxLength={120}
                  required
                />
              </FormField>
            )}
            <FormField
              id={`library-notes-${charge.id}`}
              label="Notes (optional)"
              className="sm:col-span-2"
            >
              <Input
                id={`library-notes-${charge.id}`}
                name="notes"
                maxLength={500}
              />
            </FormField>
            {message && (
              <p
                className={`flex items-start gap-2 text-sm sm:col-span-2 ${message.includes("recorded") ? "text-success" : "text-destructive"}`}
                role="status"
              >
                {message.includes("recorded") ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                )}
                {message}
              </p>
            )}
          </fieldset>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {pending ? "Recording…" : "Record collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LibraryReversalDialog({
  collectionId,
  collectionNumber,
}: {
  collectionId: number;
  collectionNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const retry = useRef<{ payload: string; key: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "");
    const payload = JSON.stringify({ collectionId, reason });
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    setPending(true);
    setMessage("");
    try {
      const result = await reverseLibraryCollection({
        requestKey: retry.current.key,
        collectionId,
        reason,
      });
      setMessage(result.message);
      if (result.ok) {
        retry.current = null;
        router.refresh();
        setOpen(false);
      }
    } catch {
      setMessage(
        "The reversal could not be confirmed. Retry the same request.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <RotateCcw /> Reverse
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,36rem)]">
        <DialogHeader>
          <DialogTitle>Reverse Library collection</DialogTitle>
          <DialogDescription>
            {collectionNumber} will remain in the history with a permanent
            reversal reference.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="px-6 py-5">
            <FormField
              id={`library-reason-${collectionId}`}
              label="Reason"
              required
            >
              <Input
                id={`library-reason-${collectionId}`}
                name="reason"
                minLength={2}
                maxLength={500}
                required
              />
            </FormField>
            {message && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep collection
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              Confirm reversal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
