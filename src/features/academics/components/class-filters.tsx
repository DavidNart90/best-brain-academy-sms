"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { classListHref } from "../class-list-query";
import type { ClassRosterPeriod } from "../types";

export function ClassFilters({
  initialQuery,
  initialStatus,
  initialAcademicYearId,
  initialAcademicTermId,
  years,
  terms,
}: {
  initialQuery: string;
  initialStatus: "active" | "archived" | "all";
  initialAcademicYearId: number | null;
  initialAcademicTermId: number | null;
  years: ClassRosterPeriod[];
  terms: ClassRosterPeriod[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId);
  const [academicTermId, setAcademicTermId] = useState(initialAcademicTermId);
  const availableTerms = terms.filter(
    (term) => term.academicYearId === academicYearId,
  );

  useEffect(() => {
    const nextHref = classListHref({
      q: query,
      status,
      academicYearId,
      academicTermId,
    });
    const currentHref = `${pathname}${window.location.search}`;
    if (nextHref === currentHref) return;
    const timeout = window.setTimeout(() => router.replace(nextHref), 350);
    return () => window.clearTimeout(timeout);
  }, [academicTermId, academicYearId, pathname, query, router, status]);

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault();
        router.replace(
          classListHref({
            q: query,
            status,
            academicYearId,
            academicTermId,
          }),
        );
      }}
    >
      <div className="field min-w-48 flex-1 sm:flex-none">
        <label htmlFor="class-search" className="field-label">
          Class name
        </label>
        <Input
          id="class-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search classes"
        />
      </div>
      <div className="field min-w-36">
        <label htmlFor="class-academic-year" className="field-label">
          Academic year
        </label>
        <select
          id="class-academic-year"
          name="academicYearId"
          value={academicYearId ?? ""}
          onChange={(event) => {
            const nextYearId = Number(event.target.value);
            const nextTerms = terms.filter(
              (term) => term.academicYearId === nextYearId,
            );
            const nextTerm =
              nextTerms.find((term) => term.isCurrent) ?? nextTerms[0] ?? null;
            setAcademicYearId(nextYearId);
            setAcademicTermId(nextTerm?.id ?? null);
          }}
          className="native-select"
          disabled={years.length === 0}
        >
          {years.length === 0 && <option value="">No academic years</option>}
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
              {year.isCurrent ? " · Current" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-32">
        <label htmlFor="class-academic-term" className="field-label">
          Term
        </label>
        <select
          id="class-academic-term"
          name="academicTermId"
          value={academicTermId ?? ""}
          onChange={(event) =>
            setAcademicTermId(
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="native-select"
          disabled={availableTerms.length === 0}
        >
          {availableTerms.length === 0 && <option value="">No terms</option>}
          {availableTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.label}
              {term.isCurrent ? " · Current" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="class-status" className="field-label">
          Status
        </label>
        <select
          id="class-status"
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "active" | "archived" | "all")
          }
          className="native-select"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
      </div>
    </form>
  );
}
