"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/data-display/money";
import { searchOpenInvoicesAction } from "../server/invoice-search";
import type { OpenInvoiceOption } from "../types";

export function InvoiceSearch({
  selected,
  onSelect,
}: {
  selected: OpenInvoiceOption | null;
  onSelect: (invoice: OpenInvoiceOption | null) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const optionElements = useRef(new Map<number, HTMLDivElement>());
  const [result, setResult] = useState<{
    query: string;
    invoices: OpenInvoiceOption[];
    message: string;
  }>({ query: "", invoices: [], message: "" });
  const searching = query.trim().length >= 2 && result.query !== query;
  const invoices = result.query === query ? result.invoices : [];

  useEffect(() => {
    if (open && !selected)
      optionElements.current
        .get(active)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, selected]);

  useEffect(() => {
    if (query.trim().length < 2 || selected) return;
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const response = await searchOpenInvoicesAction(query);
        if (!ignore) setResult({ query, ...response });
      } catch {
        if (!ignore)
          setResult({
            query,
            invoices: [],
            message: "Search failed. Please try again.",
          });
      }
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, selected]);

  function select(invoice: OpenInvoiceOption) {
    onSelect(invoice);
    setQuery(invoice.invoiceNumber + " · " + invoice.studentName);
    setOpen(false);
  }

  return (
    <div className="relative space-y-2 sm:col-span-2 lg:col-span-3">
      <Label htmlFor={id}>
        Find invoice <span className="text-destructive">*</span>
      </Label>
      <Input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && !selected}
        aria-controls={id + "-results"}
        aria-activedescendant={
          open && invoices[active] ? id + "-option-" + active : undefined
        }
        aria-describedby={id + "-help"}
        placeholder="Enter invoice number or student name"
        value={query}
        maxLength={240}
        required
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value.slice(0, 80));
          onSelect(null);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((previous) =>
              Math.max(
                0,
                Math.min(
                  invoices.length - 1,
                  previous + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (event.key === "Enter" && open && !selected) {
            event.preventDefault();
            if (invoices[active]) select(invoices[active]);
          }
        }}
      />
      <p
        id={id + "-help"}
        className="text-sm text-muted-foreground"
        aria-live="polite"
      >
        {selected ? (
          <>
            Outstanding: <Money value={selected.outstanding} />
          </>
        ) : searching ? (
          "Searching invoices…"
        ) : query.trim().length < 2 ? (
          "Type at least two characters, then select an invoice."
        ) : (
          result.message ||
          (invoices.length
            ? "Select a result. Refine your search if needed."
            : "No open invoices found.")
        )}
      </p>
      {open && !selected && (
        <div
          id={id + "-results"}
          role="listbox"
          aria-label="Matching open invoices"
          className="absolute z-20 max-h-64 w-full overflow-y-auto rounded-md border bg-background shadow-md"
        >
          {invoices.map((invoice, index) => (
            <div
              key={invoice.id}
              ref={(element) => {
                if (element) optionElements.current.set(index, element);
                else optionElements.current.delete(index);
              }}
              id={id + "-option-" + index}
              role="option"
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(invoice)}
              className={`cursor-pointer border-b px-3 py-3 text-sm last:border-0 hover:bg-muted ${active === index ? "bg-brand-subtle" : ""}`}
            >
              <p className="font-medium">{invoice.studentName}</p>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-muted-foreground">
                <span>{invoice.invoiceNumber}</span>
                <span>
                  <Money value={invoice.outstanding} /> due
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
