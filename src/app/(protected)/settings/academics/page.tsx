import { requirePermission } from "@/lib/auth/access";
import {
  PermissionDenied,
  PageState,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { AcademicCalendar } from "@/features/academics/components/academic-calendar";
import {
  AcademicTermForm,
  AcademicYearForm,
  ClassForm,
  CurrentContextForm,
} from "@/features/academics/components/configuration-forms";
import { getAcademicConfiguration } from "@/features/academics/server/queries";
import { classGroupLabels } from "@/features/academics/types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

export default async function AcademicSettingsPage() {
  const context = await requirePermission("settings.manage");
  if (!context) return <PermissionDenied />;
  const configuration = await getAcademicConfiguration();
  const currentYear = configuration.years.find((year) => year.is_current);
  const currentTerm = configuration.terms.find((term) => term.is_current);
  if (!currentYear)
    return (
      <>
        <PageHeader
          title="Academic settings"
          description="Configure academic years, term dates and the school class catalogue."
        />
        <PageState
          kind="error"
          title="No current academic year"
          description="Add an academic year and choose a scheduled term before staff begin admissions or finance work."
        />
      </>
    );
  const currentYearTerms = configuration.terms.filter(
    (term) => term.academic_year_id === currentYear.id,
  );
  return (
    <>
      <PageHeader
        title="Academic settings"
        description="Set the active academic cycle, schedule terms in the calendar and maintain the class catalogue."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <AcademicCalendar year={currentYear} terms={currentYearTerms} />
        <section className="panel p-5" aria-labelledby="current-context-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="current-context-title"
                className="text-base font-semibold"
              >
                Current context
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Staff views and future transactions will use this year and term
                by default.
              </p>
            </div>
            <StatusBadge status="Current" />
          </div>
          <dl className="my-5 grid gap-4 border-y border-border py-5 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <dt className="text-xs text-muted-foreground">Academic year</dt>
              <dd className="mt-1 text-lg font-semibold">{currentYear.name}</dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                {formatDate(currentYear.starts_on)} –{" "}
                {formatDate(currentYear.ends_on)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Current term</dt>
              <dd className="mt-1 text-lg font-semibold">
                {currentTerm?.name ?? "Not selected"}
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                {currentTerm?.starts_on && currentTerm.ends_on
                  ? `${formatDate(currentTerm.starts_on)} – ${formatDate(currentTerm.ends_on)}`
                  : "Schedule the term before selecting it."}
              </dd>
            </div>
          </dl>
          <CurrentContextForm
            years={configuration.years}
            terms={configuration.terms}
          />
        </section>
      </div>

      <section
        className="panel mt-6 p-5"
        aria-labelledby="term-schedules-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="term-schedules-title" className="text-base font-semibold">
              Term schedules
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Term dates are flexible. Unscheduled terms remain available
              without inventing calendar dates.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Term 1 begins on the confirmed 8 September date; its 7 December
              end is a three-month planning date and can be revised when the
              official calendar is confirmed.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {configuration.terms.length} terms across{" "}
            {configuration.years.length} academic year
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {configuration.terms.map((term) => (
            <details key={term.id} className="configuration-disclosure">
              <summary>
                <span>
                  <strong>{term.name}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {
                      configuration.years.find(
                        (year) => year.id === term.academic_year_id,
                      )?.name
                    }
                  </span>
                </span>
                <StatusBadge
                  status={term.starts_on ? "Scheduled" : "Unscheduled"}
                />
              </summary>
              <div className="border-t border-border p-4">
                <AcademicTermForm term={term} years={configuration.years} />
              </div>
            </details>
          ))}
          <details className="configuration-disclosure">
            <summary>
              <strong>Add another term</strong>
              <span className="text-xs text-muted-foreground">
                For a future academic cycle
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <AcademicTermForm years={configuration.years} />
            </div>
          </details>
        </div>
      </section>

      <section
        className="panel mt-6 p-5"
        aria-labelledby="academic-years-title"
      >
        <div>
          <h2 id="academic-years-title" className="text-base font-semibold">
            Academic years
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep archived cycles for historical records; do not delete them.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {configuration.years.map((year) => (
            <details key={year.id} className="configuration-disclosure">
              <summary>
                <span>
                  <strong>{year.name}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(year.starts_on)} – {formatDate(year.ends_on)}
                  </span>
                </span>
                <StatusBadge
                  status={
                    year.is_current
                      ? "Current"
                      : year.status === "active"
                        ? "Active"
                        : "Archived"
                  }
                />
              </summary>
              <div className="border-t border-border p-4">
                <AcademicYearForm year={year} />
              </div>
            </details>
          ))}
          <details className="configuration-disclosure">
            <summary>
              <strong>Add academic year</strong>
              <span className="text-xs text-muted-foreground">
                Create the next cycle before scheduling its terms
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <AcademicYearForm />
            </div>
          </details>
        </div>
      </section>

      <section
        className="panel mt-6 p-5"
        aria-labelledby="class-catalogue-title"
      >
        <div>
          <h2 id="class-catalogue-title" className="text-base font-semibold">
            Class catalogue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thirteen approved classes, grouped for consistent ordering and
            future fee applicability.
          </p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {configuration.classes.map((schoolClass) => (
            <details key={schoolClass.id} className="configuration-disclosure">
              <summary>
                <span>
                  <strong>{schoolClass.name}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {classGroupLabels[schoolClass.class_group]}
                  </span>
                </span>
                <StatusBadge
                  status={
                    schoolClass.status === "active" ? "Active" : "Archived"
                  }
                />
              </summary>
              <div className="border-t border-border p-4">
                <ClassForm record={schoolClass} />
              </div>
            </details>
          ))}
        </div>
        <details className="configuration-disclosure mt-3">
          <summary>
            <strong>Add class</strong>
            <span className="text-xs text-muted-foreground">
              Use only when the school introduces another class
            </span>
          </summary>
          <div className="border-t border-border p-4">
            <ClassForm />
          </div>
        </details>
      </section>

      <section className="panel mt-6 p-5" aria-labelledby="audit-title">
        <h2 id="audit-title" className="text-base font-semibold">
          Recent configuration history
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Protected, read-only evidence of academic and school-setting changes.
        </p>
        <ol className="mt-4 divide-y divide-border">
          {configuration.audit.slice(0, 10).map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span>
                <strong className="capitalize">{entry.action}</strong>{" "}
                {entry.entity_type.replaceAll("_", " ")} #{entry.entity_id}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.actor_user_id
                  ? "Authorized administrator"
                  : "Initial system configuration"}{" "}
                · {dateFormatter.format(new Date(entry.created_at))}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
