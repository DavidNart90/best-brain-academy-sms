"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  staffUpdateSchema,
  type StaffUpdateFormValues,
  type StaffUpdateInput,
} from "../schemas";
import { updateStaff } from "../server/actions";
import type { StaffProfile } from "../types";

export function StaffEditForm({ staff }: { staff: StaffProfile }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const form = useForm<StaffUpdateFormValues, unknown, StaffUpdateInput>({
    resolver: zodResolver(staffUpdateSchema),
    mode: "onBlur",
    defaultValues: {
      staffId: staff.id,
      fullName: staff.fullName,
      firstName: staff.firstName ?? "",
      middleName: staff.middleName ?? "",
      lastName: staff.lastName ?? "",
      phone: staff.phone ?? "",
      email: staff.email ?? "",
      position: staff.position,
      status: staff.status === "archived" ? "inactive" : staff.status,
      dateJoined: staff.dateJoined ?? "",
      dateOfBirth: staff.dateOfBirth ?? "",
      knownSubjects: staff.knownSubjects.join("; "),
    },
  });
  const errors = form.formState.errors;
  const submit = async (input: StaffUpdateInput) => {
    setMessage("");
    try {
      const result = await updateStaff(input);
      setMessage(result.message);
      if (result.ok) router.refresh();
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
      aria-labelledby="edit-staff-title"
    >
      <div className="mb-5 border-b pb-4">
        <h2 id="edit-staff-title" className="text-base font-semibold">
          Edit profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update identity, contact and employment details. Staff ID and staff
          type cannot be changed here.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          id="edit-full-name"
          label="Full name as supplied"
          required
          error={errors.fullName?.message}
        >
          <Input
            id="edit-full-name"
            autoComplete="name"
            {...form.register("fullName")}
            aria-invalid={Boolean(errors.fullName)}
          />
        </FormField>
        <FormField id="edit-phone" label="Phone" error={errors.phone?.message}>
          <Input
            id="edit-phone"
            type="tel"
            autoComplete="tel"
            {...form.register("phone")}
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>
        <FormField id="edit-email" label="Email" error={errors.email?.message}>
          <Input
            id="edit-email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>
        <FormField
          id="edit-position"
          label="Position"
          required
          error={errors.position?.message}
        >
          <Input
            id="edit-position"
            {...form.register("position")}
            aria-invalid={Boolean(errors.position)}
          />
        </FormField>
        <FormField id="edit-status" label="Employment status" required>
          <select
            id="edit-status"
            className="native-select"
            {...form.register("status")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FormField>
        <FormField
          id="edit-date-joined"
          label="Date joined"
          error={errors.dateJoined?.message}
        >
          <Input
            id="edit-date-joined"
            type="date"
            {...form.register("dateJoined")}
          />
        </FormField>
        <FormField
          id="edit-date-of-birth"
          label="Date of birth"
          error={errors.dateOfBirth?.message}
          description="Optional. Must be before the date joined."
        >
          <Input
            id="edit-date-of-birth"
            type="date"
            {...form.register("dateOfBirth")}
            aria-invalid={Boolean(errors.dateOfBirth)}
          />
        </FormField>
        {staff.staffType === "teaching" && (
          <FormField
            id="edit-known-subjects"
            label="Known teaching subjects"
            error={errors.knownSubjects?.message}
            description="Separate subjects with semicolons."
          >
            <Input
              id="edit-known-subjects"
              {...form.register("knownSubjects")}
              placeholder="Maths; Science; Computing"
            />
          </FormField>
        )}
      </div>
      {message && (
        <p className="mt-4 text-sm font-medium" role="status">
          {message}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Save />
          )}{" "}
          Save changes
        </Button>
      </div>
    </form>
  );
}
