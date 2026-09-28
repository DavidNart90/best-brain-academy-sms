"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PackagePlus, RotateCcw, Save, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assetConditions,
  assetInventoryInputSchema,
  assetStatuses,
  type AssetInventoryFormValues,
  type AssetInventoryInput,
} from "../schemas";
import { saveAssetInventoryRecord } from "../server/actions";
import type { AssetInventoryRecord } from "../types";

const conditionLabels: Record<(typeof assetConditions)[number], string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
  not_applicable: "Not applicable",
};

const statusLabels: Record<(typeof assetStatuses)[number], string> = {
  active: "Active / in use",
  in_storage: "In storage",
  under_repair: "Under repair",
  out_of_stock: "Out of stock",
  disposed: "Disposed",
};

function emptyValues(recordCode: string): AssetInventoryFormValues {
  return {
    id: null,
    recordCode,
    recordType: "asset",
    itemName: "",
    category: "",
    description: "",
    quantity: "1.00",
    unitName: "unit",
    unitCost: "",
    reorderLevel: "",
    condition: "good",
    status: "active",
    schoolLocationId: "",
    roomOrStore: "",
    acquiredOn: "",
    supplier: "",
    custodian: "",
    serialNumber: "",
    notes: "",
  };
}

function recordValues(record: AssetInventoryRecord): AssetInventoryFormValues {
  return {
    id: record.id,
    recordCode: record.recordCode,
    recordType: record.recordType,
    itemName: record.itemName,
    category: record.category,
    description: record.description ?? "",
    quantity: record.quantity,
    unitName: record.unitName,
    unitCost: record.unitCost ?? "",
    reorderLevel: record.reorderLevel ?? "",
    condition: record.condition,
    status: record.status,
    schoolLocationId: record.schoolLocationId ?? "",
    roomOrStore: record.roomOrStore ?? "",
    acquiredOn: record.acquiredOn ?? "",
    supplier: record.supplier ?? "",
    custodian: record.custodian ?? "",
    serialNumber: record.serialNumber ?? "",
    notes: record.notes ?? "",
  };
}

function savedValues(input: AssetInventoryInput): AssetInventoryFormValues {
  return {
    ...input,
    description: input.description ?? "",
    unitCost: input.unitCost ?? "",
    reorderLevel: input.reorderLevel ?? "",
    schoolLocationId: input.schoolLocationId ?? "",
    roomOrStore: input.roomOrStore ?? "",
    acquiredOn: input.acquiredOn ?? "",
    supplier: input.supplier ?? "",
    custodian: input.custodian ?? "",
    serialNumber: input.serialNumber ?? "",
    notes: input.notes ?? "",
  };
}

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

