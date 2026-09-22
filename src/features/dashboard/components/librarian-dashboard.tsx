import { BookOpen, CircleAlert, HandCoins, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
import { Money } from "@/components/data-display/money";
import { PageState } from "@/components/data-display/page-state";
import { StatCard } from "@/components/data-display/stat-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LibraryPageResult } from "@/features/library/types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function LibraryCollectionPanel({ data }: { data: LibraryPageResult }) {
  const expected = Number(data.summary.expected);
  const paid = Number(data.summary.paid);
  const collectionRate =
    expected > 0 ? Math.min((paid / expected) * 100, 100) : 0;
  const termLabel =
    data.terms.find((term) => term.id === data.selectedTermId)?.label ??
    "No current term";
  const configured = data.rates.filter(
    (rate) => rate.status === "chargeable",
  ).length;
  const notCharged = data.rates.filter(
    (rate) => rate.status === "not_charged",
  ).length;
  const unconfigured = data.rates.filter(
    (rate) => rate.status === "unconfigured",
  ).length;

  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Library collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">{termLabel}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {collectionRate.toFixed(1)}% collected
        </span>
      </div>
      <div className="my-8">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            Collected <Money value={data.summary.paid} />
          </span>
          <span>
            Expected <Money value={data.summary.expected} />
          </span>
        </div>
      </div>
      <div className="grid gap-3 border-t pt-5 sm:grid-cols-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{configured}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Chargeable classes
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{notCharged}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Classes not charged
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{unconfigured}</p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting setup</p>
        </div>
      </div>
    </section>
  );
}

function RecentLibraryCollections({ data }: { data: LibraryPageResult }) {
  const rows = data.collections;

  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Recent collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest library payments and reversals
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/library">Open library workspace</Link>
        </Button>
      </div>
      {rows.length ? (
        <InMemoryTablePagination
          total={rows.length}
          pageSize={8}
          itemLabel="collections"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <PaginatedRows>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{row.studentName}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {row.admissionNumber}
                      </p>
                    </TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {row.collectionNumber}
                    </TableCell>
                    <TableCell>
                      {dateFormatter.format(
                        new Date(`${row.businessDate}T00:00:00`),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.amount} />
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge
                        status={row.status === "active" ? "Active" : "Reversed"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </PaginatedRows>
            </TableBody>
          </Table>
        </InMemoryTablePagination>
      ) : (
        <div className="p-5 sm:p-6">
          <PageState
            title="No library collections yet"
            description="Recorded library payments will appear here."
          />
        </div>
      )}
    </section>
  );
}

export function LibrarianDashboard({ data }: { data: LibraryPageResult }) {
  return (
    <>
      <PageHeader
        title="Library dashboard"
        description="Track term charges, collections and student library balances."
      >
        <Button asChild>
          <Link href="/library">Open library workspace</Link>
        </Button>
      </PageHeader>
      <div className="mb-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] 2xl:grid-cols-[minmax(0,1.9fr)_minmax(390px,1fr)]">
        <LibraryCollectionPanel data={data} />
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <StatCard
            label="Expected charges"
            amount={data.summary.expected}
            note="Current term charges"
            icon={BookOpen}
          />
          <StatCard
            label="Collected"
            amount={data.summary.paid}
            note="Active collections"
            icon={HandCoins}
            accent
          />
          <StatCard
            label="Outstanding"
            amount={data.summary.outstanding}
            note="Remaining library balances"
            icon={CircleAlert}
          />
          <StatCard
            label="Students charged"
            amount={String(data.summary.studentCount)}
            note="Current term"
            icon={UsersRound}
            format="number"
          />
        </div>
      </div>
      <RecentLibraryCollections data={data} />
    </>
  );
}
