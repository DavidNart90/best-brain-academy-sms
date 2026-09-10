import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SalaryCashWorkflow } from "@/features/finance/components/salary-cash-workflow";
import {
  SalaryDeductionsSection,
  SalaryPositionSummary,
} from "@/features/finance/components/salary-record-sections";
import {
  getDeductionTypes,
  getSalaryDetail,
  getSalaryPaymentMethods,
} from "@/features/finance/server/salary-queries";
import { invoiceIdSchema } from "@/features/finance/schemas";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});
const date = (value: string) =>
  dateFormatter.format(new Date(`${value}T00:00:00Z`));

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
  const paymentMethods =
    canManage && salary.status === "active"
      ? await getSalaryPaymentMethods()
      : [];
  const businessDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={salary.salaryNumber}
        description={`${salary.staffName} · ${date(salary.payrollMonth)} · calculation and payment status`}
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
        <SalaryPositionSummary salary={salary} canManage={canManage} />
        <SalaryCashWorkflow
          salary={salary}
          canManage={canManage}
          businessDate={businessDate}
          paymentMethods={paymentMethods}
        />
        <SalaryDeductionsSection
          salary={salary}
          canManage={canManage}
          deductionTypes={deductionTypes}
        />
      </div>
    </>
  );
}
