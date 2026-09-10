import { BookOpenText, CircleAlert, HandCoins } from "lucide-react";
import { StatCard } from "@/components/data-display/stat-card";
import type { LibrarySummary } from "../types";

export function LibraryFinancialSummary({
  summary,
  periodLabel,
}: {
  summary: LibrarySummary;
  periodLabel: string;
}) {
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="library-kpis-title">
      <div className="mb-4">
        <h2 id="library-kpis-title" className="text-base font-semibold">
          Books &amp; Prospectus
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {periodLabel}. This is a separate Library balance and is excluded from
          operating cashflow.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Library expected"
          amount={summary.expected}
          note={`${summary.studentCount} billed ${summary.studentCount === 1 ? "student" : "students"}`}
          icon={BookOpenText}
        />
        <StatCard
          label="Library paid"
          amount={summary.paid}
          note="Active Books & Prospectus collections"
          icon={HandCoins}
          accent
        />
        <StatCard
          label="Library net"
          amount={summary.outstanding}
          note="Expected less paid · outstanding"
          icon={CircleAlert}
        />
      </div>
    </section>
  );
}
