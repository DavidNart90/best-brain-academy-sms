"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recordSalary,
  recordSalaryDeduction,
  reverseSalary,
} from "../server/salary-actions";
import type { DeductionType, SalaryStaffOption } from "../types";

type Outcome = { ok: boolean; message: string } | null;

function Notice({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null;
  return (
    <p
      className={`flex items-start gap-2 text-sm font-medium ${outcome.ok ? "text-success" : "text-destructive"}`}
      role={outcome.ok ? "status" : "alert"}
    >
      {outcome.ok ? (
        <CheckCircle2 className="mt-0.5 size-4" />
      ) : (
        <AlertCircle className="mt-0.5 size-4" />
      )}
      {outcome.message}
    </p>
  );
}

export function SalaryEntryForm({
  staff,
  payrollMonth,
}: {
  staff: SalaryStaffOption[];
  payrollMonth: string;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      staffId: String(form.get("staffId") ?? ""),
      payrollMonth: String(form.get("payrollMonth") ?? ""),
      grossSalary: String(form.get("grossSalary") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await recordSalary({
        ...input,
        requestKey: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        formElement.reset();
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
    <section className="panel p-5" aria-labelledby="salary-entry-title">
      <div>
        <h2 id="salary-entry-title" className="text-base font-semibold">
          Record monthly salary
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gross salary is snapshotted once per staff member and month. Active
          automatic deductions are applied immediately.
        </p>
      </div>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_auto]"
        onSubmit={submit}
      >
        <div className="field">
          <Label htmlFor="salary-staff">Staff member</Label>
          <select
            id="salary-staff"
            name="staffId"
            className="native-select"
            required
            disabled={pending}
            defaultValue=""
          >
            <option value="">Choose staff member</option>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.staffNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="salary-month">Salary month</Label>
          <Input
            id="salary-month"
            name="payrollMonth"
            type="month"
            required
            disabled={pending}
            defaultValue={payrollMonth.slice(0, 7)}
          />
        </div>
        <div className="field">
          <Label htmlFor="salary-gross">Gross salary (GHS)</Label>
          <Input
            id="salary-gross"
            name="grossSalary"
            inputMode="decimal"
            placeholder="0.00"
            required
            maxLength={15}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            {pending ? "Posting…" : "Post salary"}
          </Button>
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <Notice outcome={outcome} />
        </div>
      </form>
    </section>
  );
}

export function SalaryDeductionForm({
  salaryRecordId,
  deductionTypes,
}: {
  salaryRecordId: number;
  deductionTypes: DeductionType[];
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [typeId, setTypeId] = useState("");
  const selected = deductionTypes.find((item) => String(item.id) === typeId);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      salaryRecordId,
      deductionTypeId: typeId,
      configuredValue: String(form.get("configuredValue") ?? ""),
      reason: String(form.get("reason") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await recordSalaryDeduction({
        ...input,
        requestKey: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        formElement.reset();
        setTypeId("");
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
    <section className="panel p-5" aria-labelledby="deduction-entry-title">
      <h2 id="deduction-entry-title" className="text-base font-semibold">
        Add a deduction
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add one approved manual deduction type to this salary record.
      </p>
      <form
        onSubmit={submit}
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.4fr_auto]"
      >
        <div className="field">
          <Label htmlFor="deduction-type">Deduction type</Label>
          <select
            id="deduction-type"
            className="native-select"
            required
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            disabled={pending}
          >
            <option value="">Choose type</option>
            {deductionTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <Label htmlFor="deduction-value">
            {selected?.calculationType === "percentage"
              ? "Percentage"
              : "Amount (GHS)"}
          </Label>
          <Input
            id="deduction-value"
            name="configuredValue"
            inputMode="decimal"
            required
            defaultValue={selected?.defaultValue ?? ""}
            key={selected?.id ?? "none"}
            disabled={pending}
          />
        </div>
        <div className="field">
          <Label htmlFor="deduction-reason">Note (optional)</Label>
          <Input
            id="deduction-reason"
            name="reason"
            maxLength={500}
            disabled={pending}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending || !typeId}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add
            deduction
          </Button>
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <Notice outcome={outcome} />
        </div>
      </form>
    </section>
  );
}

export function SalaryReverseForm({
  kind,
  recordId,
}: {
  kind: "salary" | "deduction";
  recordId: number;
}) {
  const router = useRouter();
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      recordId,
      reason: String(form.get("reason") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    setPending(true);
    setOutcome(null);
    try {
      const result = await reverseSalary(kind, {
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
          "The reversal could not be confirmed. Retry unchanged to check safely.",
      });
    } finally {
      setPending(false);
    }
  }
  if (!open)
    return (
      <div className="flex items-center justify-end gap-2">
        {outcome && <Notice outcome={outcome} />}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <RotateCcw />
          Reverse
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end justify-end gap-2"
    >
      <div className="field text-left">
        <Label htmlFor={`salary-reason-${kind}-${recordId}`}>
          Reversal reason
        </Label>
        <Input
          id={`salary-reason-${kind}-${recordId}`}
          name="reason"
          minLength={2}
          maxLength={500}
          required
          disabled={pending}
          className="w-64"
        />
      </div>
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
    </form>
  );
}
