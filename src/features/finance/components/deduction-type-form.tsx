"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { ConfigurationDeleteControl } from "@/components/forms/configuration-delete-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteFinanceConfiguration } from "../server/actions";
import { saveDeductionType } from "../server/salary-actions";
import type { DeductionType } from "../types";

export function DeductionTypeForm({ record }: { record?: DeductionType }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [calculationType, setCalculationType] = useState(
    record?.calculationType ?? "fixed",
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage(null);
    const form = new FormData(formElement);
    const result = await saveDeductionType({
      id: record?.id ?? null,
      code: String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      calculationType,
      defaultValue: String(form.get("defaultValue") ?? ""),
      autoApply: form.get("autoApply") === "on",
      effectiveFrom: String(form.get("effectiveFrom") ?? ""),
      effectiveTo: String(form.get("effectiveTo") ?? ""),
      notes: String(form.get("notes") ?? ""),
      sortOrder: String(form.get("sortOrder") ?? ""),
      status: String(form.get("status") ?? "active"),
    });
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok && !record) {
      formElement.reset();
      setCalculationType("fixed");
    }
    setPending(false);
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="field">
        <Label htmlFor={`deduction-code-${record?.id ?? "new"}`}>Code</Label>
        <Input
          id={`deduction-code-${record?.id ?? "new"}`}
          name="code"
          defaultValue={record?.code}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-name-${record?.id ?? "new"}`}>Name</Label>
        <Input
          id={`deduction-name-${record?.id ?? "new"}`}
          name="name"
          defaultValue={record?.name}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-calculation-${record?.id ?? "new"}`}>
          Calculation
        </Label>
        <select
          id={`deduction-calculation-${record?.id ?? "new"}`}
          name="calculationType"
          className="native-select"
          value={calculationType}
          onChange={(event) =>
            setCalculationType(event.target.value as "percentage" | "fixed")
          }
          disabled={pending}
        >
          <option value="fixed">Fixed amount</option>
          <option value="percentage">Percentage of gross</option>
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`deduction-default-${record?.id ?? "new"}`}>
          Default {calculationType === "percentage" ? "percentage" : "amount"}
        </Label>
        <Input
          id={`deduction-default-${record?.id ?? "new"}`}
          name="defaultValue"
          inputMode="decimal"
          defaultValue={record?.defaultValue ?? ""}
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-from-${record?.id ?? "new"}`}>
          Effective from
        </Label>
        <Input
          id={`deduction-from-${record?.id ?? "new"}`}
          name="effectiveFrom"
          type="date"
          defaultValue={record?.effectiveFrom ?? "2026-08-01"}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-to-${record?.id ?? "new"}`}>
          Effective to (optional)
        </Label>
        <Input
          id={`deduction-to-${record?.id ?? "new"}`}
          name="effectiveTo"
          type="date"
          defaultValue={record?.effectiveTo ?? ""}
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-order-${record?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`deduction-order-${record?.id ?? "new"}`}
          name="sortOrder"
          type="number"
          min={1}
          max={999}
          defaultValue={record?.sortOrder ?? 70}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`deduction-status-${record?.id ?? "new"}`}>
          Status
        </Label>
        <select
          id={`deduction-status-${record?.id ?? "new"}`}
          name="status"
          className="native-select"
          defaultValue={record?.status ?? "active"}
          disabled={pending}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="field sm:col-span-2 lg:col-span-3">
        <Label htmlFor={`deduction-notes-${record?.id ?? "new"}`}>
          Notes (optional)
        </Label>
        <Input
          id={`deduction-notes-${record?.id ?? "new"}`}
          name="notes"
          defaultValue={record?.notes ?? ""}
          maxLength={500}
          disabled={pending}
        />
      </div>
      <label className="flex min-h-10 items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          name="autoApply"
          className="size-4 accent-primary"
          defaultChecked={record?.autoApply ?? false}
          disabled={pending}
        />
        Apply automatically
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          <Save />
          {pending
            ? "Saving…"
            : record
              ? "Save deduction type"
              : "Add deduction type"}
        </Button>
        {message && (
          <p
            role="status"
            className={
              message.ok ? "text-sm text-success" : "text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}
        {record && (
          <ConfigurationDeleteControl
            label={`deduction type ${record.name}`}
            onDelete={() =>
              deleteFinanceConfiguration({
                kind: "salary_deduction_type",
                id: record.id,
              })
            }
          />
        )}
      </div>
    </form>
  );
}
