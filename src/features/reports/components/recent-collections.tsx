import Link from "next/link";
import { Money } from "@/components/data-display/money";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecentCollection } from "../types";

export function RecentCollections({ rows }: { rows: RecentCollection[] }) {
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Recent collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest posted income records in the current financial period
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports?view=collections">Open collection report</Link>
        </Button>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="Recent collections table"
      >
        <Table>
          <caption className="sr-only">
            Recent active collection records from the current financial period.
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="pl-6">Student / Payer</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="pr-6">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.source}-${row.reference}`}
                className="h-[60px]"
              >
                <TableCell className="pl-6 font-medium">
                  {row.personName}
                </TableCell>
                <TableCell>{row.className ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {row.reference}
                </TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.paymentMethod}</TableCell>
                <TableCell className="text-right font-medium">
                  <Money value={row.amount} />
                </TableCell>
                <TableCell className="pr-6 whitespace-nowrap">
                  <time dateTime={row.businessDate}>{row.businessDate}</time>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center">
                  <p className="font-medium">No collections in this period</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Posted payments and receipts will appear here.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        Showing {rows.length} most recent record
        {rows.length === 1 ? "" : "s"}
      </div>
    </section>
  );
}
