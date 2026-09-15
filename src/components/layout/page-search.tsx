"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { permittedRoutes } from "@/lib/permissions/routes";
import type { AccessContext } from "@/lib/permissions/contracts";
import type { GlobalSearchItem } from "@/features/search/types";

type SearchOption = {
  id: string;
  category: "Page" | GlobalSearchItem["category"];
  title: string;
  description: string;
  href: string;
};

export function PageSearch({ context }: { context: AccessContext }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recordResult, setRecordResult] = useState<{
    query: string;
    results: GlobalSearchItem[];
    error: string;
  }>({ query: "", results: [], error: "" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchTerm = query.trim();
  const normalized = searchTerm.toLowerCase();
  const records = recordResult.query === searchTerm ? recordResult.results : [];
  const status =
    searchTerm.length < 2
      ? ""
      : recordResult.query !== searchTerm
        ? "Searching records"
        : recordResult.error ||
          (recordResult.results.length ? "" : "No matching records");
  const pageMatches = useMemo<SearchOption[]>(
    () =>
      normalized
        ? permittedRoutes(context)
            .filter((route) =>
              `${route.title} ${route.description}`
                .toLowerCase()
                .includes(normalized),
            )
            .slice(0, 5)
            .map((route) => ({
              id: `page-${route.href}`,
              category: "Page",
              title: route.title,
              description: route.description,
              href: route.href,
            }))
        : [],
    [context, normalized],
  );
  const options: SearchOption[] = [...pageMatches, ...records];

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === "/" &&
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLSelectElement)
      ) {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onShortcut);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onShortcut);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search failed");
          return (await response.json()) as { results: GlobalSearchItem[] };
        })
        .then((payload) => {
          setRecordResult({
            query: searchTerm,
            results: payload.results,
            error: "",
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          setRecordResult({
            query: searchTerm,
            results: [],
            error: "Record search is temporarily unavailable",
          });
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  function openOption(option: SearchOption) {
    setQuery("");
    setOpen(false);
    router.push(option.href);
  }

  return (
    <div ref={root} className="relative w-full max-w-80">
      <label htmlFor="application-search" className="sr-only">
        Search pages and school records
      </label>
      <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input
        ref={input}
        id="application-search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(normalized)}
        aria-controls="application-search-results"
        aria-activedescendant={options[active]?.id}
        aria-keyshortcuts="/"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value.slice(0, 80));
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => {
              if (!options.length) return 0;
              const change = event.key === "ArrowDown" ? 1 : -1;
              return (current + change + options.length) % options.length;
            });
          }
          if (event.key === "Enter" && options[active]) {
            event.preventDefault();
            openOption(options[active]);
          }
        }}
        placeholder="Search pages and records"
        autoComplete="off"
        className="h-10 rounded-full bg-card pl-10 pr-12"
      />
      <kbd className="pointer-events-none absolute right-3 top-2.5 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
        /
      </kbd>
      {open && normalized && (
        <div
          id="application-search-results"
          role="listbox"
          aria-label="Application search results"
          className="absolute inset-x-0 top-12 z-50 max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-md"
        >
          {options.map((option, index) => (
            <button
              key={option.id}
              id={option.id}
              type="button"
              role="option"
              aria-selected={active === index}
              onMouseEnter={() => setActive(index)}
              onClick={() => openOption(option)}
              className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent ${active === index ? "bg-accent" : ""}`}
            >
              <FileSearch
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {option.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {option.category}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
          {!options.length && status !== "Searching records" && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No pages or records match this search.
            </p>
          )}
          <p
            className="px-3 py-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {status ||
              (options.length
                ? `${options.length} ${options.length === 1 ? "result" : "results"}`
                : "")}
          </p>
        </div>
      )}
    </div>
  );
}
