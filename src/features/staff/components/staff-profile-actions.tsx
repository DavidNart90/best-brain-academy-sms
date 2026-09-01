"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, LoaderCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveStaff,
  assignStaffClass,
  endStaffAssignment,
} from "../server/actions";
import type { StaffProfile, StaffReferenceData } from "../types";

export function StaffProfileActions({
  staff,
  reference,
}: {
  staff: StaffProfile;
  reference: StaffReferenceData;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const year =
    reference.academicYears.find((item) => item.isCurrent) ??
    reference.academicYears[0];
  const terms = reference.academicTerms.filter(
    (item) => item.academicYearId === year?.id,
  );
  const term = terms.find((item) => item.isCurrent) ?? terms[0];
  async function addAssignment(formData: FormData) {
    setPending(true);
    setMessage("");
    const result = await assignStaffClass({
      staffId: staff.id,
      academicYearId: formData.get("academicYearId"),
      academicTermId: formData.get("academicTermId"),
      classId: formData.get("classId"),
      startedOn: formData.get("startedOn"),
    });
    setPending(false);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }
  async function endAssignment(id: number) {
    setPending(true);
    setMessage("");
    const result = await endStaffAssignment({
      staffId: staff.id,
      assignmentId: id,
      endedOn: new Date().toISOString().slice(0, 10),
    });
    setPending(false);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }
  async function archive() {
    if (
      !window.confirm(
        "Archive this staff record? Assignment and audit history will remain available.",
      )
    )
      return;
    setPending(true);
    setMessage("");
    const result = await archiveStaff(staff.id);
    setPending(false);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }
  return (
    <div className="space-y-4">
      {staff.status === "active" && (
        <form
          action={addAssignment}
          className="panel p-5"
          aria-labelledby="add-staff-assignment-title"
        >
          <div className="mb-4">
            <h2
              id="add-staff-assignment-title"
              className="text-base font-semibold"
            >
              Add class assignment
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A new row is added; earlier assignments remain in history.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              className="native-select"
              name="academicYearId"
              defaultValue={year?.id}
              aria-label="Academic year"
              required
            >
              {reference.academicYears.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="native-select"
              name="academicTermId"
              defaultValue={term?.id}
              aria-label="Academic term"
              required
            >
              {terms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="native-select"
              name="classId"
              defaultValue=""
              aria-label="Class"
              required
            >
              <option value="" disabled>
                Choose class
              </option>
              {reference.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Input
              name="startedOn"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              aria-label="Assignment start date"
              required
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}{" "}
              Add assignment
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p className="text-sm font-medium" role="status">
          {message}
        </p>
      )}
      {staff.assignments.some((item) => item.status === "active") && (
        <div className="flex flex-wrap gap-2">
          {staff.assignments
            .filter((item) => item.status === "active")
            .map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => endAssignment(item.id)}
              >
                <X /> End {item.className}
              </Button>
            ))}
        </div>
      )}
      {staff.status !== "archived" && (
        <Button
          type="button"
          variant="outline"
          className="text-destructive"
          disabled={pending}
          onClick={archive}
        >
          <Archive /> Archive staff record
        </Button>
      )}
    </div>
  );
}
