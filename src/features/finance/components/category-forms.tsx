"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  financeCategoryInputSchema,
  paymentMethodInputSchema,
  type FinanceCategoryFormValues,
  type FinanceCategoryInput,
  type PaymentMethodFormValues,
  type PaymentMethodInput,
} from "../schemas";
import {
  saveExpenseCategory,
  saveMiscIncomeCategory,
  savePaymentMethod,
  type FinanceActionResult,
} from "../server/actions";
import type { FinanceCategory, PaymentMethod } from "../types";

function Notice({ result }: { result: FinanceActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={
        result.ok ? "text-sm text-success" : "text-sm text-destructive"
      }
    >
      {result.message}
    </p>
  );
}

export function PaymentMethodForm({ record }: { record?: PaymentMethod }) {
  const [result, setResult] = useState<FinanceActionResult | null>(null);
  const form = useForm<PaymentMethodFormValues, unknown, PaymentMethodInput>({
    resolver: zodResolver(paymentMethodInputSchema),
    defaultValues: record
      ? {
          id: record.id,
          code: record.code,
          name: record.name,
          requiresReference: record.requiresReference,
          sortOrder: record.sortOrder,
          status: record.status,
        }
      : {
          code: "",
          name: "",
          requiresReference: false,
          sortOrder: 50,
          status: "active",
        },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await savePaymentMethod(values)),
  );
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`method-code-${record?.id ?? "new"}`}>Code</Label>
        <Input
          id={`method-code-${record?.id ?? "new"}`}
          {...form.register("code")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`method-name-${record?.id ?? "new"}`}>Name</Label>
        <Input
          id={`method-name-${record?.id ?? "new"}`}
          {...form.register("name")}
        />
      </div>
      <label className="flex min-h-10 items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          {...form.register("requiresReference")}
        />{" "}
        Requires reference
      </label>
      <div className="field">
        <Label htmlFor={`method-order-${record?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`method-order-${record?.id ?? "new"}`}
          type="number"
          {...form.register("sortOrder", { valueAsNumber: true })}
        />
      </div>
      <div className="field">
        <Label htmlFor={`method-status-${record?.id ?? "new"}`}>Status</Label>
        <select
          id={`method-status-${record?.id ?? "new"}`}
          className="native-select"
          {...form.register("status")}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save />{" "}
          {form.formState.isSubmitting
            ? "Saving…"
            : record
              ? "Save method"
              : "Add method"}
        </Button>
        <Notice result={result} />
      </div>
    </form>
  );
}

export function FinanceCategoryForm({
  record,
  kind,
}: {
  record?: FinanceCategory;
  kind: "expense" | "misc-income";
}) {
  const [result, setResult] = useState<FinanceActionResult | null>(null);
  const form = useForm<
    FinanceCategoryFormValues,
    unknown,
    FinanceCategoryInput
  >({
    resolver: zodResolver(financeCategoryInputSchema),
    defaultValues: record
      ? {
          id: record.id,
          code: record.code,
          name: record.name,
          sortOrder: record.sortOrder,
          status: record.status,
        }
      : { code: "", name: "", sortOrder: 50, status: "active" },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(
      await (kind === "expense" ? saveExpenseCategory : saveMiscIncomeCategory)(
        values,
      ),
    ),
  );
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`${kind}-code-${record?.id ?? "new"}`}>Code</Label>
        <Input
          id={`${kind}-code-${record?.id ?? "new"}`}
          {...form.register("code")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${kind}-name-${record?.id ?? "new"}`}>Name</Label>
        <Input
          id={`${kind}-name-${record?.id ?? "new"}`}
          {...form.register("name")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${kind}-order-${record?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`${kind}-order-${record?.id ?? "new"}`}
          type="number"
          {...form.register("sortOrder", { valueAsNumber: true })}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${kind}-status-${record?.id ?? "new"}`}>Status</Label>
        <select
          id={`${kind}-status-${record?.id ?? "new"}`}
          className="native-select"
          {...form.register("status")}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save />{" "}
          {form.formState.isSubmitting
            ? "Saving…"
            : record
              ? "Save category"
              : "Add category"}
        </Button>
        <Notice result={result} />
      </div>
    </form>
  );
}
