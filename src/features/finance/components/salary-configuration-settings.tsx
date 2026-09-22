import { Money } from "@/components/data-display/money";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  EndSalaryConfigurationForm,
  SalaryConfigurationForm,
} from "./salary-configuration-form";
import type {
  SalaryConfiguration,
  SalaryConfigurationStaffOption,
} from "../types";

export function SalaryConfigurationSettings({
  defaultMonth,
  rows,
  availableStaff,
}: {
  defaultMonth: string;
  rows: SalaryConfiguration[];
  availableStaff: SalaryConfigurationStaffOption[];
}) {
  const activeSalaries = rows
    .filter((row) => row.status === "active")
    .sort((left, right) => left.staffName.localeCompare(right.staffName));
  const endedSalaries = rows.filter((row) => row.status === "ended");

  return (
    <section
      id="staff-salaries"
      className="panel scroll-mt-24 p-5"
      aria-labelledby="staff-salaries-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="staff-salaries-title" className="text-base font-semibold">
            Staff salaries
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Set the gross salary used for future monthly postings. A change can
            start in a later month, and ending a salary preserves its history.
            Saving here never posts a salary record.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Active configurations</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {activeSalaries.length}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {activeSalaries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No staff salaries are configured yet.
          </p>
        )}
        {activeSalaries.map((salary) => (
          <details key={salary.id} className="configuration-disclosure">
            <summary>
              <span>
                <strong>{salary.staffName}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {salary.staffNumber} · {salary.position}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">
                  <Money value={salary.grossSalary} />
                </span>
                <StatusBadge status="Active" />
              </span>
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                Current from {salary.effectiveFrom.slice(0, 7)}. Use the same
                month to correct an unposted setup, or a later month to preserve
                the current rate as history.
              </p>
              <SalaryConfigurationForm
                defaultMonth={defaultMonth}
                staff={[]}
                record={salary}
              />
              <EndSalaryConfigurationForm
                defaultMonth={defaultMonth}
                record={salary}
              />
            </div>
          </details>
        ))}
        {availableStaff.length > 0 && (
          <details className="configuration-disclosure">
            <summary>
              <strong>Add staff salary</strong>
              <span className="text-xs text-muted-foreground">
                Choose an active staff member without a current salary
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <SalaryConfigurationForm
                defaultMonth={defaultMonth}
                staff={availableStaff}
              />
            </div>
          </details>
        )}
        {endedSalaries.length > 0 && (
          <details className="configuration-disclosure">
            <summary>
              <strong>Ended salary history</strong>
              <span className="text-xs text-muted-foreground">
                {endedSalaries.length} preserved configuration
                {endedSalaries.length === 1 ? "" : "s"}
              </span>
            </summary>
            <InMemoryTablePagination
              total={endedSalaries.length}
              itemLabel="configurations"
              pageSize={10}
            >
              <div
                className="table-scroll border-t border-border"
                tabIndex={0}
                role="region"
                aria-label="Ended salary configurations"
              >
                <table className="w-full min-w-190 text-sm">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Staff</th>
                      <th className="py-3 text-right font-medium">Gross</th>
                      <th className="py-3 text-left font-medium">Period</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <PaginatedRows>
                      {endedSalaries.map((salary) => (
                        <tr key={salary.id} className="border-t">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{salary.staffName}</p>
                            <p className="text-xs text-muted-foreground">
                              {salary.staffNumber}
                            </p>
                          </td>
                          <td className="py-3 text-right">
                            <Money value={salary.grossSalary} />
                          </td>
                          <td className="py-3">
                            {salary.effectiveFrom.slice(0, 7)} to{" "}
                            {salary.effectiveTo?.slice(0, 7)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {salary.endReason}
                          </td>
                        </tr>
                      ))}
                    </PaginatedRows>
                  </tbody>
                </table>
              </div>
            </InMemoryTablePagination>
          </details>
        )}
      </div>
    </section>
  );
}
