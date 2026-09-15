import Link from "next/link";
import { Search, X } from "lucide-react";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Button } from "@/components/ui/button";
import type { OutstandingQuery } from "../outstanding-query";
import type { OutstandingFilterOption } from "../types";

export function OutstandingFeesFilters({
  query,
  classes,
  terms,
}: {
  query: OutstandingQuery;
  classes: OutstandingFilterOption[];
  terms: OutstandingFilterOption[];
}) {
  const hasFilters = Boolean(query.q || query.classId || query.academicTermId);

  return (
    <LiveFilterForm
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_minmax(10rem,0.6fr)_minmax(13rem,0.75fr)_auto]"
      ariaLabel="Filter outstanding fees"
    >
      <div className="field sm:col-span-2 lg:col-span-1">
        <label htmlFor="outstanding-search" className="field-label">
          Student or invoice
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="outstanding-search"
            name="q"
            defaultValue={query.q}
            maxLength={80}
            placeholder="Name, admission no. or invoice"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

      <FilterSelect
        id="outstanding-class-filter"
        name="classId"
        label="Class"
        defaultValue={query.classId ? String(query.classId) : ""}
        allLabel="All classes"
        options={classes}
      />
      <FilterSelect
        id="outstanding-term-filter"
        name="academicTermId"
        label="Academic term"
        defaultValue={query.academicTermId ? String(query.academicTermId) : ""}
        allLabel="All terms"
        options={terms}
      />

      <div className="flex items-end gap-2">
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon"
          aria-disabled={!hasFilters}
          className={!hasFilters ? "pointer-events-none opacity-50" : ""}
        >
          <Link href="/financials/outstanding" aria-label="Clear filters">
            <X />
          </Link>
        </Button>
      </div>
    </LiveFilterForm>
  );
}

function FilterSelect({
  id,
  name,
  label,
  defaultValue,
  allLabel,
  options,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  allLabel: string;
  options: OutstandingFilterOption[];
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="native-select min-w-0"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
