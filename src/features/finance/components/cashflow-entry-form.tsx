"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordFinanceAction } from "../server/actions";

export type CashflowFormOptions = {
  students: Array<{ id: number; label: string; admissionNumber: string }>;
  invoices: Array<{
    id: number;
    invoice_number: string;
    student_name_snapshot: string;
    outstanding: number;
  }>;
  paymentMethods: Array<{
    id: number;
    name: string;
    requires_reference: boolean;
  }>;
  expenseCategories: Array<{ id: number; name: string; status: string }>;
  miscIncomeCategories: Array<{ id: number; name: string; status: string }>;
};

type Mode =
  | "school_fee_payment"
  | "feeding_receipt"
  | "admission_receipt"
  | "misc_receipt"
  | "expense";

const modes: Array<{ value: Mode; label: string }> = [
  { value: "school_fee_payment", label: "School fee" },
  { value: "feeding_receipt", label: "Feeding" },
  { value: "admission_receipt", label: "Admission" },
  { value: "misc_receipt", label: "Miscellaneous" },
  { value: "expense", label: "Expense" },
];

export function CashflowEntryForm({
  options,
  businessDate,
}: {
  options: CashflowFormOptions;
  businessDate: string;
}) {
  const [mode, setMode] = useState<Mode>("school_fee_payment");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const selectedPaymentMethod = options.paymentMethods.find(
    (item) => String(item.id) === selectedMethod,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const requestKey = crypto.randomUUID();
    const requestFingerprint = JSON.stringify({
      mode,
      date: businessDate,
      amount: form.get("amount"),
      record: form.get("recordId"),
    });
    const base = {
      requestKey,
      requestFingerprint,
      amount: String(form.get("amount") ?? ""),
      businessDate,
      paymentMethodId: form.get("paymentMethodId"),
      externalReference: String(form.get("externalReference") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const recordId = form.get("recordId");
    const result = await recordFinanceAction(
      mode,
      mode === "school_fee_payment"
        ? { ...base, invoiceId: recordId }
        : mode === "feeding_receipt" || mode === "admission_receipt"
          ? { ...base, studentId: recordId }
          : mode === "misc_receipt"
            ? {
                ...base,
                categoryId: form.get("categoryId"),
                description: form.get("description"),
                payerName: form.get("payerName"),
                studentId: form.get("studentId"),
              }
            : {
                ...base,
                categoryId: form.get("categoryId"),
                description: form.get("description"),
                attachmentPath: form.get("attachmentPath"),
              },
    );
    setMessage(result.message);
    if (result.ok) event.currentTarget.reset();
    setPending(false);
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setSelectedMethod("");
  }

  const needsStudent =
    mode === "feeding_receipt" || mode === "admission_receipt";
  const needsCategory = mode === "misc_receipt" || mode === "expense";

  return (
    <section className="panel p-5" aria-labelledby="cashflow-entry-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cashflow-entry-title" className="text-base font-semibold">
            Record a transaction
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Post one receipt or expense for the selected business date.
          </p>
        </div>
        <span className="rounded-md bg-brand-subtle px-3 py-2 text-xs font-medium text-primary">
          {businessDate}
        </span>
      </div>

      <div
        className="mt-4 grid gap-2 sm:grid-cols-5"
        aria-label="Transaction type"
      >
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => changeMode(item.value)}
            className={`min-h-10 rounded-md border px-3 text-sm font-medium transition-colors ${mode === item.value ? "border-primary bg-brand-subtle text-primary" : "border-border bg-background hover:bg-muted"}`}
            aria-pressed={mode === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={submit}
      >
        {mode === "school_fee_payment" && (
          <Field label="Open invoice" name="recordId" required>
            <select name="recordId" className="native-select" required>
              <option value="">Choose invoice</option>
              {options.invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} · {invoice.student_name_snapshot} ·
                  GHS {invoice.outstanding.toFixed(2)} due
                </option>
              ))}
            </select>
          </Field>
        )}
        {needsStudent && (
          <Field label="Student" name="recordId" required>
            <select name="recordId" className="native-select" required>
              <option value="">Choose student</option>
              {options.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label} · {student.admissionNumber}
                </option>
              ))}
            </select>
          </Field>
        )}
        {needsCategory && (
          <Field
            label={mode === "expense" ? "Expense category" : "Income category"}
            name="categoryId"
            required
          >
            <select name="categoryId" className="native-select" required>
              <option value="">Choose category</option>
              {(mode === "expense"
                ? options.expenseCategories
                : options.miscIncomeCategories
              ).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {mode === "misc_receipt" && (
          <Field label="Student (optional)" name="studentId">
            <select name="studentId" className="native-select">
              <option value="">Not linked to a student</option>
              {options.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {mode === "misc_receipt" && (
          <Field label="Payer name (optional)" name="payerName">
            <Input name="payerName" maxLength={160} />
          </Field>
        )}
        {(mode === "misc_receipt" || mode === "expense") && (
          <Field label="Description" name="description" required>
            <Input name="description" required maxLength={500} />
          </Field>
        )}
        <Field label="Amount (GHS)" name="amount" required>
          <Input
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Payment method" name="paymentMethodId" required>
          <select
            name="paymentMethodId"
            className="native-select"
            required
            value={selectedMethod}
            onChange={(event) => setSelectedMethod(event.target.value)}
          >
            <option value="">Choose method</option>
            {options.paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
                {method.requires_reference ? " · reference required" : ""}
              </option>
            ))}
          </select>
        </Field>
        {selectedPaymentMethod?.requires_reference && (
          <Field label="External reference" name="externalReference" required>
            <Input name="externalReference" required maxLength={120} />
          </Field>
        )}
        {mode === "expense" && (
          <Field label="Attachment path (optional)" name="attachmentPath">
            <Input name="attachmentPath" maxLength={300} />
          </Field>
        )}
        <Field label="Notes (optional)" name="notes">
          <Input name="notes" maxLength={500} />
        </Field>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <PlusCircle />
            )}
            {pending ? "Posting..." : "Post transaction"}
          </Button>
        </div>
      </form>
      {message && (
        <p
          className="mt-4 flex items-center gap-2 text-sm font-medium"
          role="status"
        >
          <CheckCircle2 className="size-4 text-success" />
          {message}
        </p>
      )}
    </section>
  );
}

function Field({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const id = `cashflow-${name}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children ?? <Input id={id} name={name} />}
    </div>
  );
}
