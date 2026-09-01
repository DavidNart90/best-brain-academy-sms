import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataTablePagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefForPage,
  itemLabel,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
  itemLabel: string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
      <span>
        Showing {first}–{last} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <span className="mr-1 hidden sm:inline">
          Page {page} of {pageCount}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={page <= 1}
          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={hrefForPage(Math.max(1, page - 1))}>
            <ChevronLeft /> Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={page >= pageCount}
          className={page >= pageCount ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={hrefForPage(Math.min(pageCount, page + 1))}>
            Next <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
