"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  academicTermInputSchema,
  academicYearInputSchema,
  classGroups,
  classInputSchema,
  currentAcademicContextSchema,
  locationInputSchema,
  schoolSettingsInputSchema,
  type AcademicTermFormValues,
  type AcademicYearFormValues,
  type ClassFormValues,
  type CurrentAcademicContextFormValues,
  type LocationFormValues,
  type SchoolSettingsFormValues,
  type SchoolSettingsInput,
} from "../schemas";
import {
  saveAcademicTerm,
  saveAcademicYear,
  saveClass,
  saveLocation,
  saveSchoolSettings,
  setCurrentAcademicContext,
  type ConfigurationActionResult,
} from "../server/actions";
import type {
  AcademicTerm,
  AcademicYear,
  SchoolClass,
  SchoolLocation,
  SchoolSettings,
} from "../types";
import { classGroupLabels } from "../types";

function FormNotice({ result }: { result: ConfigurationActionResult | null }) {
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

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function StatusField({
  register,
}: {
  register: ReturnType<typeof useForm<AcademicYearFormValues>>["register"];
}) {
  return (
    <div className="field">
      <Label htmlFor="status">Status</Label>
      <select id="status" className="native-select" {...register("status")}>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}

export function AcademicYearForm({ year }: { year?: AcademicYear }) {
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearInputSchema),
    defaultValues: year
      ? {
          id: year.id,
          name: year.name,
          shortName: year.short_name,
          startsOn: year.starts_on,
          endsOn: year.ends_on,
          status: year.status as "active" | "archived",
        }
      : { name: "", shortName: "", startsOn: "", endsOn: "", status: "active" },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await saveAcademicYear(values)),
  );
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`year-name-${year?.id ?? "new"}`}>Academic year</Label>
        <Input
          id={`year-name-${year?.id ?? "new"}`}
          placeholder="2027/2028"
          {...form.register("name")}
        />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div className="field">
        <Label htmlFor={`year-short-${year?.id ?? "new"}`}>Short label</Label>
        <Input
          id={`year-short-${year?.id ?? "new"}`}
          placeholder="27/28"
          {...form.register("shortName")}
        />
        <FieldError message={form.formState.errors.shortName?.message} />
      </div>
      <div className="field">
        <Label htmlFor={`year-start-${year?.id ?? "new"}`}>Starts</Label>
        <Input
          id={`year-start-${year?.id ?? "new"}`}
          type="date"
          {...form.register("startsOn")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`year-end-${year?.id ?? "new"}`}>Ends</Label>
        <Input
          id={`year-end-${year?.id ?? "new"}`}
          type="date"
          {...form.register("endsOn")}
        />
        <FieldError message={form.formState.errors.endsOn?.message} />
      </div>
      <StatusField register={form.register} />
      <div className="flex items-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save />{" "}
          {form.formState.isSubmitting
            ? "Saving…"
            : year
              ? "Save year"
              : "Add year"}
        </Button>
      </div>
      <div className="sm:col-span-2">
        <FormNotice result={result} />
      </div>
    </form>
  );
}

