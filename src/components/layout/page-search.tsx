"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { permittedRoutes } from "@/lib/permissions/routes";
import type { AccessContext } from "@/lib/permissions/contracts";

export function PageSearch({ context }: { context: AccessContext }) {
  const [query, setQuery] = useState("");
  const matches = query.trim()
    ? permittedRoutes(context)
        .filter((route) =>
          route.title.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];
  return (
    <div className="relative w-full max-w-72">
      <label htmlFor="page-search" className="sr-only">
        Find a page
      </label>
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input
        id="page-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}
        placeholder="Find a page…"
        autoComplete="off"
        className="h-10 rounded-full bg-card pl-10"
      />
      {query.trim() && (
        <div className="absolute inset-x-0 top-12 z-20 rounded-lg border border-border bg-card p-2 shadow-sm">
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Page navigation · records search comes later
          </p>
          {matches.length ? (
            matches.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setQuery("")}
                className="block rounded-md p-3 hover:bg-accent"
              >
                {route.title}
              </Link>
            ))
          ) : (
            <p role="status" className="p-3 text-sm">
              No matching pages.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
