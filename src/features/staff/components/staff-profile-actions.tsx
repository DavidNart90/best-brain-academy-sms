"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
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
  const [yearId, setYearId] = useState(
    String(reference.academicYears.find((item) => item.isCurrent)?.id ?? ""),
  );
  const [assignmentKind, setAssignmentKind] = useState("teaching");
  const assignmentFormRef = useRef<HTMLFormElement>(null);
  const terms = reference.academicTerms.filter(
    (item) => item.academicYearId === Number(yearId),
  );
  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true);
    setMessage("");
    try {
      const result = await action();
      setMessage(result.message);
      if (result.ok) router.refresh();
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh the profile before trying again.",
      );
    } finally {
      setPending(false);
    }
  }
  async function addAssignment(data: FormData) {
    setMessage("");
    setPending(true);
    try {
      const result = await assignStaffClass({
        staffId: staff.id,
        academicYearId: data.get("academicYearId"),
        academicTermId: data.get("academicTermId"),
        classId: data.get("classId"),
        startedOn: data.get("startedOn"),
        assignmentKind: data.get("assignmentKind"),
        subjectName: data.get("subjectName"),
      });
      setMessage(result.message);
      if (result.ok) {
        assignmentFormRef.current?.reset();
        setAssignmentKind("teaching");
        router.refresh();
      }
    } catch {
      setMessage(
        "The result could not be confirmed. Refresh the profile before trying again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-4">
      {staff.status === "active" && staff.staffType === "teaching" && (
        <form
          ref={assignmentFormRef}
          action={addAssignment}
          className="panel p-5"
          aria-labelledby="add-staff-assignment-title"
        >
          <h2
            id="add-staff-assignment-title"
            className="text-base font-semibold"
          >
            Add class / subject assignment
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add another subject or class without creating another staff profile.
            Head class teacher is a separate appointment.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField id="assignment-year" label="Academic year" required>
              <select
                id="assignment-year"
                name="academicYearId"
                className="native-select"
                value={yearId}
                onChange={(event) => setYearId(event.target.value)}
                required
              >
                <option value="">Choose year</option>
                {reference.academicYears.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="assignment-term" label="Academic term" required>
              <select
                key={yearId}
                id="assignment-term"
                name="academicTermId"
                className="native-select"
                defaultValue={terms.find((item) => item.isCurrent)?.id ?? ""}
                required
              >
                <option value="">Choose term</option>
                {terms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="assignment-class" label="Class" required>
              <select
                id="assignment-class"
                name="classId"
                className="native-select"
                defaultValue=""
                required
              >
                <option value="">Choose class</option>
                {reference.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="assignment-kind" label="Assignment role" required>
              <select
                id="assignment-kind"
                name="assignmentKind"
                className="native-select"
                value={assignmentKind}
                onChange={(event) => setAssignmentKind(event.target.value)}
              >
                <option value="teaching">Subject teaching</option>
                <option value="head">Head class teacher</option>
                <option value="general">Class link — role unconfirmed</option>
              </select>
            </FormField>
            <FormField
              id="assignment-subject"
              label="Subject"
              description={
                assignmentKind === "teaching"
                  ? "Enter All subjects when appropriate."
                  : "Only used for subject teaching assignments."
              }
            >
              <Input
                id="assignment-subject"
                name="subjectName"
                disabled={assignmentKind !== "teaching"}
              />
            </FormField>
            <FormField id="assignment-start" label="Assignment starts" required>
              <Input
                id="assignment-start"
                name="startedOn"
                type="date"
                required
              />
            </FormField>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              <Plus /> {pending ? "Saving…" : "Add assignment"}
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p className="text-sm font-medium" role="status">
          {message}
        </p>
      )}
      {staff.assignments
        .filter((item) => item.status === "active")
        .map((item) => (
          <form
            key={item.id}
            className="panel flex flex-wrap items-end gap-3 p-4"
            action={async (data) => {
              await run(() =>
                endStaffAssignment({
                  staffId: staff.id,
                  assignmentId: item.id,
                  endedOn: data.get("endedOn"),
                }),
              );
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-medium">
                {item.className} ·{" "}
                {item.assignmentKind === "head"
                  ? "Head class teacher"
                  : (item.subjectName ?? "Class link")}
              </p>
              <FormField
                id={`end-${item.id}`}
                label="Assignment end date"
                required
              >
                <Input
                  id={`end-${item.id}`}
                  type="date"
                  name="endedOn"
                  min={item.startedOn}
                  required
                />
              </FormField>
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              End assignment
            </Button>
          </form>
        ))}
      {staff.status !== "archived" && (
        <Button
          type="button"
          variant="outline"
          className="text-destructive"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "Archive this staff record? Assignment and audit history will remain available.",
              )
            )
              void run(() => archiveStaff(staff.id));
          }}
        >
          <Archive /> Archive staff record
        </Button>
      )}
    </div>
  );
}
