import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  FinancialModuleCards,
  isFinancialModule,
} from "@/features/finance/components/financial-settings-navigation";
import { FinancialSettingsPanel } from "@/features/finance/components/financial-settings-panel";
import {
  getFinancePeriods,
  getFinanceSettings,
} from "@/features/finance/server/queries";
import {
  getDeductionTypes,
  getSalaryConfigurations,
} from "@/features/finance/server/salary-queries";
import { requirePermission } from "@/lib/auth/access";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FinancialSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string | string[];
    term?: string | string[];
  }>;
}) {
  const context = await requirePermission("finance.settings.manage");
  if (!context) return <PermissionDenied />;

  const params = await searchParams;
  const rawSection = first(params.section);
  const selectedSection = isFinancialModule(rawSection) ? rawSection : null;
  const periods = await getFinancePeriods();
  const requestedTermId = Number(first(params.term));
  const selectedTerm =
    periods.find((period) => period.id === requestedTermId) ??
    periods.find((period) => period.isCurrent) ??
    periods[0];
  const settings = await getFinanceSettings(selectedTerm?.id);
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const salaryData =
    selectedSection === "salaries"
      ? await Promise.all([getDeductionTypes(), getSalaryConfigurations()])
      : null;
  const salarySettings = salaryData
    ? {
        deductionTypes: salaryData[0],
        rows: salaryData[1].rows,
        availableStaff: salaryData[1].availableStaff,
      }
    : null;

  return (
    <>
      <PageHeader
        title="Financial settings"
        description={`Choose the configuration area you need. The selected fee period is ${settings.academicYearName} ${settings.academicTermName}; approved rates are locked for billing.`}
      />
      <FinancialModuleCards selectedSection={selectedSection} />
      {selectedSection && (
        <FinancialSettingsPanel
          defaultMonth={defaultMonth}
          selectedSection={selectedSection}
          settings={settings}
          periods={periods}
          salarySettings={salarySettings}
        />
      )}
    </>
  );
}