export function AssetInventoryForm({
  record,
  suggestedRecordCode,
  locations,
  cancelHref,
}: {
  record: AssetInventoryRecord | null;
  suggestedRecordCode: string;
  locations: Array<{ id: number; name: string }>;
  cancelHref: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const initialValues = record
    ? recordValues(record)
    : emptyValues(suggestedRecordCode);
  const form = useForm<AssetInventoryFormValues, unknown, AssetInventoryInput>({
    resolver: zodResolver(assetInventoryInputSchema),
    mode: "onBlur",
    defaultValues: initialValues,
  });
  const recordType = useWatch({ control: form.control, name: "recordType" });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!record && !form.formState.isDirty)
      form.setValue("recordCode", suggestedRecordCode);
  }, [form, record, suggestedRecordCode]);

  const submit = async (input: AssetInventoryInput) => {
    setMessage("");
    setSucceeded(false);
    try {
      const result = await saveAssetInventoryRecord(input);
      setMessage(result.message);
      setSucceeded(result.ok);
      if (result.ok) {
        form.reset(
          record ? savedValues(input) : emptyValues(suggestedRecordCode),
        );
        router.refresh();
      }
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh the register before trying again.",
      );
    }
  };

  return (
    <form
      id="asset-record-form"
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      noValidate
      className="panel p-5 sm:p-6"
      aria-labelledby="asset-record-form-title"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 id="asset-record-form-title" className="text-base font-semibold">
            {record
              ? `Edit ${record.recordCode}`
              : "Record an asset or inventory item"}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {record
              ? "Correct the register entry below. The previous values remain in the audit history."
              : "Add equipment, furniture, supplies or consumable stock. The next register code is assigned automatically."}
          </p>
        </div>
        <span className="rounded-md bg-brand-subtle px-3 py-2 text-xs font-medium text-primary">
          Restricted register
        </span>
      </div>

      <fieldset
        disabled={form.formState.isSubmitting}
        className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <legend className="sr-only">Asset or inventory record details</legend>
        <FormField
          id="asset-record-code"
          label="Record code"
          required
          error={errors.recordCode?.message}
          description={
            record
              ? "This permanent code cannot be changed."
              : "Assigned automatically when the record is saved."
          }
        >
          <Input
            id="asset-record-code"
            autoComplete="off"
            readOnly
            aria-readonly="true"
            className="cursor-not-allowed bg-muted font-mono text-muted-foreground"
            aria-invalid={Boolean(errors.recordCode)}
            aria-describedby={describedBy(
              "asset-record-code",
              errors.recordCode?.message,
            )}
            {...form.register("recordCode")}
          />
        </FormField>
        <FormField
          id="asset-record-type"
          label="Record type"
          required
          error={errors.recordType?.message}
        >
          <select
            id="asset-record-type"
            className="native-select w-full"
            aria-invalid={Boolean(errors.recordType)}
            {...form.register("recordType", {
              onChange: (event) => {
                if (event.target.value === "asset")
                  form.setValue("reorderLevel", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
              },
            })}
          >
            <option value="asset">Asset / equipment</option>
            <option value="inventory">Inventory / stock</option>
          </select>
        </FormField>
        <FormField
          id="asset-item-name"
          label="Item name"
          required
          error={errors.itemName?.message}
          className="sm:col-span-2"
        >
          <Input
            id="asset-item-name"
            maxLength={160}
            placeholder="e.g. Classroom projector"
            aria-invalid={Boolean(errors.itemName)}
            aria-describedby={describedBy(
              "asset-item-name",
              errors.itemName?.message,
            )}
            {...form.register("itemName")}
          />
        </FormField>
        <FormField
          id="asset-category"
          label="Category"
          required
          error={errors.category?.message}
        >
          <Input
            id="asset-category"
            list="asset-category-options"
            maxLength={80}
            placeholder="e.g. ICT equipment"
            aria-invalid={Boolean(errors.category)}
            {...form.register("category")}
          />
          <datalist id="asset-category-options">
            <option value="ICT equipment" />
            <option value="Furniture" />
            <option value="Teaching materials" />
            <option value="Stationery" />
            <option value="Maintenance supplies" />
            <option value="Sports equipment" />
          </datalist>
        </FormField>
        <FormField
          id="asset-quantity"
          label="Quantity"
          required
          error={errors.quantity?.message}
        >
          <Input
            id="asset-quantity"
            inputMode="decimal"
            maxLength={13}
            aria-invalid={Boolean(errors.quantity)}
            {...form.register("quantity")}
          />
        </FormField>
        <FormField
          id="asset-unit-name"
          label="Unit"
          required
          error={errors.unitName?.message}
        >
          <Input
            id="asset-unit-name"
            maxLength={40}
            placeholder="unit, box, ream"
            aria-invalid={Boolean(errors.unitName)}
            {...form.register("unitName")}
          />
        </FormField>
        <FormField
          id="asset-unit-cost"
          label="Unit cost (GHS)"
          error={errors.unitCost?.message}
        >
          <Input
            id="asset-unit-cost"
            inputMode="decimal"
            maxLength={15}
            placeholder="0.00"
            aria-invalid={Boolean(errors.unitCost)}
            {...form.register("unitCost")}
          />
        </FormField>
        {recordType === "inventory" && (
          <FormField
            id="asset-reorder-level"
            label="Reorder level"
            error={errors.reorderLevel?.message}
            description="This item is flagged when quantity reaches this level."
          >
            <Input
              id="asset-reorder-level"
              inputMode="decimal"
              maxLength={13}
              placeholder="0.00"
              aria-invalid={Boolean(errors.reorderLevel)}
              {...form.register("reorderLevel")}
            />
          </FormField>
        )}
        <FormField
          id="asset-condition"
          label="Condition"
          required
          error={errors.condition?.message}
        >
          <select
            id="asset-condition"
            className="native-select w-full"
            aria-invalid={Boolean(errors.condition)}
            {...form.register("condition")}
          >
            {assetConditions.map((condition) => (
              <option key={condition} value={condition}>
                {conditionLabels[condition]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="asset-status"
          label="Status"
          required
          error={errors.status?.message}
        >
          <select
            id="asset-status"
            className="native-select w-full"
            aria-invalid={Boolean(errors.status)}
            {...form.register("status")}
          >
            {assetStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="asset-location"
          label="School location"
          error={errors.schoolLocationId?.message}
        >
          <select
            id="asset-location"
            className="native-select w-full"
            aria-invalid={Boolean(errors.schoolLocationId)}
            {...form.register("schoolLocationId")}
          >
            <option value="">Not assigned</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="asset-room"
          label="Room or store"
          error={errors.roomOrStore?.message}
        >
          <Input
            id="asset-room"
            maxLength={120}
            placeholder="e.g. Main store"
            aria-invalid={Boolean(errors.roomOrStore)}
            {...form.register("roomOrStore")}
          />
        </FormField>
        <FormField
          id="asset-acquired-on"
          label="Acquisition date"
          error={errors.acquiredOn?.message}
        >
          <Input
            id="asset-acquired-on"
            type="date"
            aria-invalid={Boolean(errors.acquiredOn)}
            {...form.register("acquiredOn")}
          />
        </FormField>
        <FormField
          id="asset-serial-number"
          label="Serial number"
          error={errors.serialNumber?.message}
        >
          <Input
            id="asset-serial-number"
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(errors.serialNumber)}
            {...form.register("serialNumber")}
          />
        </FormField>
        <FormField
          id="asset-supplier"
          label="Supplier"
          error={errors.supplier?.message}
        >
          <Input
            id="asset-supplier"
            maxLength={160}
            aria-invalid={Boolean(errors.supplier)}
            {...form.register("supplier")}
          />
        </FormField>
        <FormField
          id="asset-custodian"
          label="Custodian"
          error={errors.custodian?.message}
        >
          <Input
            id="asset-custodian"
            maxLength={160}
            placeholder="Person or department responsible"
            aria-invalid={Boolean(errors.custodian)}
            {...form.register("custodian")}
          />
        </FormField>
        <FormField
          id="asset-description"
          label="Description"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <textarea
            id="asset-description"
            rows={3}
            className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            maxLength={500}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
        </FormField>
        <FormField
          id="asset-notes"
          label="Notes"
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <textarea
            id="asset-notes"
            rows={3}
            className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            maxLength={1000}
            aria-invalid={Boolean(errors.notes)}
            {...form.register("notes")}
          />
        </FormField>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <p
          className={
            message
              ? succeeded
                ? "text-sm font-medium text-success"
                : "text-sm font-medium text-destructive"
              : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {message || "Every saved change is recorded in the audit history."}
        </p>
        <div className="flex flex-wrap gap-2">
          {record && (
            <Button asChild type="button" variant="ghost">
              <Link href={cancelHref}>
                <X /> Cancel edit
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            onClick={() => {
              form.reset(initialValues);
              setMessage("");
              setSucceeded(false);
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : record ? (
              <Save />
            ) : (
              <PackagePlus />
            )}
            {form.formState.isSubmitting
              ? "Saving…"
              : record
                ? "Save changes"
                : "Add to register"}
          </Button>
        </div>
      </div>
    </form>
  );
}
