import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import {
  EnrollmentChangeDialog,
  GuardianLinkDialog,
  StudentPhotoUpload,
} from "@/features/students/components/student-profile-actions";
import {
  getStudentProfile,
  getStudentReferenceData,
} from "@/features/students/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
} as const;
const enrollmentLabels = {
  active: "Active",
  completed: "Completed",
  transferred: "Transferred",
  withdrawn: "Withdrawn",
} as const;
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Not recorded";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-6">{value || "Not recorded"}</dd>
    </div>
  );
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("students.read");
  if (!context) return <PermissionDenied />;
  const studentId = Number((await params).id);
  if (!Number.isInteger(studentId) || studentId < 1) notFound();
  const [student, reference] = await Promise.all([
    getStudentProfile(studentId),
    getStudentReferenceData(),
  ]);
  if (!student) notFound();
  const canManage = hasPermission(context, "students.manage");
  const current = student.enrollments.find((item) => item.status === "active");
  const initials =
    `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/students">
          <ArrowLeft /> Back to students
        </Link>
      </Button>
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-brand-subtle text-xl font-semibold text-primary">
            {student.hasPhoto ? (
              <Image
                src={`/api/students/${student.id}/photo`}
                alt={`${student.fullName} profile photo`}
                fill
                sizes="96px"
                unoptimized
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {student.fullName}
              </h1>
              <StatusBadge status={statusLabels[student.status]} />
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {student.admissionNumber}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>{current?.className ?? "No active class"}</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {current?.studentLocationName ?? "No active student location"}
              </span>
            </div>
          </div>
          {canManage && <StudentPhotoUpload studentId={student.id} />}
        </div>
        <nav
          aria-label="Student profile sections"
          className="flex gap-1 overflow-x-auto border-t bg-muted/25 px-4 py-2"
        >
          <span className="rounded-md bg-card px-3 py-2 text-sm font-semibold text-primary shadow-xs">
            Profile
          </span>
          {["Financial account", "Invoices", "Payments", "Receipts"].map(
            (label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm text-muted-foreground"
                aria-disabled="true"
              >
                <LockKeyhole className="size-3.5" />
                {label} · Phase 3
              </span>
            ),
          )}
        </nav>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section
          className="panel p-5 sm:p-6"
          aria-labelledby="personal-heading"
        >
          <h2 id="personal-heading" className="text-base font-semibold">
            Personal details
          </h2>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Detail
              label="Gender"
              value={<span className="capitalize">{student.gender}</span>}
            />
            <Detail label="Date of birth" value={date(student.dateOfBirth)} />
            <Detail
              label="Admission date"
              value={date(student.admissionDate)}
            />
            <Detail label="Previous school" value={student.previousSchool} />
            <Detail
              label="Religious denomination"
              value={student.religiousDenomination}
            />
            <Detail
              label="Disability"
              value={student.hasDisability ? student.disabilityDetails : "No"}
            />
            <Detail label="Notes" value={student.notes} />
          </dl>
        </section>

        <section
          className="panel p-5 sm:p-6"
          aria-labelledby="guardian-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="guardian-heading" className="text-base font-semibold">
                Guardians
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {student.guardians.length} linked contact
                {student.guardians.length === 1 ? "" : "s"}
              </p>
            </div>
            {canManage && <GuardianLinkDialog studentId={student.id} />}
          </div>
          <div className="mt-5 divide-y">
            {student.guardians.map((guardian) => (
              <article key={guardian.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{guardian.fullName}</h3>
                  {guardian.isPrimary && (
                    <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-primary">
                      Primary
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {guardian.relationship}
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <a
                    className="flex items-center gap-2 hover:text-primary"
                    href={`tel:${guardian.primaryPhone}`}
                  >
                    <Phone className="size-4" />
                    {guardian.primaryPhone}
                  </a>
                  {guardian.email && (
                    <a
                      className="flex items-center gap-2 hover:text-primary"
                      href={`mailto:${guardian.email}`}
                    >
                      <Mail className="size-4" />
                      {guardian.email}
                    </a>
                  )}
                  {guardian.address && (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0" />
                      {guardian.address}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-5 sm:p-6" aria-labelledby="history-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="history-heading" className="text-base font-semibold">
              Enrollment history
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Class and student-location changes remain visible here.
            </p>
          </div>
          {canManage && (
            <EnrollmentChangeDialog
              studentId={student.id}
              reference={reference}
            />
          )}
        </div>
        <ol className="mt-6 space-y-0">
          {student.enrollments.map((enrollment, index) => (
            <li
              key={enrollment.id}
              className="relative grid grid-cols-[20px_1fr] gap-4 pb-6 last:pb-0"
            >
              {index < student.enrollments.length - 1 && (
                <span className="absolute top-5 bottom-0 left-[9px] w-px bg-border" />
              )}
              <span
                className={`relative mt-1.5 size-5 rounded-full border-4 border-card ${enrollment.status === "active" ? "bg-primary" : "bg-muted-foreground/40"}`}
              />
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{enrollment.className}</h3>
                    <StatusBadge status={enrollmentLabels[enrollment.status]} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {enrollment.academicYearName} ·{" "}
                    {enrollment.academicTermName} ·{" "}
                    {enrollment.studentLocationName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {date(enrollment.startedOn)}
                  {enrollment.endedOn
                    ? ` – ${date(enrollment.endedOn)}`
                    : " – Present"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
