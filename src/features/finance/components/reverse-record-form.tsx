"use client";

import { useState } from "react";
import { LoaderCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reverseFinanceAction } from "../server/actions";

type Operation =
  | "reverse_school_fee_payment"
  | "reverse_feeding_receipt"
  | "reverse_admission_receipt"
  | "reverse_misc_receipt"
  | "void_expense";

export function ReverseRecordForm({
  operation,
  recordId,
}: {
  operation: Operation;
  recordId: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const requestKey = crypto.randomUUID();
    const result = await reverseFinanceAction(operation, {
      requestKey,
      requestFingerprint: `${operation}:${recordId}:${reason.trim()}`,
      recordId,
      reason,
    });
    setMessage(result.message);
    if (result.ok) setOpen(false);
    setPending(false);
  }

  if (!open)
    return (
      <div className="flex items-center gap-2">
        {message && (
          <span className="text-xs text-muted-foreground" role="status">
            {message}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {operation === "void_expense" ? <X /> : <RotateCcw />}
          {operation === "void_expense" ? "Void" : "Reverse"}
        </Button>
      </div>
    );

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end justify-end gap-2"
    >
      <label className="sr-only" htmlFor={`reason-${operation}-${recordId}`}>
        Reason
      </label>
      <Input
        id={`reason-${operation}-${recordId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason"
        minLength={2}
        maxLength={500}
        required
        className="w-48"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
        Confirm
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      {message && (
        <span
          className="w-full text-right text-xs text-muted-foreground"
          role="status"
        >
          {message}
        </span>
      )}
    </form>
  );
}
