"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  enrollmentChangeSchema,
  guardianLinkSchema,
  type EnrollmentChangeFormValues,
  type EnrollmentChangeInput,
  type GuardianLinkFormValues,
  type GuardianLinkInput,
} from "../schemas";
import {
  changeStudentEnrollment,
  linkStudentGuardian,
} from "../server/actions";
import type { StudentReferenceData } from "../types";

export function StudentPhotoUpload({ studentId }: { studentId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setPending(true);
    setMessage("");
    const body = new FormData();
    body.set("photo", file);
    const response = await fetch(`/api/students/${studentId}/photo`, {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { message?: string };
    setPending(false);
    setMessage(
      result.message ??
        (response.ok ? "Photo updated." : "Photo upload failed."),
    );
    if (response.ok) router.refresh();
    if (input.current) input.current.value = "";
  }
  return (
    <div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        aria-label="Student photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => input.current?.click()}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Camera />}
        {pending ? "Uploading…" : "Update photo"}
      </Button>
      {message && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

export function GuardianLinkDialog({ studentId }: { studentId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const form = useForm<GuardianLinkFormValues, unknown, GuardianLinkInput>({
    resolver: zodResolver(guardianLinkSchema),
    defaultValues: {
      studentId,
      fullName: "",
      relationship: "",
      primaryPhone: "",
      alternativePhone: "",
      email: "",
      address: "",
      isPrimary: false,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await linkStudentGuardian(values);
    setMessage(result.message);
    if (result.ok) {
      setOpen(false);
      form.reset();
      router.refresh();
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Link guardian
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link guardian</DialogTitle>
          <DialogDescription>
            Add a guardian contact without replacing existing links.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="grid max-h-[58vh] gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <FormField
              id="guardian-link-name"
              label="Guardian name"
              required
              error={form.formState.errors.fullName?.message}
            >
              <Input id="guardian-link-name" {...form.register("fullName")} />
            </FormField>
            <FormField
              id="guardian-link-relationship"
              label="Relationship"
              required
              error={form.formState.errors.relationship?.message}
            >
              <Input
                id="guardian-link-relationship"
                {...form.register("relationship")}
              />
            </FormField>
            <FormField
              id="guardian-link-phone"
              label="Primary phone"
              required
              error={form.formState.errors.primaryPhone?.message}
            >
              <Input
                id="guardian-link-phone"
                type="tel"
                {...form.register("primaryPhone")}
              />
            </FormField>
            <FormField
              id="guardian-link-alt"
              label="Alternative phone"
              error={form.formState.errors.alternativePhone?.message}
            >
              <Input
                id="guardian-link-alt"
                type="tel"
                {...form.register("alternativePhone")}
              />
            </FormField>
            <FormField
              id="guardian-link-email"
              label="Email"
              error={form.formState.errors.email?.message}
            >
              <Input
                id="guardian-link-email"
                type="email"
                {...form.register("email")}
              />
            </FormField>
            <FormField
              id="guardian-link-address"
              label="Address"
              error={form.formState.errors.address?.message}
            >
              <Input id="guardian-link-address" {...form.register("address")} />
            </FormField>
            <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register("isPrimary")}
              />{" "}
              Make this the primary guardian
            </label>
          </div>
          <DialogFooter>
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <LoaderCircle className="animate-spin" />
              )}
              Save guardian
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EnrollmentChangeDialog({
  studentId,
  reference,
}: {
  studentId: number;
  reference: StudentReferenceData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const year =
    reference.academicYears.find((item) => item.isCurrent) ??
    reference.academicYears[0];
  const term =
    reference.academicTerms.find((item) => item.isCurrent) ??
    reference.academicTerms.find((item) => item.academicYearId === year?.id);
  const form = useForm<
    EnrollmentChangeFormValues,
    unknown,
    EnrollmentChangeInput
  >({
    resolver: zodResolver(enrollmentChangeSchema),
    defaultValues: {
      studentId,
      academicYearId: year?.id,
      academicTermId: term?.id,
      classId: reference.classes[0]?.id,
      schoolLocationId: reference.locations[0]?.id,
      startedOn: new Date().toISOString().slice(0, 10),
    },
  });
  const selectedYear = Number(
    useWatch({ control: form.control, name: "academicYearId" }),
  );
  const terms = reference.academicTerms.filter(
    (item) => item.academicYearId === selectedYear,
  );
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await changeStudentEnrollment(values);
    setMessage(result.message);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    }
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <RefreshCw /> Change enrollment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change enrollment</DialogTitle>
          <DialogDescription>
            The current assignment will close and remain in the student’s
            history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <FormField
              id="change-year"
              label="Academic year"
              required
              error={form.formState.errors.academicYearId?.message}
            >
              <select
                id="change-year"
                className="native-select"
                {...form.register("academicYearId", {
                  valueAsNumber: true,
                  onChange: (event) =>
                    form.setValue(
                      "academicTermId",
                      reference.academicTerms.find(
                        (item) =>
                          item.academicYearId === Number(event.target.value),
                      )?.id ?? 0,
                    ),
                })}
              >
                {reference.academicYears.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="change-term"
              label="Term"
              required
              error={form.formState.errors.academicTermId?.message}
            >
              <select
                id="change-term"
                className="native-select"
                {...form.register("academicTermId", { valueAsNumber: true })}
              >
                {terms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="change-class"
              label="Class"
              required
              error={form.formState.errors.classId?.message}
            >
              <select
                id="change-class"
                className="native-select"
                {...form.register("classId", { valueAsNumber: true })}
              >
                {reference.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="change-location"
              label="Student location"
              required
              error={form.formState.errors.schoolLocationId?.message}
            >
              <select
                id="change-location"
                className="native-select"
                {...form.register("schoolLocationId", { valueAsNumber: true })}
              >
                {reference.locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="change-date"
              label="Effective date"
              required
              error={form.formState.errors.startedOn?.message}
              className="sm:col-span-2"
            >
              <Input
                id="change-date"
                type="date"
                {...form.register("startedOn")}
              />
            </FormField>
          </div>
          <DialogFooter>
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <LoaderCircle className="animate-spin" />
              )}
              Confirm change
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
