"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationState = {
  end: number;
  start: number;
};

const PaginationContext = createContext<PaginationState | null>(null);

export function InMemoryTablePagination({
  children,
  total,
  itemLabel,
  pageSize = 10,
  className,
}: {
  children: ReactNode;
  total: number;
  itemLabel: string;
  pageSize?: number;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(total, start + pageSize);

  const value = useMemo(() => ({ start, end }), [end, start]);

  return (
    <PaginationContext.Provider value={value}>
      {children}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground print:hidden",
          className,
        )}
      >
        <span aria-live="polite">
          Showing {total === 0 ? 0 : start + 1}–{end} of {total} {itemLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden sm:inline">
            Page {safePage} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(Math.max(1, safePage - 1))}
          >
            <ChevronLeft /> Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage(Math.min(pageCount, safePage + 1))}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>
    </PaginationContext.Provider>
  );
}

export function PaginatedRows({
  children,
  printAll = false,
}: {
  children: ReactNode;
  printAll?: boolean;
}) {
  const pagination = useContext(PaginationContext);
  if (!pagination)
    throw new Error("PaginatedRows requires InMemoryTablePagination.");
  const rows = Children.toArray(children);
  if (!printAll) return rows.slice(pagination.start, pagination.end);
  return rows.map((row, index) => {
    if (index >= pagination.start && index < pagination.end) return row;
    if (!isValidElement(row)) return null;
    const element = row as ReactElement<{ className?: string }>;
    return cloneElement(element, {
      className: cn(element.props.className, "hidden print:table-row"),
    });
  });
}
