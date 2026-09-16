"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoardDashboardData } from "../types";

export function BoardDashboardFilters({
  filters,
  options,
  label = "Board reporting scope",
  resetHref = "/dashboard",
}: Pick<BoardDashboardData, "filters" | "options"> & {
  label?: string;
  resetHref?: string;
}) {
  const [period, setPeriod] = useState(filters.period);
  const [academicYearId, setAcademicYearId] = useState(
    String(filters.academicYearId ?? options.academicYears[0]?.id ?? ""),
  );
  const terms = useMemo(
    () =>
      options.academicTerms.filter(
        (term) => String(term.academicYearId) === academicYearId,
      ),
    [academicYearId, options.academicTerms],
  );
  const selectedTermId = terms.some(
    (term) => term.id === filters.academicTermId,
  )
    ? String(filters.academicTermId)
    : String(terms.find((term) => term.isCurrent)?.id ?? terms[0]?.id ?? "");

  return (
    <LiveFilterForm ariaLabel={label} className="panel mb-5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="field">
          <Label htmlFor="board-period" className="field-label">
            Reporting period
          </Label>
          <select
            id="board-period"
            name="period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="native-select w-full"
          >
            <option value="monthly">Month</option>
            <option value="term">Academic term</option>
            <option value="academic-cycle">Academic cycle</option>
          </select>
        </div>

        {period === "monthly" ? (
          <div className="field">
            <Label htmlFor="board-month" className="field-label">
              Month
            </Label>
            <Input
              id="board-month"
              name="month"
              type="month"
              defaultValue={filters.start.slice(0, 7)}
            />
          </div>
        ) : (
          <div className="field">
            <Label htmlFor="board-year" className="field-label">
              Academic cycle
            </Label>
            <select
              id="board-year"
              name="academicYearId"
              value={academicYearId}
              onChange={(event) => {
                const nextYearId = event.target.value;
                setAcademicYearId(nextYearId);
                const firstTerm = options.academicTerms.find(
                  (term) => String(term.academicYearId) === nextYearId,
                );
                const termControl =
                  event.currentTarget.form?.elements.namedItem(
                    "academicTermId",
                  );
                if (firstTerm && termControl instanceof HTMLSelectElement)
                  termControl.value = String(firstTerm.id);
              }}
              className="native-select w-full"
            >
              {options.academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {period === "term" ? (
          <div className="field">
            <Label htmlFor="board-term" className="field-label">
              Academic term
            </Label>
            <select
              key={`${academicYearId}-${selectedTermId}`}
              id="board-term"
              name="academicTermId"
              defaultValue={selectedTermId}
              className="native-select w-full"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                  {term.isCurrent ? " · Current" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="ghost" asChild>
          <Link href={resetHref}>Reset</Link>
        </Button>
      </div>
    </LiveFilterForm>
  );
}
