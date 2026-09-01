"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudentListQuery } from "../schemas";
import type { StudentReferenceData } from "../types";

export function StudentFilters({
  initial,
  reference,
}: {
  initial: StudentListQuery;
  reference: StudentReferenceData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initial.q);
  const [status, setStatus] = useState(initial.status);
  const [gender, setGender] = useState(initial.gender);
  const [classId, setClassId] = useState(
    initial.classId ? String(initial.classId) : "all",
  );
  const [yearId, setYearId] = useState(
    initial.academicYearId ? String(initial.academicYearId) : "all",
  );
  const [sort, setSort] = useState(initial.sort);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const next = query.trim();
    if (next) params.set("q", next);
    else params.delete("q");
    if (status !== "active") params.set("status", status);
    else params.delete("status");
    if (gender !== "all") params.set("gender", gender);
    else params.delete("gender");
    if (classId !== "all") params.set("classId", classId);
    else params.delete("classId");
    if (yearId !== "all") params.set("academicYearId", yearId);
    else params.delete("academicYearId");
    if (sort !== "name") params.set("sort", sort);
    else params.delete("sort");
    params.delete("page");
    params.delete("notice");
    const nextHref = params.size ? `${pathname}?${params}` : pathname;
    const currentHref = searchParams.size
      ? `${pathname}?${searchParams}`
      : pathname;
    if (nextHref === currentHref) return;
    const timeout = window.setTimeout(() => router.replace(nextHref), 350);
    return () => window.clearTimeout(timeout);
  }, [
    classId,
    gender,
    pathname,
    query,
    router,
    searchParams,
    sort,
    status,
    yearId,
  ]);

  const hasFilters =
    query ||
    status !== "active" ||
    gender !== "all" ||
    classId !== "all" ||
    yearId !== "all" ||
    sort !== "name";
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_repeat(5,minmax(8rem,auto))]">
      <div className="field sm:col-span-2 lg:col-span-1">
        <label htmlFor="student-search" className="field-label">
          Student, admission number or phone
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="student-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search students"
          />
        </div>
      </div>
      <FilterSelect
        id="student-status-filter"
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "active", label: "Active" },
          { value: "all", label: "All statuses" },
          { value: "inactive", label: "Inactive" },
          { value: "graduated", label: "Graduated" },
          { value: "withdrawn", label: "Withdrawn" },
        ]}
      />
      <FilterSelect
        id="student-gender-filter"
        label="Gender"
        value={gender}
        onChange={setGender}
        options={[
          { value: "all", label: "All genders" },
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
        ]}
      />
      <FilterSelect
        id="student-class-filter"
        label="Class"
        value={classId}
        onChange={setClassId}
        options={[
          { value: "all", label: "All classes" },
          ...reference.classes.map((item) => ({
            value: String(item.id),
            label: item.name,
          })),
        ]}
      />
      <FilterSelect
        id="student-year-filter"
        label="Academic year"
        value={yearId}
        onChange={setYearId}
        options={[
          { value: "all", label: "All years" },
          ...reference.academicYears.map((item) => ({
            value: String(item.id),
            label: item.name,
          })),
        ]}
      />
      <FilterSelect
        id="student-sort"
        label="Sort by"
        value={sort}
        onChange={setSort}
        options={[
          { value: "name", label: "Student name" },
          { value: "admission", label: "Admission number" },
          { value: "newest", label: "Newest admission" },
        ]}
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Clear student filters"
          disabled={!hasFilters}
          onClick={() => {
            setQuery("");
            setStatus("active");
            setGender("all");
            setClassId("all");
            setYearId("all");
            setSort("name");
          }}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="native-select"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