export function AcademicTermForm({
  term,
  years,
}: {
  term?: AcademicTerm;
  years: AcademicYear[];
}) {
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<AcademicTermFormValues>({
    resolver: zodResolver(academicTermInputSchema),
    defaultValues: term
      ? {
          id: term.id,
          academicYearId: term.academic_year_id,
          name: term.name,
          sequence: term.sequence,
          startsOn: term.starts_on,
          endsOn: term.ends_on,
          status: term.status as "active" | "archived",
        }
      : {
          academicYearId:
            years.find((year) => year.is_current)?.id ?? years[0]?.id,
          name: "",
          sequence: 1,
          startsOn: null,
          endsOn: null,
          status: "active",
        },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await saveAcademicTerm(values)),
  );
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`term-year-${term?.id ?? "new"}`}>Academic year</Label>
        <select
          id={`term-year-${term?.id ?? "new"}`}
          className="native-select"
          {...form.register("academicYearId", { valueAsNumber: true })}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`term-name-${term?.id ?? "new"}`}>Term name</Label>
        <Input
          id={`term-name-${term?.id ?? "new"}`}
          placeholder="Term 1"
          {...form.register("name")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`term-sequence-${term?.id ?? "new"}`}>Order</Label>
        <Input
          id={`term-sequence-${term?.id ?? "new"}`}
          type="number"
          min={1}
          max={12}
          {...form.register("sequence", { valueAsNumber: true })}
        />
      </div>
      <div className="field">
        <Label htmlFor={`term-start-${term?.id ?? "new"}`}>Starts</Label>
        <Input
          id={`term-start-${term?.id ?? "new"}`}
          type="date"
          {...form.register("startsOn")}
        />
        <FieldError message={form.formState.errors.startsOn?.message} />
      </div>
      <div className="field">
        <Label htmlFor={`term-end-${term?.id ?? "new"}`}>Ends</Label>
        <Input
          id={`term-end-${term?.id ?? "new"}`}
          type="date"
          {...form.register("endsOn")}
        />
        <FieldError message={form.formState.errors.endsOn?.message} />
      </div>
      <div className="field">
        <Label htmlFor={`term-status-${term?.id ?? "new"}`}>Status</Label>
        <select
          id={`term-status-${term?.id ?? "new"}`}
          className="native-select"
          {...form.register("status")}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save />{" "}
          {form.formState.isSubmitting
            ? "Saving…"
            : term
              ? "Save term"
              : "Add term"}
        </Button>
        <FormNotice result={result} />
      </div>
    </form>
  );
}

export function CurrentContextForm({
  years,
  terms,
}: {
  years: AcademicYear[];
  terms: AcademicTerm[];
}) {
  const currentYear = years.find((year) => year.is_current) ?? years[0];
  const currentTerm =
    terms.find((term) => term.is_current) ??
    terms.find(
      (term) => term.academic_year_id === currentYear?.id && term.starts_on,
    );
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<CurrentAcademicContextFormValues>({
    resolver: zodResolver(currentAcademicContextSchema),
    defaultValues: {
      academicYearId: currentYear?.id,
      academicTermId: currentTerm?.id,
    },
  });
  const selectedYear = useWatch({
    control: form.control,
    name: "academicYearId",
  });
  const scheduledTerms = terms.filter(
    (term) =>
      term.academic_year_id === Number(selectedYear) &&
      term.status === "active" &&
      term.starts_on &&
      term.ends_on,
  );
  const submit = form.handleSubmit(async (values) =>
    setResult(await setCurrentAcademicContext(values)),
  );
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="field">
        <Label htmlFor="current-year">Academic year</Label>
        <select
          id="current-year"
          className="native-select"
          {...form.register("academicYearId", { valueAsNumber: true })}
        >
          {years
            .filter((year) => year.status === "active")
            .map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor="current-term">Scheduled term</Label>
        <select
          id="current-term"
          className="native-select"
          {...form.register("academicTermId", { valueAsNumber: true })}
        >
          {scheduledTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting || scheduledTerms.length === 0}
        >
          <Save />{" "}
          {form.formState.isSubmitting ? "Saving…" : "Set current context"}
        </Button>
        <FormNotice result={result} />
      </div>
    </form>
  );
}

