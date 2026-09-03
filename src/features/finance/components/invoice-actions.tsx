"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileStack, LoaderCircle, Plus, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateTermInvoices, cancelInvoiceAction } from "../server/actions";

export function GenerateInvoicesPanel() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [pending, setPending] = useState<"bulk" | "single" | null>(null);
  const [message, setMessage] = useState("");
  const [skipped, setSkipped] = useState<
    Array<{ studentId: number; reason: string }>
  >([]);

  async function run(mode: "bulk" | "single") {
    setPending(mode);
    setMessage("");
    setSkipped([]);
    try {
      const result = await generateTermInvoices({
        studentId: mode === "single" ? studentId : "",
      });
      setMessage(result.message);
      setSkipped(result.result?.skipped ?? []);
      if (result.ok) router.refresh();
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh before trying again.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="panel p-5" aria-labelledby="generate-invoices-title">
      <h2 id="generate-invoices-title" className="text-base font-semibold">
        Generate term invoices
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Creates one invoice per actively enrolled student for the current
        academic term. Students who already have an active invoice, or whose
        class/location has no configured rate, are skipped and listed below.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Button
          type="button"
          onClick={() => void run("bulk")}
          disabled={pending !== null}
        >
          {pending === "bulk" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <FileStack />
          )}{" "}
          Generate for current term
        </Button>
        <FormField id="single-student-id" label="Or generate for one student">
          <Input
            id="single-student-id"
            inputMode="numeric"
            placeholder="Student ID"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-40"
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          onClick={() => void run("single")}
          disabled={pending !== null || !studentId}
        >
          {pending === "single" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Plus />
          )}{" "}
          Generate for student
        </Button>
      </div>
      {message && (
        <p className="mt-3 text-sm font-medium" role="status">
          {message}
        </p>
      )}
      {skipped.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {skipped.slice(0, 10).map((item, index) => (
            <li key={`${item.studentId}-${index}`}>
              Student #{item.studentId}: {item.reason}
            </li>
          ))}
          {skipped.length > 10 && <li>…and {skipped.length - 10} more.</li>}
        </ul>
      )}
    </section>
  );
}

export function CancelInvoiceForm({ invoiceId }: { invoiceId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const result = await cancelInvoiceAction({ invoiceId, reason });
      setMessage(result.message);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh before trying again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!open)
    return (
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="text-destructive"
          onClick={() => setOpen(true)}
        >
          <X /> Cancel invoice
        </Button>
        {message && (
          <p className="text-sm font-medium" role="status">
            {message}
          </p>
        )}
      </div>
    );

  return (
    <form onSubmit={submit} className="panel border-dashed p-4">
      <FormField
        id="cancel-reason"
        label="Cancellation reason"
        required
        description="Required. The invoice is retained and marked cancelled, never deleted."
      >
        <Input
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          minLength={2}
        />
      </FormField>
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          className="text-destructive"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <X />} Confirm
          cancellation
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Keep invoice
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-sm font-medium" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
