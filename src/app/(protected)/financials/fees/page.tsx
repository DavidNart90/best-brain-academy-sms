import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { Button } from "@/components/ui/button";
import { DocumentHeader } from "@/features/finance/components/document-header";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import {
  BaseClassFeesForm,
  FlatFeesForm,
  TransportChargesForm,
} from "@/features/finance/components/fee-rate-forms";
import {
  getFinancePeriods,
  getFinanceSettings,
} from "@/features/finance/server/queries";
import { feeTotal } from "@/features/finance/fee-total";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function FeeStructurePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const periods = await getFinancePeriods();
  const raw = (await searchParams).term;
  const selected =
    raw === undefined
      ? periods.find((period) => period.isCurrent)
      : periods.find((period) => String(period.id) === raw);
  if (!selected)
    return (
      <PageState
        title="Select an academic period"
        description="The requested term is unavailable. Choose a configured academic term to view its fees."
      >
        <Link href="/financials/fees" className="text-primary underline">
          View current term
        </Link>
      </PageState>
    );
  const settings = await getFinanceSettings(selected.id);
  const canManage = hasPermission(context, "finance.settings.manage");
  const periodProps = {
    academicYearId: settings.academicYearId,
    academicTermId: settings.academicTermId,
  };

  return (
    <>
      <PageHeader
        title="Fee Structure"
        description="School fees by class and transport location. Changes apply to future invoices; issued invoices keep their original amounts."
      >
        <PrintInvoiceButton />
      </PageHeader>
      <form className="mb-5 flex flex-wrap items-end gap-3 print:hidden">
        <div className="field">
          <label className="field-label" htmlFor="fee-term">
            Academic year / term
          </label>
          <select
            id="fee-term"
            name="term"
            className="native-select"
            defaultValue={selected.id}
          >
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label}
                {period.isCurrent ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          View fees
        </Button>
      </form>
      <section className="finance-document panel p-5 sm:p-6">
        <DocumentHeader title="Fee structure" reference={selected.label} />
        <h3 className="mt-6 text-base font-semibold">Term school fees</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each total includes the base class fee plus the charge for the
          student’s transport location.
        </p>
        <div
          className="table-scroll mt-4"
          role="region"
          aria-label="Term fee schedule"
          tabIndex={0}
        >
          <table className="fee-schedule w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/70">
                <th className="p-3 text-left font-medium">Class</th>
                <th className="p-3 text-right font-medium">Base fee</th>
                {settings.transportCharges.map((location) => (
                  <th
                    key={location.schoolLocationId}
                    className="p-3 text-right font-medium"
                  >
                    {location.locationName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settings.baseClassFees.map((row) => (
                <tr key={row.classId} className="border-b last:border-0">
                  <th className="whitespace-nowrap p-3 text-left font-medium">
                    {row.className}
                  </th>
                  <td className="p-3 text-right">
                    <Rate amount={row.amount} />
                  </td>
                  {settings.transportCharges.map((location) => (
                    <td
                      key={location.schoolLocationId}
                      className="p-3 text-right"
                    >
                      <Rate amount={feeTotal(row.amount, location.amount)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-6 text-sm font-semibold">
          Transport component included in the totals above
        </h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.transportCharges.map((location) => (
            <div key={location.schoolLocationId}>
              <dt className="text-xs text-muted-foreground">
                {location.locationName}
              </dt>
              <dd className="mt-1 font-medium">
                <Rate amount={location.amount} />
              </dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-6 border-t pt-5 text-base font-semibold">
          Other fees
        </h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          {settings.flatFees.map((fee) => (
            <div key={fee.code}>
              <dt className="text-sm">
                {fee.code === "feeding_fee"
                  ? "Feeding · per paying student per day"
                  : "Admission · one-time fee"}
              </dt>
              <dd className="mt-1 font-semibold">
                <Rate amount={fee.amount} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">
          Feeding and admission fees are separate from term school fees. A
          missing rate is shown as “Not configured” and is never treated as
          zero.
        </p>
      </section>
      {canManage && (
        <details className="configuration-disclosure mt-5 print:hidden">
          <summary>
            <strong>Edit fees for {selected.label}</strong>
            <span className="text-xs text-muted-foreground">
              Authorized financial settings
            </span>
          </summary>
          <div
            className="space-y-4 border-t p-4"
            key={JSON.stringify([
              selected.id,
              settings.baseClassFees,
              settings.transportCharges,
              settings.flatFees,
            ])}
          >
            <BaseClassFeesForm {...periodProps} rows={settings.baseClassFees} />
            <TransportChargesForm
              {...periodProps}
              rows={settings.transportCharges}
            />
            <FlatFeesForm {...periodProps} flatFees={settings.flatFees} />
          </div>
        </details>
      )}
    </>
  );
}

function Rate({ amount }: { amount: string | null }) {
  return amount === null ? (
    <span className="text-xs text-muted-foreground">Not configured</span>
  ) : (
    <Money value={amount} />
  );
}
