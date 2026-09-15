"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileStack,
  LoaderCircle,
  Printer,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EndTermInvoiceSetup } from "../types";
import {
  generateEndTermInvoices,
  saveEndTermInvoiceConfiguration,
} from "../server/actions";

export function EndTermInvoiceManager({
  setup,
  classes,
  canManage,
  invoiceCount,
}: {
  setup: EndTermInvoiceSetup;
  classes: Array<{ id: number; name: string }>;
  canManage: boolean;
  invoiceCount: number;
}) {
  const router = useRouter();
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number | null>(null);
  const [classId, setClassId] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [pending, setPending] = useState<"save" | "generate" | null>(null);
  const [message, setMessage] = useState("");
  const [skipped, setSkipped] = useState<
    Array<{ studentId: number; reason: string }>
  >([]);
  const noteLocked = setup.generatedCount > 0;
  const canGenerate = Boolean(setup.configurationId && setup.targetTermId);
  const printQuery = classId ? `?classId=${classId}` : "";

  async function saveNotes() {
    setPending("save");
    setMessage("");
    try {
      const result = await saveEndTermInvoiceConfiguration({
        sourceTermId: setup.sourceTermId,
        parentNotes: notesRef.current?.value ?? "",
      });
      setMessage(result.message);
      if (result.ok) router.refresh();
    } catch {
      setMessage(
        "The note could not be confirmed. Refresh before trying again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function generateBatch() {
    setPending("generate");
    setMessage("");
    setSkipped([]);
    try {
      const result = await generateEndTermInvoices({
        sourceTermId: setup.sourceTermId,
        classId,
        afterStudentId: cursorRef.current,
      });
      setMessage(result.message);
      setSkipped(result.result?.skipped ?? []);
      cursorRef.current = result.result?.nextCursor ?? null;
      setHasMore(result.result?.hasMore ?? false);
      if (result.ok) router.refresh();
    } catch {
      setMessage(
        "The batch result could not be confirmed. Refresh before trying again.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="end-term-run-title"
    >
      <div className="border-b px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="end-term-run-title" className="text-base font-semibold">
              {setup.sourceTermName} closing run
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Issues school-fee invoices for{" "}
              {setup.targetAcademicYearName ?? "the next academic year"} ·{" "}
              {setup.targetTermName ?? "next term"}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            {setup.ready ? (
              <>
                <CheckCircle2 className="size-4 text-success" /> School-wide
                ready
              </>
            ) : (
              <>
                <TriangleAlert className="size-4 text-warning" /> Setup
                incomplete
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div>
          <label htmlFor="end-term-parent-notes" className="field-label">
            Note to parents
          </label>
          <textarea
            id="end-term-parent-notes"
            ref={notesRef}
            defaultValue={setup.parentNotes}
            maxLength={2000}
            rows={5}
            disabled={!canManage || noteLocked}
            placeholder="Optional closing note, reopening instructions or payment reminder."
            className="mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {noteLocked
                ? "Locked because invoices have already been issued."
                : "This note becomes an immutable snapshot on every invoice."}
            </span>
            <span>Up to 2,000 characters</span>
          </div>
          {canManage && !noteLocked ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void saveNotes()}
              disabled={pending !== null || !setup.targetTermId}
            >
              {pending === "save" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              Save invoice note
            </Button>
          ) : null}
        </div>

        <dl className="divide-y border-y text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Students in scope</dt>
            <dd className="font-semibold tabular-nums">{setup.studentCount}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Invoices issued</dt>
            <dd className="font-semibold tabular-nums">
              {setup.generatedCount}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">School-fee gaps</dt>
            <dd className="font-semibold tabular-nums">
              {setup.missingSchoolFeeCount}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Prospectus gaps</dt>
            <dd className="font-semibold tabular-nums">
              {setup.missingProspectusCount}
            </dd>
          </div>
        </dl>
      </div>

      {setup.reason ? (
        <div className="mx-5 mb-5 rounded-lg border border-warning/35 bg-warning-soft p-4 text-sm sm:mx-6 sm:mb-6">
          <p className="font-semibold">Before a school-wide run</p>
          <p className="mt-1 text-muted-foreground">{setup.reason}</p>
          {canManage &&
          (setup.missingSchoolFeeCount > 0 ||
            setup.missingProspectusCount > 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/financials/fees">Configure school fees</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/library">Configure Books & Prospectus</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="border-t bg-muted/30 px-5 py-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,280px)_auto] sm:items-end">
          <div className="field">
            <label htmlFor="end-term-class" className="field-label">
              Generation and print scope
            </label>
            <select
              id="end-term-class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                cursorRef.current = null;
                setHasMore(false);
              }}
              className="native-select w-full"
            >
              <option value="">Entire school</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                onClick={() => void generateBatch()}
                disabled={pending !== null || !canGenerate}
              >
                {pending === "generate" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <FileStack />
                )}
                {hasMore ? "Generate next 50" : "Generate batch of 50"}
              </Button>
            ) : null}
            {invoiceCount > 0 ? (
              <Button asChild variant="outline">
                <Link
                  href={`/financials/end-of-term-invoices/print${printQuery}`}
                >
                  <Printer /> Print {classId ? "class" : "school"} batch
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                <Printer /> Print {classId ? "class" : "school"} batch
              </Button>
            )}
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground">
          Generation is limited to 50 students per request and printing to 25
          invoices per page. Continue with the returned batch cursor; retries
          safely skip invoices already issued.
        </p>
        {message ? (
          <p className="mt-3 text-sm font-medium" role="status">
            {message}
          </p>
        ) : null}
        {skipped.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {skipped.slice(0, 8).map((item) => (
              <li key={`${item.studentId}-${item.reason}`}>
                Student #{item.studentId}: {item.reason}
              </li>
            ))}
            {skipped.length > 8 ? (
              <li>…and {skipped.length - 8} more.</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