export function ClassForm({ record }: { record?: SchoolClass }) {
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<ClassFormValues>({
    resolver: zodResolver(classInputSchema),
    defaultValues: record
      ? {
          id: record.id,
          code: record.code,
          name: record.name,
          classGroup: record.class_group as ClassFormValues["classGroup"],
          sortOrder: record.sort_order,
          status: record.status as "active" | "archived",
        }
      : {
          code: "",
          name: "",
          classGroup: "early_years",
          sortOrder: 140,
          status: "active",
        },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await saveClass(values)),
  );
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`class-code-${record?.id ?? "new"}`}>Code</Label>
        <Input
          id={`class-code-${record?.id ?? "new"}`}
          {...form.register("code")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`class-name-${record?.id ?? "new"}`}>Class name</Label>
        <Input
          id={`class-name-${record?.id ?? "new"}`}
          {...form.register("name")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`class-group-${record?.id ?? "new"}`}>
          Class group
        </Label>
        <select
          id={`class-group-${record?.id ?? "new"}`}
          className="native-select"
          {...form.register("classGroup")}
        >
          {classGroups.map((group) => (
            <option key={group} value={group}>
              {classGroupLabels[group]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <Label htmlFor={`class-order-${record?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`class-order-${record?.id ?? "new"}`}
          type="number"
          {...form.register("sortOrder", { valueAsNumber: true })}
        />
      </div>
      <div className="field">
        <Label htmlFor={`class-status-${record?.id ?? "new"}`}>Status</Label>
        <select
          id={`class-status-${record?.id ?? "new"}`}
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
              ? "Save class"
              : "Add class"}
        </Button>
        <FormNotice result={result} />
      </div>
    </form>
  );
}

export function LocationForm({ record }: { record?: SchoolLocation }) {
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationInputSchema),
    defaultValues: record
      ? {
          id: record.id,
          code: record.code,
          name: record.name,
          sortOrder: record.sort_order,
          status: record.status as "active" | "archived",
        }
      : { code: "", name: "", sortOrder: 60, status: "active" },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await saveLocation(values)),
  );
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" {...form.register("id")} />
      <div className="field">
        <Label htmlFor={`location-code-${record?.id ?? "new"}`}>Code</Label>
        <Input
          id={`location-code-${record?.id ?? "new"}`}
          {...form.register("code")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`location-name-${record?.id ?? "new"}`}>
          Location name
        </Label>
        <Input
          id={`location-name-${record?.id ?? "new"}`}
          {...form.register("name")}
        />
      </div>
      <div className="field">
        <Label htmlFor={`location-order-${record?.id ?? "new"}`}>
          Display order
        </Label>
        <Input
          id={`location-order-${record?.id ?? "new"}`}
          type="number"
          {...form.register("sortOrder", { valueAsNumber: true })}
        />
      </div>
      <div className="field">
        <Label htmlFor={`location-status-${record?.id ?? "new"}`}>Status</Label>
        <select
          id={`location-status-${record?.id ?? "new"}`}
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
              ? "Save location"
              : "Add location"}
        </Button>
        <FormNotice result={result} />
      </div>
    </form>
  );
}

export function SchoolSettingsForm({ settings }: { settings: SchoolSettings }) {
  const [result, setResult] = useState<ConfigurationActionResult | null>(null);
  const form = useForm<SchoolSettingsFormValues, unknown, SchoolSettingsInput>({
    resolver: zodResolver(schoolSettingsInputSchema),
    defaultValues: {
      schoolName: settings.school_name,
      shortName: settings.short_name ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      motto: settings.motto ?? "",
      locationChargeLabel: settings.location_charge_label,
    },
  });
  const submit = form.handleSubmit(async (values) =>
    setResult(await saveSchoolSettings(values)),
  );
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="field">
        <Label htmlFor="school-name">School name</Label>
        <Input id="school-name" {...form.register("schoolName")} />
      </div>
      <div className="field">
        <Label htmlFor="school-short-name">Short name</Label>
        <Input id="school-short-name" {...form.register("shortName")} />
      </div>
      <div className="field sm:col-span-2">
        <Label htmlFor="school-address">Address</Label>
        <Input id="school-address" {...form.register("address")} />
      </div>
      <div className="field">
        <Label htmlFor="school-phone">Phone</Label>
        <Input id="school-phone" {...form.register("phone")} />
      </div>
      <div className="field">
        <Label htmlFor="school-email">Email</Label>
        <Input id="school-email" type="email" {...form.register("email")} />
      </div>
      <div className="field">
        <Label htmlFor="school-motto">Motto</Label>
        <Input id="school-motto" {...form.register("motto")} />
      </div>
      <div className="field">
        <Label htmlFor="location-charge-label">Location charge label</Label>
        <Input
          id="location-charge-label"
          {...form.register("locationChargeLabel")}
        />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save />{" "}
          {form.formState.isSubmitting ? "Saving…" : "Save school settings"}
        </Button>
        <FormNotice result={result} />
      </div>
    </form>
  );
}
