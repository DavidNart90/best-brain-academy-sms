"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import { demoCollections } from "../demo-data";

export function CollectionsTable() {
  const [query, setQuery] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const rows = demoCollections.filter(
    (row) =>
      (!query ||
        `${row.student} ${row.id}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!className || row.className === className) &&
      (!status || row.status === status) &&
      (!date || row.date === date),
  );
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Recent Fee Collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Synthetic records · Preview filters only
          </p>
        </div>
        <div className="flex w-full flex-wrap items-end gap-3 xl:w-auto">
          <label className="field min-w-40 flex-1">
            <span className="field-label">Student or ID</span>
            <span className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search demo records"
                className="h-10 pl-9"
              />
            </span>
          </label>
          <label className="field">
            <span className="field-label">Date</span>
            <select
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="native-select"
            >
              <option value="">All dates</option>
              <option value="2026-08-31">31 Aug 2026</option>
              <option value="2026-08-30">30 Aug 2026</option>
              <option value="2026-08-29">29 Aug 2026</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Class</span>
            <select
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              className="native-select"
            >
              <option value="">All classes</option>
              {["A", "B", "C"].map((value) => (
                <option key={value}>Demo Class {value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="native-select"
            >
              <option value="">All statuses</option>
              <option>Paid</option>
              <option>Partially Paid</option>
            </select>
          </label>
        </div>
      </div>
      <Table>
        <caption className="sr-only">
          Demo fee collections. These are not real school records.
        </caption>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="pl-6">Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-6">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="h-[68px]">
              <TableCell className="pl-6">
                <p className="font-medium">{row.student}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.id}</p>
              </TableCell>
              <TableCell>{row.className}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.invoice}
              </TableCell>
              <TableCell className="text-right font-medium">
                <Money value={row.amount} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={row.outstanding} />
              </TableCell>
              <TableCell className="text-xs">{row.method}</TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="pr-6">
                <time dateTime={row.date} className="whitespace-nowrap text-xs">
                  {row.date}
                </time>
                <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                  {row.recordedBy}
                </p>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={8} className="h-40 text-center">
                <p role="status" className="font-medium">
                  No demo records match your filters.
                </p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setQuery("");
                    setClassName("");
                    setStatus("");
                    setDate("");
                  }}
                >
                  Clear filters
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap justify-between gap-3 border-t border-border px-6 py-4 text-xs text-muted-foreground">
        <span aria-live="polite">
          Showing {rows.length} of {demoCollections.length} demo records
        </span>
        <span>Record actions are unavailable in Phase 0.</span>
      </div>
    </section>
  );
}
