"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function filterHref(query: string, status: string) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (status !== "active") params.set("status", status);
  const search = params.toString();
  return search ? `/classes?${search}` : "/classes";
}

export function ClassFilters({
  initialQuery,
  initialStatus,
}: {
  initialQuery: string;
  initialStatus: "active" | "archived" | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const nextHref = filterHref(query, status);
    const currentSearch = searchParams.toString();
    const currentHref = currentSearch
      ? `${pathname}?${currentSearch}`
      : pathname;
    if (nextHref === currentHref) return;
    const timeout = window.setTimeout(() => router.replace(nextHref), 350);
    return () => window.clearTimeout(timeout);
  }, [pathname, query, router, searchParams, status]);

  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault();
        router.replace(filterHref(query, status));
      }}
    >
      <div className="field min-w-56 flex-1 sm:flex-none">
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
      <Button type="submit" variant="outline">
        Apply filters
      </Button>
    </form>
  );
}
