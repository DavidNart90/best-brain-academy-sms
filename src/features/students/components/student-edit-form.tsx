"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  studentGenders,
  studentUpdateSchema,
  type StudentUpdateFormValues,
  type StudentUpdateInput,
} from "../schemas";
import { updateStudent } from "../server/actions";
import type { StudentProfile } from "../types";

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

function editValues(student: StudentProfile): StudentUpdateFormValues {
  return {
    studentId: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName,
    middleName: student.middleName ?? "",
    lastName: student.lastName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth ?? "",
    admissionDate: student.admissionDate,
    hasDisability: student.hasDisability ? "yes" : "no",
    disabilityDetails: student.disabilityDetails ?? "",
    religiousDenomination: student.religiousDenomination,
    previousSchool: student.previousSchool ?? "",
    notes: student.notes ?? "",
  };
}

export function StudentEditForm({ student }: { student: StudentProfile }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const form = useForm<StudentUpdateFormValues, unknown, StudentUpdateInput>({
    resolver: zodResolver(studentUpdateSchema),
    mode: "onBlur",
    defaultValues: editValues(student),
  });
  const hasDisability =
    useWatch({ control: form.control, name: "hasDisability" }) === "yes";
  const errors = form.formState.errors;

  const submit = async (input: StudentUpdateInput) => {
    setMessage("");
    setSucceeded(false);
    try {
      const result = await updateStudent(input);
      setMessage(result.message);
      setSucceeded(result.ok);
      if (result.ok) {
        form.reset({
          ...input,
          middleName: input.middleName ?? "",
          dateOfBirth: input.dateOfBirth ?? "",
          hasDisability: input.hasDisability ? "yes" : "no",
          disabilityDetails: input.disabilityDetails ?? "",
          previousSchool: input.previousSchool ?? "",
          notes: input.notes ?? "",
        });
        router.refresh();
      }
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh the profile before trying again.",
      );
    }
  };

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      noValidate
      className="panel p-5 sm:p-6"
      aria-labelledby="edit-student-title"
    >
      <div className="mb-5 border-b pb-4">
        <h2 id="edit-student-title" className="text-base font-semibold">
          Edit student details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Correct identity and personal information here. Status, guardians and
          class enrollment are managed separately so their history stays intact.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          id="edit-student-admission-number"
          label="Admission number"
          required
          error={errors.admissionNumber?.message}
          description="Use BBA- followed by at least three digits."
        >
          <Input
            id="edit-student-admission-number"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            pattern="BBA-[0-9]{3,36}"
            aria-invalid={Boolean(errors.admissionNumber)}
            aria-describedby={describedBy(
              "edit-student-admission-number",
              errors.admissionNumber?.message,
            )}
            {...form.register("admissionNumber")}
          />
        </FormField>
        <FormField
          id="edit-student-first-name"
          label="First name"
          required
          error={errors.firstName?.message}
        >
          <Input
            id="edit-student-first-name"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={describedBy(
              "edit-student-first-name",
              errors.firstName?.message,
            )}
            {...form.register("firstName")}
          />
        </FormField>
        <FormField
          id="edit-student-middle-name"
          label="Middle name"
          error={errors.middleName?.message}
        >
          <Input
            id="edit-student-middle-name"
            autoComplete="additional-name"
            aria-invalid={Boolean(errors.middleName)}
            {...form.register("middleName")}
          />
        </FormField>
        <FormField
          id="edit-student-last-name"
          label="Last name"
          required
          error={errors.lastName?.message}
        >
          <Input
            id="edit-student-last-name"
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={describedBy(
              "edit-student-last-name",
              errors.lastName?.message,
            )}
            {...form.register("lastName")}
          />
        </FormField>
        <FormField
          id="edit-student-gender"
          label="Gender"
          required
          error={errors.gender?.message}
        >
          <select
            id="edit-student-gender"
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
          id="edit-student-date-of-birth"
          label="Date of birth"
          error={errors.dateOfBirth?.message}
        >
          <Input
            id="edit-student-date-of-birth"
            type="date"
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby={describedBy(
              "edit-student-date-of-birth",
              errors.dateOfBirth?.message,
            )}
            {...form.register("dateOfBirth")}
          />
        </FormField>
        <FormField
          id="edit-student-admission-date"
          label="Admission date"
          required
          error={errors.admissionDate?.message}
        >
          <Input
            id="edit-student-admission-date"
            type="date"
            aria-invalid={Boolean(errors.admissionDate)}
            aria-describedby={describedBy(
              "edit-student-admission-date",
              errors.admissionDate?.message,
            )}
            {...form.register("admissionDate")}
          />
        </FormField>
        <FormField
          id="edit-student-religious-denomination"
          label="Religious denomination"
          required
          error={errors.religiousDenomination?.message}
        >
          <Input
            id="edit-student-religious-denomination"
            aria-invalid={Boolean(errors.religiousDenomination)}
            aria-describedby={describedBy(
              "edit-student-religious-denomination",
              errors.religiousDenomination?.message,
            )}
            {...form.register("religiousDenomination")}
          />
        </FormField>
        <FormField
          id="edit-student-has-disability"
          label="Does the student have a disability?"
          required
          error={errors.hasDisability?.message}
        >
          <select
            id="edit-student-has-disability"
            className="native-select"
            aria-invalid={Boolean(errors.hasDisability)}
            {...form.register("hasDisability", {
              onChange: (event) => {
                if (event.target.value === "no")
                  form.setValue("disabilityDetails", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
              },
            })}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FormField>
        {hasDisability && (
          <FormField
            id="edit-student-disability-details"
            label="Disability details"
            required
            error={errors.disabilityDetails?.message}
            description="State the disability and any support the school should know about."
            className="sm:col-span-2 lg:col-span-3"
          >
            <textarea
              id="edit-student-disability-details"
              rows={3}
              className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={Boolean(errors.disabilityDetails)}
              aria-describedby={describedBy(
                "edit-student-disability-details",
                errors.disabilityDetails?.message,
              )}
              {...form.register("disabilityDetails")}
            />
          </FormField>
        )}
        <FormField
          id="edit-student-previous-school"
          label="Previous school"
          error={errors.previousSchool?.message}
          className="lg:col-span-2"
        >
          <Input
            id="edit-student-previous-school"
            aria-invalid={Boolean(errors.previousSchool)}
            {...form.register("previousSchool")}
          />
        </FormField>
        <FormField
          id="edit-student-notes"
          label="Notes"
          error={errors.notes?.message}
          className="lg:col-span-2"
        >
          <textarea
            id="edit-student-notes"
            rows={3}
            className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-invalid={Boolean(errors.notes)}
            {...form.register("notes")}
          />
        </FormField>
      </div>

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
          {message || "Changes are audited when you save them."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            onClick={() => {
              form.reset(editValues(student));
              setMessage("");
              setSucceeded(false);
            }}
          >
            <RotateCcw /> Reset changes
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            {form.formState.isSubmitting ? "Saving changes…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
