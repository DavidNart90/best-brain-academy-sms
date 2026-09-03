"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Save, X } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  staffInputSchema,
  type StaffFormValues,
  type StaffInput,
} from "../schemas";
import { createStaff } from "../server/actions";
import type { StaffReferenceData } from "../types";

export function StaffForm({ reference }: { reference: StaffReferenceData }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const requestKey = useRef<string | null>(null);
  const form = useForm<StaffFormValues, unknown, StaffInput>({
    resolver: zodResolver(staffInputSchema),
    mode: "onBlur",
    defaultValues: {
      staffNumber: "",
      fullName: "",
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      email: "",
      staffType: "teaching",
      position: "Teacher",
      status: "active",
      dateJoined: "",
      knownSubjects: "",
      assignments: [],
    },
  });
  const assignments = useFieldArray({
    control: form.control,
    name: "assignments",
  });
  const values = useWatch({ control: form.control });
  const errors = form.formState.errors;
  const year = reference.academicYears.find((item) => item.isCurrent);
  const term = reference.academicTerms.find(
    (item) => item.isCurrent && item.academicYearId === year?.id,
  );
  const submit = async (input: StaffInput) => {
    requestKey.current ??= crypto.randomUUID();
    setMessage("");
    try {
      const result = await createStaff(input, requestKey.current);
      setMessage(result.message);
      if (result.ok && result.staffId)
        router.push(`/staff/${result.staffId}?notice=staff-added`);
    } catch {
      setMessage(
        "The result could not be confirmed. Retry without changing the details; the same request will not add a duplicate.",
      );
    }
  };
  return (
    <form
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      noValidate
      className="space-y-6"
    >
      <section
        className="panel p-5 sm:p-6"
        aria-labelledby="staff-details-title"
      >
        <div className="mb-5 border-b pb-4">
          <h2 id="staff-details-title" className="text-base font-semibold">
            Staff information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff IDs are assigned on save: BBS-Staff-001 onwards. This does not
            create a login account.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            id="full-name"
            label="Full name as supplied"
            required
            error={errors.fullName?.message}
            description="Keep the name order on the staff record."
          >
            <Input
              id="full-name"
              autoComplete="name"
              {...form.register("fullName")}
              aria-invalid={Boolean(errors.fullName)}
            />
          </FormField>
          <FormField
            id="phone"
            label="Phone"
            error={errors.phone?.message}
            description="Leave blank when not yet known."
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...form.register("phone")}
              aria-invalid={Boolean(errors.phone)}
            />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              aria-invalid={Boolean(errors.email)}
            />
          </FormField>
          <FormField id="staff-type" label="Staff type" required>
            <select
              id="staff-type"
              className="native-select"
              {...form.register("staffType", {
                onChange: (event) => {
                  if (event.target.value !== "teaching") {
                    form.setValue("knownSubjects", "");
                    assignments.replace([]);
                  }
                },
              })}
            >
              <option value="teaching">Teaching</option>
              <option value="non_teaching">Non-teaching</option>
            </select>
          </FormField>
          <FormField
            id="position"
            label="Position"
            required
            error={errors.position?.message}
          >
            <Input
              id="position"
              {...form.register("position")}
              aria-invalid={Boolean(errors.position)}
            />
          </FormField>
          <FormField id="status" label="Employment status" required>
            <select
              id="status"
              className="native-select"
              {...form.register("status")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <FormField
            id="date-joined"
            label="Date joined"
            error={errors.dateJoined?.message}
            description="Unknown employment dates may stay blank."
          >
            <Input
              id="date-joined"
              type="date"
              {...form.register("dateJoined")}
            />
          </FormField>
          <FormField
            id="known-subjects"
            label="Known teaching subjects"
            error={errors.knownSubjects?.message}
            description="Separate subjects with semicolons. This does not assign any class."
          >
            <Input
              id="known-subjects"
              disabled={values.staffType !== "teaching"}
              {...form.register("knownSubjects")}
              placeholder="Maths; Science; Computing"
            />
          </FormField>
        </div>
      </section>
      <section
        className="panel p-5 sm:p-6"
        aria-labelledby="staff-assignments-title"
      >
        <h2 id="staff-assignments-title" className="text-base font-semibold">
          Class and subject assignments (optional)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add one row per class and subject. A head-class-teacher appointment is
          separate. Leave unknown assignments unset.
        </p>
        {assignments.fields.map((field, index) => (
          <fieldset key={field.id} className="mt-5 border-t pt-4">
            <legend className="px-1 text-sm font-medium">
              Assignment {index + 1}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField id={`year-${field.id}`} label="Academic year" required>
                <select
                  id={`year-${field.id}`}
                  className="native-select"
                  {...form.register(`assignments.${index}.academicYearId`)}
                >
                  <option value="">Choose year</option>
                  {reference.academicYears.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id={`term-${field.id}`} label="Term" required>
                <select
                  id={`term-${field.id}`}
                  className="native-select"
                  {...form.register(`assignments.${index}.academicTermId`)}
                >
                  <option value="">Choose term</option>
                  {reference.academicTerms
                    .filter(
                      (item) =>
                        item.academicYearId ===
                        Number(values.assignments?.[index]?.academicYearId),
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField id={`class-${field.id}`} label="Class" required>
                <select
                  id={`class-${field.id}`}
                  className="native-select"
                  {...form.register(`assignments.${index}.classId`)}
                >
                  <option value="">Choose class</option>
                  {reference.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                id={`kind-${field.id}`}
                label="Assignment role"
                required
              >
                <select
                  id={`kind-${field.id}`}
                  className="native-select"
                  {...form.register(`assignments.${index}.assignmentKind`, {
                    onChange: (event) => {
                      if (event.target.value !== "teaching")
                        form.setValue(
                          `assignments.${index}.subjectName`,
                          "",
                        );
                    },
                  })}
                >
                  <option value="teaching">Subject teaching</option>
                  <option value="head">Head class teacher</option>
                  <option value="general">Class link — role unconfirmed</option>
                </select>
              </FormField>
              <FormField
                id={`subject-${field.id}`}
                label="Subject"
                description="For teaching only; All subjects is accepted."
                error={errors.assignments?.[index]?.subjectName?.message}
              >
                <Input
                  id={`subject-${field.id}`}
                  disabled={
                    values.assignments?.[index]?.assignmentKind !== "teaching"
                  }
                  {...form.register(`assignments.${index}.subjectName`)}
                />
              </FormField>
              <FormField
                id={`start-${field.id}`}
                label="Assignment starts"
                required
                error={errors.assignments?.[index]?.startedOn?.message}
              >
                <Input
                  id={`start-${field.id}`}
                  type="date"
                  {...form.register(`assignments.${index}.startedOn`)}
                />
              </FormField>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => assignments.remove(index)}
            >
              <X /> Remove assignment {index + 1}
            </Button>
          </fieldset>
        ))}
        <p className="mt-3 text-sm text-destructive" role="status">
          {errors.assignments?.root?.message ?? errors.assignments?.message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={
            values.staffType !== "teaching" || assignments.fields.length >= 100
          }
          onClick={() =>
            assignments.append({
              academicYearId: year?.id ?? "",
              academicTermId: term?.id ?? "",
              classId: "",
              startedOn: "",
              assignmentKind: "teaching",
              subjectName: "",
            })
          }
        >
          <Plus /> Add class / subject row
        </Button>
      </section>
      {message && (
        <p className="text-sm font-medium" role="status">
          {message}
        </p>
      )}
      {form.formState.isSubmitted && !form.formState.isValid && (
        <p className="text-sm text-destructive" role="alert">
          Review the required fields and assignment details before saving.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}{" "}
          Add staff member
        </Button>
      </div>
    </form>
  );
}
