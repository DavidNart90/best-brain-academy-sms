import { CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import type { AcademicTerm, AcademicYear } from "../types";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function monthKey(date: Date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export function AcademicCalendar({
  year,
  terms,
}: {
  year: AcademicYear;
  terms: AcademicTerm[];
}) {
  const start = parseDate(year.starts_on);
  const end = parseDate(year.ends_on);
  const startMonth = monthKey(start);
  const endMonth = monthKey(end);
  const months = Array.from(
    { length: Math.min(endMonth - startMonth + 1, 18) },
    (_, index) => {
      const month = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
      );
      return { date: month, key: monthKey(month) };
    },
  );
  const scheduled = terms.filter(
    (term) => term.starts_on && term.ends_on && term.status === "active",
  );
  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="academic-calendar-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="academic-calendar-title" className="text-base font-semibold">
            Academic calendar
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {year.name} · {dateFormatter.format(start)} to{" "}
            {dateFormatter.format(end)}
          </p>
        </div>
        <CalendarDays className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-4 lg:grid-cols-6">
        {months.map((month) => {
          const monthTerms = scheduled.filter((term) => {
            if (!term.starts_on || !term.ends_on) return false;
            const termStart = monthKey(parseDate(term.starts_on));
            const termEnd = monthKey(parseDate(term.ends_on));
            return month.key >= termStart && month.key <= termEnd;
          });
          return (
            <div key={month.key} className="min-h-24 bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {monthFormatter.format(month.date)}
              </p>
              <div className="mt-3 space-y-2">
                {monthTerms.map((term) => (
                  <div
                    key={term.id}
                    className="rounded-md border-l-2 border-primary bg-brand-subtle px-2 py-1.5"
                  >
                    <p className="text-xs font-semibold">{term.name}</p>
                    {term.is_current && (
                      <p className="mt-0.5 text-[11px] text-primary">Current</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-border px-5 py-4">
        {terms.map((term) => (
          <div key={term.id} className="flex items-center gap-2 text-xs">
            <span className="font-semibold">{term.name}</span>
            <StatusBadge
              status={term.starts_on ? "Scheduled" : "Unscheduled"}
            />
            <span className="text-muted-foreground">
              {term.starts_on && term.ends_on
                ? `${dateFormatter.format(parseDate(term.starts_on))} – ${dateFormatter.format(parseDate(term.ends_on))}`
                : "Dates can be added when confirmed"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
