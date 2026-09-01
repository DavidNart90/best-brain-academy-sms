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
  staffInputSchema,
  staffTypes,
  type StaffFormValues,
  type StaffInput,
} from "../schemas";
import { createStaff } from "../server/actions";
import type { StaffReferenceData } from "../types";

export function StaffForm({ reference }: { reference: StaffReferenceData }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const currentYear =
    reference.academicYears.find((item) => item.isCurrent) ??
    reference.academicYears[0];
  const currentTerm =
    reference.academicTerms.find(
      (item) => item.isCurrent && item.academicYearId === currentYear?.id,
    ) ??
    reference.academicTerms.find(
      (item) => item.academicYearId === currentYear?.id,
    );
  const form = useForm<StaffFormValues, unknown, StaffInput>({
    resolver: zodResolver(staffInputSchema),
    mode: "onBlur",
    defaultValues: {
      staffNumber: "",
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      email: "",
      staffType: "teaching",
      position: "",
      status: "active",
      dateJoined: "",
      academicYearId: currentYear?.id,
      academicTermId: currentTerm?.id,
      classId: "",
      assignmentStartedOn: new Date().toISOString().slice(0, 10),
    },
  });
  const selectedYear = Number(
    useWatch({ control: form.control, name: "academicYearId" }),
  );
  const terms = reference.academicTerms.filter(
    (item) => item.academicYearId === selectedYear,
  );
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    setMessage("");
    const result = await createStaff(values);
    setMessage(result.message);
    if (result.ok && result.staffId)
      router.push(`/staff/${result.staffId}?notice=staff-added`);
  });
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section
        className="panel p-5 sm:p-6"
        aria-labelledby="staff-details-title"
      >
        <div className="mb-5 border-b pb-4">
          <h2 id="staff-details-title" className="text-base font-semibold">
            Staff information
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates an employment record only. Login access is managed
            separately under Administrators.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            id="staff-number"
            label="Staff ID"
            required
            error={errors.staffNumber?.message}
            description="For example BBA/STF/0001."
          >
            <Input
              id="staff-number"
              {...form.register("staffNumber")}
              aria-invalid={Boolean(errors.staffNumber)}
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
              {...form.register("firstName")}
              aria-invalid={Boolean(errors.firstName)}
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
              {...form.register("lastName")}
              aria-invalid={Boolean(errors.lastName)}
            />
          </FormField>
          <FormField
            id="phone"
            label="Phone"
            required
            error={errors.phone?.message}
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
          <FormField
            id="staff-type"
            label="Staff type"
            required
            error={errors.staffType?.message}
          >
            <select
              id="staff-type"
              className="native-select"
              {...form.register("staffType")}
            >
              {staffTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "teaching" ? "Teaching" : "Non-teaching"}
                </option>
              ))}
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
          <FormField
            id="status"
            label="Employment status"
            required
            error={errors.status?.message}
          >
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
          >
            <Input
              id="date-joined"
              type="date"
              {...form.register("dateJoined")}
            />
          </FormField>
        </div>
      </section>
      <section
        className="panel p-5 sm:p-6"
        aria-labelledby="first-assignment-title"
      >
        <div className="mb-5 border-b pb-4">
          <h2 id="first-assignment-title" className="text-base font-semibold">
            First class assignment{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a class only when this staff member needs an academic
            assignment now.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="staff-year" label="Academic year">
            <select
              id="staff-year"
              className="native-select"
              {...form.register("academicYearId")}
            >
              <option value="">Choose year</option>
              {reference.academicYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="staff-term" label="Term">
            <select
              id="staff-term"
              className="native-select"
              {...form.register("academicTermId")}
            >
              <option value="">Choose term</option>
              {terms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="staff-class"
            label="Assigned class"
            error={errors.classId?.message}
          >
            <select
              id="staff-class"
              className="native-select"
              {...form.register("classId")}
            >
              <option value="">No class assignment</option>
              {reference.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="assignment-start" label="Assignment starts">
            <Input
              id="assignment-start"
              type="date"
              {...form.register("assignmentStartedOn")}
            />
          </FormField>
        </div>
      </section>
      {message && (
        <p
          className={
            message.includes("added")
              ? "text-sm font-medium text-success"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {message}
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
