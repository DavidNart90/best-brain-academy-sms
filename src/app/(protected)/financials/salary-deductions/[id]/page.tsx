import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Money } from "@/components/data-display/money";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  SalaryDeductionForm,
  SalaryReverseForm,
} from "@/features/finance/components/salary-forms";
import {
  getDeductionTypes,
  getSalaryDetail,
} from "@/features/finance/server/salary-queries";
import { invoiceIdSchema } from "@/features/finance/schemas";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

export default async function SalaryRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const parsed = invoiceIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const salary = await getSalaryDetail(parsed.data);
  if (!salary) notFound();
  const canManage = hasPermission(context, "finance.transactions.manage");
  const deductionTypes =
    canManage && salary.status === "active"
      ? (await getDeductionTypes()).filter(
          (item) =>
            item.status === "active" &&
            item.effectiveFrom <= salary.payrollMonth &&
            (!item.effectiveTo || item.effectiveTo >= salary.payrollMonth),
        )
      : [];
  const activeTypeIds = new Set(
    salary.deductions
      .filter((item) => item.status === "active")
      .map((item) => item.deductionTypeId),
  );

  return (
    <>
      <PageHeader
        title={salary.salaryNumber}
        description={`${salary.staffName} · ${date(salary.payrollMonth)}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link
              href={`/financials/salary-deductions?month=${salary.payrollMonth}`}
            >
              <ArrowLeft />
              Salary register
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/staff/${salary.staffId}`}>
              <UserRound />
              Staff profile
            </Link>
          </Button>
        </div>
      </PageHeader>
      <div className="space-y-5">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-base font-semibold">Salary position</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {salary.staffNumber} · {salary.position}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                status={salary.status === "active" ? "Active" : "Reversed"}
              />
              {canManage && salary.status === "active" && (
                <SalaryReverseForm kind="salary" recordId={salary.id} />
              )}
            </div>
          </div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Gross salary" value={salary.grossSalary} />
            <Metric label="Total deductions" value={salary.totalDeductions} />
            <Metric label="Net salary" value={salary.netSalary} strong />
            <div>
              <dt className="text-xs text-muted-foreground">Recorded by</dt>
              <dd className="mt-2 text-sm font-semibold">
                {salary.recordedBy}
              </dd>
              <dd className="mt-1 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(salary.createdAt))}
              </dd>
            </div>
          </dl>
          {salary.status === "reversed" && (
            <div className="mt-5 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold">Reversed {salary.reversalNumber}</p>
              <p className="mt-1 text-muted-foreground">
                {salary.reversalReason} ·{" "}
                {salary.reversedBy ?? "Authorized administrator"}
              </p>
            </div>
          )}
        </section>
        {canManage && salary.status === "active" && (
          <SalaryDeductionForm
            salaryRecordId={salary.id}
            deductionTypes={deductionTypes.filter(
              (item) => !activeTypeIds.has(item.id),
            )}
          />
        )}
        <section
          className="panel overflow-hidden"
          aria-labelledby="deductions-title"
        >
          <div className="border-b p-5">
            <h2 id="deductions-title" className="text-base font-semibold">
              Deductions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each amount keeps the rule and gross salary used when it was
              posted.
            </p>
          </div>
          {salary.deductions.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No deductions are recorded.
            </p>
          ) : (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Salary deductions"
            >
              <table className="w-full min-w-190 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">
                      Deduction
                    </th>
                    <th className="py-3 text-left font-medium">Calculation</th>
                    <th className="py-3 text-right font-medium">Amount</th>
                    <th className="py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {salary.deductions.map((item) => (
                    <tr className="border-t" key={item.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {item.deductionTypeName}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {item.deductionNumber}
                        </p>
                        {item.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.reason}
                          </p>
                        )}
                      </td>
                      <td className="py-4">
                        {item.calculationType === "percentage"
                          ? `${item.configuredValue}% of gross`
                          : "Fixed amount"}
                      </td>
                      <td className="py-4 text-right">
                        <Money value={item.amount} />
                      </td>
                      <td className="py-4">
                        <StatusBadge
                          status={
                            item.status === "active" ? "Active" : "Reversed"
                          }
                        />
                        {item.reversalNumber && (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {item.reversalNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canManage &&
                          salary.status === "active" &&
                          item.status === "active" && (
                            <SalaryReverseForm
                              kind="deduction"
                              recordId={item.id}
                            />
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-2 text-xl tabular-nums ${strong ? "font-bold text-primary" : "font-semibold"}`}
      >
        <Money value={value} />
      </dd>
    </div>
  );
}
