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
import type { FinancialSnapshot } from "@/features/reports/types";
import type { SuperAdminOperationsData } from "../types";

export function BoardOversightPanel({
  snapshot,
}: {
  snapshot: FinancialSnapshot;
}) {
  const rows = [
    {
      label: "Active fee receipts",
      value: String(snapshot.summary.receiptCount),
      context: "Confirmed collections in the selected period",
    },
    {
      label: "Recorded expenses",
      value: String(snapshot.summary.expenseCount),
      context: "Active expenses in the selected period",
    },
    {
      label: "Financial reversals",
      value: String(snapshot.summary.reversalCount),
      context: "Reversed payments and expenses requiring oversight",
    },
  ];

  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Governance overview</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only operational indicators without student-level records
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports">Review financial reports</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="pl-6">Indicator</TableHead>
            <TableHead>Context</TableHead>
            <TableHead className="pr-6 text-right">Current period</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="pl-6 font-medium">{row.label}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.context}
              </TableCell>
              <TableCell className="pr-6 text-right font-semibold tabular-nums">
                {row.value}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="pl-6 font-medium">
              Net financial position
            </TableCell>
            <TableCell className="text-muted-foreground">
              Collections less active expenses
            </TableCell>
            <TableCell className="pr-6 text-right font-semibold">
              <Money value={snapshot.summary.operatingNet} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}

export function SuperAdminOperationsPanel({
  data,
}: {
  data: SuperAdminOperationsData;
}) {
  const rows = [
    {
      label: "Active students",
      value: String(data.activeStudents),
      context: "Student records",
      href: "/students",
    },
    {
      label: "Active staff",
      value: String(data.activeStaff),
      context: "Teaching and non-teaching staff",
      href: "/staff",
    },
    {
      label: "Active classes",
      value: String(data.activeClasses),
      context: "Academic setup",
      href: "/classes",
    },
    {
      label: "Active access accounts",
      value: String(data.activeAccounts),
      context: "Administrators and role assignments",
      href: "/administrators",
    },
  ];

  return (
    <section className="panel mt-6 min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">School operations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cross-workspace totals for system administration
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/administrators">Manage access</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="pl-6">Workspace</TableHead>
            <TableHead>Context</TableHead>
            <TableHead className="text-right">Current total</TableHead>
            <TableHead className="pr-6 text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="pl-6 font-medium">{row.label}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.context}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {row.value}
              </TableCell>
              <TableCell className="pr-6 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={row.href}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="pl-6 font-medium">
              Library outstanding
            </TableCell>
            <TableCell className="text-muted-foreground">
              {data.libraryTermLabel}
            </TableCell>
            <TableCell className="text-right font-semibold">
              <Money value={data.libraryOutstanding} />
            </TableCell>
            <TableCell className="pr-6 text-right">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/library">View</Link>
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}
