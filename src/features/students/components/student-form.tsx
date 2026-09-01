"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  studentGenders,
  studentInputSchema,
  studentStatuses,
  type StudentFormValues,
  type StudentInput,
} from "../schemas";
import { createStudent } from "../server/actions";
import type { StudentReferenceData } from "../types";

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

export function StudentForm({
  reference,
}: {
  reference: StudentReferenceData;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const currentYear =
    reference.academicYears.find((year) => year.isCurrent) ??
    reference.academicYears[0];
  const currentTerm =
    reference.academicTerms.find((term) => term.isCurrent) ??
    reference.academicTerms.find(
      (term) => term.academicYearId === currentYear?.id,
    );
  const form = useForm<StudentFormValues, unknown, StudentInput>({
    resolver: zodResolver(studentInputSchema),
    mode: "onBlur",
    defaultValues: {
      admissionNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "female",
      dateOfBirth: "",
      admissionDate: new Date().toISOString().slice(0, 10),
      status: "active",
      hasDisability: "no",
      disabilityDetails: "",
      religiousDenomination: "",
      previousSchool: "",
      notes: "",
      guardianName: "",
      guardianRelationship: "",
      guardianPhone: "",
      guardianAlternativePhone: "",
      guardianEmail: "",
      guardianAddress: "",
      academicYearId: currentYear?.id,
      academicTermId: currentTerm?.id,
      classId: reference.classes[0]?.id,
      schoolLocationId: reference.locations[0]?.id,
    },
  });
  const selectedYear = Number(
    useWatch({ control: form.control, name: "academicYearId" }),
  );
  const availableTerms = reference.academicTerms.filter(
    (term) => term.academicYearId === selectedYear,
  );
  const hasDisability =
    useWatch({ control: form.control, name: "hasDisability" }) === "yes";
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await createStudent(values);
    setMessage(result.message);
    if (result.ok && result.studentId)
      router.push(`/students/${result.studentId}?notice=student-added`);
    else if (result.ok) router.push("/students?notice=student-added");
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section
        className="panel p-5 sm:p-6"
        aria-labelledby="student-details-title"
      >
        <div className="mb-5 border-b pb-4">
          <h2 id="student-details-title" className="text-base font-semibold">
            Student information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the student’s identity exactly as the school will use it.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            id="admission-number"
            label="Admission number"
            required
            error={errors.admissionNumber?.message}
            description="Unique school identifier, for example BBA/STU/2026/0001."
          >
            <Input
              id="admission-number"
              autoComplete="off"
              aria-invalid={Boolean(errors.admissionNumber)}
              aria-describedby={describedBy(
                "admission-number",
                errors.admissionNumber?.message,
              )}
              {...form.register("admissionNumber")}
            />
          </FormField>
          <FormField
            id="first-name"
            label="First name"
            required
            error={errors.firstName?.message}
          >
            <Input
              id="first-name"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={describedBy(
                "first-name",
                errors.firstName?.message,
              )}
              {...form.register("firstName")}
            />
          </FormField>
          <FormField
            id="middle-name"
            label="Middle name"
            error={errors.middleName?.message}
          >
            <Input
              id="middle-name"
              autoComplete="additional-name"
              aria-invalid={Boolean(errors.middleName)}
              {...form.register("middleName")}
            />
          </FormField>
          <FormField
            id="last-name"
            label="Last name"
            required
            error={errors.lastName?.message}
          >
            <Input
              id="last-name"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={describedBy(
                "last-name",
                errors.lastName?.message,
              )}
              {...form.register("lastName")}
            />
          </FormField>
          <FormField
            id="gender"
            label="Gender"
            required
            error={errors.gender?.message}
          >
            <select
              id="gender"
              className="native-select"
              aria-invalid={Boolean(errors.gender)}
              {...form.register("gender")}
            >
              {studentGenders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender === "female" ? "Female" : "Male"}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="date-of-birth"
            label="Date of birth"
            error={errors.dateOfBirth?.message}
          >
            <Input
              id="date-of-birth"
              type="date"
              aria-invalid={Boolean(errors.dateOfBirth)}
              aria-describedby={describedBy(
                "date-of-birth",
                errors.dateOfBirth?.message,
              )}
              {...form.register("dateOfBirth")}
            />
          </FormField>
          <FormField
            id="student-status"
            label="Student status"
            required
            error={errors.status?.message}
          >
            <select
              id="student-status"
              className="native-select"
              {...form.register("status")}
            >
              {studentStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="admission-date"
            label="Admission date"
            required
            error={errors.admissionDate?.message}
          >
            <Input
              id="admission-date"
              type="date"
              aria-invalid={Boolean(errors.admissionDate)}
              aria-describedby={describedBy(
                "admission-date",
                errors.admissionDate?.message,
              )}
              {...form.register("admissionDate")}
            />
          </FormField>
        </div>
      </section>

      <section className="panel p-5 sm:p-6" aria-labelledby="enrollment-title">
        <div className="mb-5 border-b pb-4">
          <h2 id="enrollment-title" className="text-base font-semibold">
            Enrollment
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This becomes the student’s first enrollment record; later changes
            will create new history.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            id="academic-year"
            label="Academic year"
            required
            error={errors.academicYearId?.message}
          >
            <select
              id="academic-year"
              className="native-select"
              aria-invalid={Boolean(errors.academicYearId)}
              {...form.register("academicYearId", {
                valueAsNumber: true,
                onChange: (event) => {
                  const nextYear = Number(event.target.value);
                  const nextTerm = reference.academicTerms.find(
                    (term) => term.academicYearId === nextYear,
                  );
                  form.setValue("academicTermId", nextTerm?.id ?? 0, {
                    shouldValidate: true,
                  });
                },
              })}
            >
              {reference.academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="academic-term"
            label="Term"
            required
            error={errors.academicTermId?.message}
          >
            <select
              id="academic-term"
              className="native-select"
              aria-invalid={Boolean(errors.academicTermId)}
              {...form.register("academicTermId", { valueAsNumber: true })}
            >
              {availableTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="student-class"
            label="Class"
            required
            error={errors.classId?.message}
          >
            <select
              id="student-class"
              className="native-select"
              aria-invalid={Boolean(errors.classId)}
              {...form.register("classId", { valueAsNumber: true })}
            >
              {reference.classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="student-location"
            label="Student location"
            required
            error={errors.schoolLocationId?.message}
          >
            <select
              id="student-location"
              className="native-select"
              aria-invalid={Boolean(errors.schoolLocationId)}
              {...form.register("schoolLocationId", { valueAsNumber: true })}
            >
              {reference.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="panel p-5 sm:p-6" aria-labelledby="guardian-title">
        <div className="mb-5 border-b pb-4">
          <h2 id="guardian-title" className="text-base font-semibold">
            Primary guardian
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add one actionable contact for the student.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            id="guardian-name"
            label="Guardian name"
            required
            error={errors.guardianName?.message}
          >
            <Input
              id="guardian-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.guardianName)}
              {...form.register("guardianName")}
            />
          </FormField>
          <FormField
            id="guardian-relationship"
            label="Relationship"
            required
            error={errors.guardianRelationship?.message}
          >
            <Input
              id="guardian-relationship"
              placeholder="Mother, father, aunt…"
              aria-invalid={Boolean(errors.guardianRelationship)}
              {...form.register("guardianRelationship")}
            />
          </FormField>
          <FormField
            id="guardian-phone"
            label="Primary phone"
            required
            error={errors.guardianPhone?.message}
          >
            <Input
              id="guardian-phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.guardianPhone)}
              {...form.register("guardianPhone")}
            />
          </FormField>
          <FormField
            id="guardian-alt-phone"
            label="Alternative phone"
            error={errors.guardianAlternativePhone?.message}
          >
            <Input
              id="guardian-alt-phone"
              type="tel"
              aria-invalid={Boolean(errors.guardianAlternativePhone)}
              {...form.register("guardianAlternativePhone")}
            />
          </FormField>
          <FormField
            id="guardian-email"
            label="Email"
            error={errors.guardianEmail?.message}
          >
            <Input
              id="guardian-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.guardianEmail)}
              {...form.register("guardianEmail")}
            />
          </FormField>
          <FormField
            id="guardian-address"
            label="Address"
            error={errors.guardianAddress?.message}
          >
            <Input
              id="guardian-address"
              autoComplete="street-address"
              aria-invalid={Boolean(errors.guardianAddress)}
              {...form.register("guardianAddress")}
            />
          </FormField>
        </div>
      </section>

      <section className="panel p-5 sm:p-6" aria-labelledby="additional-title">
        <div className="mb-5 border-b pb-4">
          <h2 id="additional-title" className="text-base font-semibold">
            Additional information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record relevant wellbeing and background information for authorized
            school staff.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="has-disability"
            label="Does the student have a disability?"
            required
            error={errors.hasDisability?.message}
          >
            <select
              id="has-disability"
              className="native-select"
              aria-invalid={Boolean(errors.hasDisability)}
              {...form.register("hasDisability", {
                onChange: (event) => {
                  if (event.target.value === "no")
                    form.setValue("disabilityDetails", "", {
                      shouldValidate: true,
                    });
                },
              })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </FormField>
          <FormField
            id="religious-denomination"
            label="Religious denomination"
            required
            error={errors.religiousDenomination?.message}
          >
            <Input
              id="religious-denomination"
              aria-invalid={Boolean(errors.religiousDenomination)}
              aria-describedby={describedBy(
                "religious-denomination",
                errors.religiousDenomination?.message,
              )}
              {...form.register("religiousDenomination")}
            />
          </FormField>
          {hasDisability && (
            <FormField
              id="disability-details"
              label="Disability details"
              required
              error={errors.disabilityDetails?.message}
              description="State the disability and any support the school should know about."
              className="sm:col-span-2"
            >
              <textarea
                id="disability-details"
                rows={3}
                className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-invalid={Boolean(errors.disabilityDetails)}
                aria-describedby={describedBy(
                  "disability-details",
                  errors.disabilityDetails?.message,
                )}
                {...form.register("disabilityDetails")}
              />
            </FormField>
          )}
          <FormField
            id="previous-school"
            label="Previous school"
            error={errors.previousSchool?.message}
          >
            <Input
              id="previous-school"
              aria-invalid={Boolean(errors.previousSchool)}
              {...form.register("previousSchool")}
            />
          </FormField>
          <FormField
            id="student-notes"
            label="Notes"
            error={errors.notes?.message}
          >
            <textarea
              id="student-notes"
              rows={3}
              className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={Boolean(errors.notes)}
              {...form.register("notes")}
            />
          </FormField>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <p
          className={
            message
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {message ||
            "Saving creates the student, guardian link and first enrollment together."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/students")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            {form.formState.isSubmitting ? "Adding student…" : "Add student"}
          </Button>
        </div>
      </div>
    </form>
  );
}
