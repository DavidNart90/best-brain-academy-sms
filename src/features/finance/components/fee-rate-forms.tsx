"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  baseClassFeesInputSchema,
  flatFeesInputSchema,
  transportChargesInputSchema,
  type BaseClassFeesFormValues,
  type BaseClassFeesInput,
  type FlatFeesFormValues,
  type FlatFeesInput,
  type TransportChargesFormValues,
  type TransportChargesInput,
} from "../schemas";
import {
  saveBaseClassFees,
  saveFlatFees,
  saveTransportCharges,
} from "../server/actions";
import type { BaseClassFeeRow, FlatFeeRow, TransportChargeRow } from "../types";

function Notice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm font-medium" role="status">
      {message}
    </p>
  );
}

export function BaseClassFeesForm({
  academicYearId,
  academicTermId,
  rows,
}: {
  academicYearId: number;
  academicTermId: number;
  rows: BaseClassFeeRow[];
}) {
  const [message, setMessage] = useState("");
  const form = useForm<BaseClassFeesFormValues, unknown, BaseClassFeesInput>({
    resolver: zodResolver(baseClassFeesInputSchema),
    defaultValues: {
      academicYearId,
      academicTermId,
      rows: rows.map((row) => ({
        classId: row.classId,
        rateId: row.rateId ?? "",
        amount: row.amount ?? "",
      })),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await saveBaseClassFees(values);
    setMessage(result.message);
  });
  return (
    <form onSubmit={submit} noValidate className="panel p-5 sm:p-6">
      <h3 className="text-sm font-semibold">Base class fees</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Applies per class for the current term. Issued invoices keep their
        original amount even after this changes.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, index) => (
          <FormField
            key={row.classId}
            id={`base-fee-${row.classId}`}
            label={row.className}
            error={form.formState.errors.rows?.[index]?.amount?.message}
          >
            <Input
              id={`base-fee-${row.classId}`}
              inputMode="decimal"
              placeholder="0.00"
              {...form.register(`rows.${index}.amount`)}
            />
          </FormField>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}{" "}
          Save base class fees
        </Button>
        <Notice message={message} />
      </div>
    </form>
  );
}

export function TransportChargesForm({
  academicYearId,
  academicTermId,
  rows,
}: {
  academicYearId: number;
  academicTermId: number;
  rows: TransportChargeRow[];
}) {
  const [message, setMessage] = useState("");
  const form = useForm<
    TransportChargesFormValues,
    unknown,
    TransportChargesInput
  >({
    resolver: zodResolver(transportChargesInputSchema),
    defaultValues: {
      academicYearId,
      academicTermId,
      rows: rows.map((row) => ({
        schoolLocationId: row.schoolLocationId,
        rateId: row.rateId ?? "",
        amount: row.amount ?? "",
      })),
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await saveTransportCharges(values);
    setMessage(result.message);
  });
  return (
    <form onSubmit={submit} noValidate className="panel p-5 sm:p-6">
      <h3 className="text-sm font-semibold">Location / transport charges</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Applies per transport location for the current term, based on how far a
        student stays from school.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, index) => (
          <FormField
            key={row.schoolLocationId}
            id={`transport-charge-${row.schoolLocationId}`}
            label={row.locationName}
            error={form.formState.errors.rows?.[index]?.amount?.message}
          >
            <Input
              id={`transport-charge-${row.schoolLocationId}`}
              inputMode="decimal"
              placeholder="0.00"
              {...form.register(`rows.${index}.amount`)}
            />
          </FormField>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}{" "}
          Save transport charges
        </Button>
        <Notice message={message} />
      </div>
    </form>
  );
}

export function FlatFeesForm({
  academicYearId,
  academicTermId,
  flatFees,
}: {
  academicYearId: number;
  academicTermId: number;
  flatFees: FlatFeeRow[];
}) {
  const [message, setMessage] = useState("");
  const feeding = flatFees.find((row) => row.code === "feeding_fee");
  const admission = flatFees.find((row) => row.code === "admission_fee");
  const form = useForm<FlatFeesFormValues, unknown, FlatFeesInput>({
    resolver: zodResolver(flatFeesInputSchema),
    defaultValues: {
      academicYearId,
      academicTermId,
      feedingRateId: feeding?.rateId ?? "",
      feedingAmount: feeding?.amount ?? "",
      admissionRateId: admission?.rateId ?? "",
      admissionAmount: admission?.amount ?? "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await saveFlatFees(values);
    setMessage(result.message);
  });
  return (
    <form onSubmit={submit} noValidate className="panel p-5 sm:p-6">
      <h3 className="text-sm font-semibold">Feeding and admission fees</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        These amounts are never auto-charged; accounts staff record each feeding
        or admission payment individually.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField
          id="feeding-amount"
          label="Feeding fee (per student per day)"
          error={form.formState.errors.feedingAmount?.message}
        >
          <Input
            id="feeding-amount"
            inputMode="decimal"
            placeholder="0.00"
            {...form.register("feedingAmount")}
          />
        </FormField>
        <FormField
          id="admission-amount"
          label="Admission fee (per new student)"
          error={form.formState.errors.admissionAmount?.message}
        >
          <Input
            id="admission-amount"
            inputMode="decimal"
            placeholder="0.00"
            {...form.register("admissionAmount")}
          />
        </FormField>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}{" "}
          Save fees
        </Button>
        <Notice message={message} />
      </div>
    </form>
  );
}
