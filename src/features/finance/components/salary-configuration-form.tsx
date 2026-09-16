"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarX2,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  endSalaryConfiguration,
  saveSalaryConfiguration,
} from "../server/salary-actions";
import type {
  SalaryConfiguration,
  SalaryConfigurationStaffOption,
} from "../types";

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

export function SalaryConfigurationForm({
  defaultMonth,
  staff,
  record,
}: {
  defaultMonth: string;
  staff: SalaryConfigurationStaffOption[];
  record?: SalaryConfiguration;
}) {
  const router = useRouter();
  const id = useId();
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
      grossSalary: String(form.get("grossSalary") ?? ""),
      effectiveFrom: String(form.get("effectiveFrom") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await saveSalaryConfiguration({
        ...input,
        requestKey: retry.current.key,
      });
      setOutcome(result);
      if (result.ok) {
        retry.current = null;
        if (!record) formElement.reset();
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
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.8fr_1.4fr_auto]"
    >
      <div className="field">
        <Label htmlFor={`${id}-staff`}>Staff member</Label>
        {record ? (
          <>
            <Input
              id={`${id}-staff`}
              value={`${record.staffName} · ${record.staffNumber}`}
              readOnly
            />
            <input type="hidden" name="staffId" value={record.staffId} />
          </>
        ) : (
          <select
            id={`${id}-staff`}
            name="staffId"
            className="native-select"
            required
            defaultValue=""
            disabled={pending}
          >
            <option value="">Choose staff member</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.staffNumber}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="field">
        <Label htmlFor={`${id}-gross`}>Gross salary (GHS)</Label>
        <Input
          id={`${id}-gross`}
          name="grossSalary"
          inputMode="decimal"
          defaultValue={record?.grossSalary ?? ""}
          placeholder="0.00"
          required
          maxLength={15}
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${id}-effective`}>Effective month</Label>
        <Input
          id={`${id}-effective`}
          name="effectiveFrom"
          type="month"
          defaultValue={record?.effectiveFrom.slice(0, 7) ?? defaultMonth}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${id}-notes`}>Note (optional)</Label>
        <Input
          id={`${id}-notes`}
          name="notes"
          defaultValue={record?.notes ?? ""}
          maxLength={500}
          disabled={pending}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : record ? "Save change" : "Add salary"}
        </Button>
      </div>
      <div className="sm:col-span-2 xl:col-span-5">
        <Notice outcome={outcome} />
      </div>
    </form>
  );
}

export function EndSalaryConfigurationForm({
  defaultMonth,
  record,
}: {
  defaultMonth: string;
  record: SalaryConfiguration;
}) {
  const router = useRouter();
  const id = useId();
  const inFlight = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const input = {
      configurationId: record.id,
      effectiveTo: String(form.get("effectiveTo") ?? ""),
      reason: String(form.get("reason") ?? ""),
    };
    const payload = JSON.stringify(input);
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    inFlight.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const result = await endSalaryConfiguration({
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
          "The result could not be confirmed. Retry unchanged to check safely.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (!open)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Notice outcome={outcome} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <CalendarX2 />
          End salary
        </Button>
      </div>
    );

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 border-t pt-4 sm:grid-cols-2 xl:grid-cols-[0.8fr_1.5fr_auto_auto]"
    >
      <div className="field">
        <Label htmlFor={`${id}-final-month`}>Final salary month</Label>
        <Input
          id={`${id}-final-month`}
          name="effectiveTo"
          type="month"
          min={record.effectiveFrom.slice(0, 7)}
          defaultValue={
            defaultMonth < record.effectiveFrom.slice(0, 7)
              ? record.effectiveFrom.slice(0, 7)
              : defaultMonth
          }
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <Label htmlFor={`${id}-reason`}>Reason</Label>
        <Input
          id={`${id}-reason`}
          name="reason"
          minLength={2}
          maxLength={500}
          required
          disabled={pending}
          placeholder="For example, staff member left"
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <CalendarX2 />}
          {pending ? "Ending…" : "Confirm end"}
        </Button>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <div className="sm:col-span-2 xl:col-span-4">
        <Notice outcome={outcome} />
      </div>
    </form>
  );
}
