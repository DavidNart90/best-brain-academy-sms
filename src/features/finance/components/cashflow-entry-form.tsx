"use client";

import { cloneElement, useRef, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordFinanceAction } from "../server/actions";
import { InvoiceSearch } from "./invoice-search";
import type { OpenInvoiceOption } from "../types";

export type CashflowFormOptions = {
  paymentMethods: Array<{
    id: number;
    name: string;
    requires_reference: boolean;
  }>;
  expenseCategories: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
  }>;
};

type Mode =
  | "school_fee_payment"
  | "feeding_receipt"
  | "admission_receipt"
  | "misc_receipt"
  | "expense";
const modes: Array<{ value: Mode; label: string }> = [
  { value: "school_fee_payment", label: "School Fees" },
  { value: "feeding_receipt", label: "Feeding fees" },
  { value: "admission_receipt", label: "Admission fees" },
  { value: "misc_receipt", label: "Miscellaneous income" },
  { value: "expense", label: "Expense" },
];

export function CashflowEntryForm({
  options,
  businessDate,
}: {
  options: CashflowFormOptions;
  businessDate: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("school_fee_payment");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [invoice, setInvoice] = useState<OpenInvoiceOption | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const selectedPaymentMethod = options.paymentMethods.find(
    (item) => String(item.id) === selectedMethod,
  );
  const category = options.expenseCategories.find(
    (item) => String(item.id) === categoryId,
  );
  const isOtherExpense =
    category?.code.toUpperCase() === "OTHER" ||
    category?.name.trim().toLowerCase() === "other";
  const dailyTotal = mode === "feeding_receipt" || mode === "admission_receipt";

  function resetControls() {
    setSelectedMethod("");
    setCategoryId("");
    setInvoice(null);
    setFormVersion((version) => version + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (mode === "school_fee_payment" && !invoice) {
      setOutcome({
        ok: false,
        message: "Select an invoice from the search results first.",
      });
      return;
    }
    const base = {
      amount: String(form.get("amount") ?? ""),
      businessDate,
      paymentMethodId: selectedMethod,
      externalReference: String(form.get("externalReference") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const input =
      mode === "school_fee_payment"
        ? { ...base, invoiceId: invoice?.id }
        : mode === "misc_receipt"
          ? {
              ...base,
              description: String(form.get("description") ?? ""),
              payerName: String(form.get("payerName") ?? ""),
              studentId: null,
            }
          : mode === "expense"
            ? {
                ...base,
                categoryId,
                description: String(form.get("description") ?? ""),
                attachmentPath: String(form.get("attachmentPath") ?? ""),
              }
            : base;
    const payload = JSON.stringify({ mode, input });
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await recordFinanceAction(mode, {
        ...input,
        requestKey: retry.current.key,
        // SQL derives the authoritative fingerprint from the full validated arguments.
        requestFingerprint: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        formElement.reset();
        resetControls();
        router.refresh();
      }
    } catch {
      setOutcome({
        ok: false,
        message:
          "We could not confirm the result. Retry without changing the fields to safely check this transaction.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section className="panel p-5" aria-labelledby="cashflow-entry-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cashflow-entry-title" className="text-base font-semibold">
            Record a transaction
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Post money received or spent for the selected business date.
          </p>
        </div>
        <span className="rounded-md bg-brand-subtle px-3 py-2 text-xs font-medium text-primary">
          {businessDate}
        </span>
      </div>
      <div
        className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-5"
        aria-label="Transaction type"
      >
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={pending}
            onClick={() => {
              setMode(item.value);
              setOutcome(null);
              resetControls();
            }}
            className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${mode === item.value ? "border-primary bg-brand-subtle text-primary" : "border-border bg-background hover:bg-muted"}`}
            aria-pressed={mode === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      {dailyTotal ? (
        <p className="mt-4 rounded-md bg-muted p-3 text-sm">
          Enter the day&apos;s total{" "}
          {mode === "feeding_receipt" ? "feeding" : "admission"} collections for
          the selected payment method. Each method can be posted once per day.
          To correct a posted total, reverse it in Receipts before posting its
          replacement.
        </p>
      ) : null}
      <form key={mode + "-" + formVersion} className="mt-5" onSubmit={submit}>
        <fieldset
          disabled={pending}
          className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <legend className="sr-only">Transaction details</legend>
          {mode === "school_fee_payment" && (
            <InvoiceSearch selected={invoice} onSelect={setInvoice} />
          )}
          {mode === "expense" && (
            <Field label="Expense category" name="categoryId" required>
              <select
                name="categoryId"
                className="native-select"
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Choose category</option>
                {options.expenseCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {(mode === "misc_receipt" || mode === "expense") && (
            <Field
              label={
                mode === "misc_receipt"
                  ? "Income name"
                  : isOtherExpense
                    ? "Other expense name"
                    : "Description"
              }
              name="description"
              required
            >
              <Input
                name="description"
                required
                minLength={2}
                maxLength={500}
                placeholder={
                  mode === "misc_receipt"
                    ? "e.g. Exercise book sales"
                    : isOtherExpense
                      ? "Name the expense"
                      : "What was this expense for?"
                }
              />
            </Field>
          )}
          {mode === "misc_receipt" && (
            <Field label="Payer name (optional)" name="payerName">
              <Input name="payerName" maxLength={160} />
            </Field>
          )}
          <Field
            label={dailyTotal ? "Daily total (GHS)" : "Amount (GHS)"}
            name="amount"
            required
          >
            <Input
              name="amount"
              inputMode="decimal"
              placeholder="0.00"
              required
              maxLength={15}
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
        </fieldset>
      </form>
      {outcome && (
        <p
          className={`mt-4 flex items-start gap-2 text-sm font-medium ${outcome.ok ? "text-success" : "text-destructive"}`}
          role={outcome.ok ? "status" : "alert"}
        >
          {outcome.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          {outcome.message}
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
  children: ReactElement<{ id?: string }>;
}) {
  const id = "cashflow-" + name;
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {cloneElement(children, { id })}
    </div>
  );
}
