import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/data-display/status-badge";
import type {
  DeductionType,
  FinanceCategory,
  FinanceSettings,
  SalaryConfiguration,
  SalaryConfigurationStaffOption,
} from "@/features/finance/types";
import { FinanceCategoryForm, PaymentMethodForm } from "./category-forms";
import { DeductionTypeForm } from "./deduction-type-form";
import {
  BaseClassFeesForm,
  FlatFeesForm,
  TransportChargesForm,
} from "./fee-rate-forms";
import {
  financialModules,
  type FinancialModuleId,
} from "./financial-settings-navigation";
import { SalaryConfigurationSettings } from "./salary-configuration-settings";

type SalarySettings = {
  deductionTypes: DeductionType[];
  rows: SalaryConfiguration[];
  availableStaff: SalaryConfigurationStaffOption[];
};

function FeesSettings({ settings }: { settings: FinanceSettings }) {
  return (
    <>
      <BaseClassFeesForm
        academicYearId={settings.academicYearId}
        academicTermId={settings.academicTermId}
        rows={settings.baseClassFees}
      />
      <TransportChargesForm
        academicYearId={settings.academicYearId}
        academicTermId={settings.academicTermId}
        rows={settings.transportCharges}
      />
      <FlatFeesForm
        academicYearId={settings.academicYearId}
        academicTermId={settings.academicTermId}
        flatFees={settings.flatFees}
      />
    </>
  );
}

function DeductionTypes({ rows }: { rows: DeductionType[] }) {
  return (
    <section
      className="panel p-5"
      aria-labelledby="salary-deduction-types-title"
    >
      <div>
        <h3
          id="salary-deduction-types-title"
          className="text-base font-semibold"
        >
          Payroll deduction types
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure SSNIT or other percentage and fixed deductions with
          effective dates. Posted salary history keeps its original calculation.
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((type) => (
          <details key={type.id} className="configuration-disclosure">
            <summary>
              <span>
                <strong>{type.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {type.calculationType === "percentage"
                    ? `${type.defaultValue ?? "No default"}%`
                    : type.defaultValue
                      ? `GHS ${type.defaultValue}`
                      : "Amount entered per record"}
                </span>
              </span>
              <StatusBadge
                status={type.status === "active" ? "Active" : "Archived"}
              />
            </summary>
            <div className="border-t border-border p-4">
              <DeductionTypeForm record={type} />
            </div>
          </details>
        ))}
        <details className="configuration-disclosure">
          <summary>
            <strong>Add deduction type</strong>
            <span className="text-xs text-muted-foreground">
              Use for another approved staff deduction
            </span>
          </summary>
          <div className="border-t border-border p-4">
            <DeductionTypeForm />
          </div>
        </details>
      </div>
    </section>
  );
}

function SalarySettingsModule({
  defaultMonth,
  settings,
}: {
  defaultMonth: string;
  settings: SalarySettings;
}) {
  return (
    <>
      <SalaryConfigurationSettings
        defaultMonth={defaultMonth}
        rows={settings.rows}
        availableStaff={settings.availableStaff}
      />
      <DeductionTypes rows={settings.deductionTypes} />
    </>
  );
}

function PaymentMethods({ settings }: { settings: FinanceSettings }) {
  return (
    <section className="panel p-5" aria-labelledby="payment-methods-title">
      <div>
        <h3 id="payment-methods-title" className="text-base font-semibold">
          Payment methods
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobile Money and Bank Transfer require an external reference at the
          point of payment.
        </p>
      </div>
      <div className="mt-5 space-y-3">
        {settings.paymentMethods.map((method) => (
          <details key={method.id} className="configuration-disclosure">
            <summary>
              <span>
                <strong>{method.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {method.code}
                </span>
              </span>
              <StatusBadge
                status={method.status === "active" ? "Active" : "Archived"}
              />
            </summary>
            <div className="border-t border-border p-4">
              <PaymentMethodForm record={method} />
            </div>
          </details>
        ))}
        <details className="configuration-disclosure">
          <summary>
            <strong>Add payment method</strong>
            <span className="text-xs text-muted-foreground">
              Use when the school approves another payment method
            </span>
          </summary>
          <div className="border-t border-border p-4">
            <PaymentMethodForm />
          </div>
        </details>
      </div>
    </section>
  );
}

function DocumentNumbering() {
  const formats = [
    ["Invoice", "BBA/INV/{YYYY}/{NNNNN}"],
    ["Payment", "BBA/PAY/{YYYY}/{NNNNN}"],
    ["Receipt", "BBA/RCT/{YYYY}/{NNNNN}"],
    ["Expense", "BBA/EXP/{YYYY}/{NNNNN}"],
    ["Salary", "BBA/SAL/{YYYY}/{NNNNN}"],
    ["Deduction", "BBA/DED/{YYYY}/{NNNNN}"],
    ["Reversal", "BBA/REV/{YYYY}/{NNNNN}"],
  ] as const;

  return (
    <section
      className="panel border-dashed p-5"
      aria-labelledby="numbering-title"
    >
      <h3 id="numbering-title" className="text-sm font-semibold">
        Document numbering
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Financial references are generated by the server and are always unique.
        Gaps are allowed so retry-safe numbering is never weakened to force a
        gapless sequence.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-7">
        {formats.map(([label, format]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-xs font-semibold">{format}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PaymentSettings({ settings }: { settings: FinanceSettings }) {
  return (
    <>
      <PaymentMethods settings={settings} />
      <DocumentNumbering />
    </>
  );
}

function CategorySettings({
  categories,
  description,
  emptyMessage,
  id,
  kind,
  title,
}: {
  categories: FinanceCategory[];
  description: string;
  emptyMessage?: string;
  id: string;
  kind: "expense" | "misc-income";
  title: string;
}) {
  const isExpense = kind === "expense";

  return (
    <section className="panel p-5" aria-labelledby={id}>
      <div>
        <h3 id={id} className="text-base font-semibold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 space-y-3">
        {categories.length === 0 && emptyMessage && (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
        {categories.map((category) => (
          <details key={category.id} className="configuration-disclosure">
            <summary>
              <span>
                <strong>{category.name}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {category.code}
                </span>
              </span>
              <StatusBadge
                status={category.status === "active" ? "Active" : "Archived"}
              />
            </summary>
            <div className="border-t border-border p-4">
              <FinanceCategoryForm record={category} kind={kind} />
            </div>
          </details>
        ))}
        <details className="configuration-disclosure">
          <summary>
            <strong>{isExpense ? "Add expense" : "Add income"} category</strong>
            <span className="text-xs text-muted-foreground">
              Use when the school approves another{" "}
              {isExpense ? "expense" : "income"} category
            </span>
          </summary>
          <div className="border-t border-border p-4">
            <FinanceCategoryForm kind={kind} />
          </div>
        </details>
      </div>
    </section>
  );
}

function CategoriesSettings({ settings }: { settings: FinanceSettings }) {
  return (
    <>
      <CategorySettings
        categories={settings.expenseCategories}
        description="Every daily expense must use one of these configurable categories."
        id="expense-categories-title"
        kind="expense"
        title="Expense categories"
      />
      <CategorySettings
        categories={settings.miscIncomeCategories}
        description="Official categories remain a school decision; none are added until confirmed here."
        emptyMessage="No miscellaneous income categories are configured yet."
        id="misc-income-categories-title"
        kind="misc-income"
        title="Miscellaneous income categories"
      />
    </>
  );
}

export function FinancialSettingsPanel({
  defaultMonth,
  salarySettings,
  selectedSection,
  settings,
}: {
  defaultMonth: string;
  salarySettings: SalarySettings | null;
  selectedSection: FinancialModuleId;
  settings: FinanceSettings;
}) {
  const selectedModule = financialModules.find(
    (module) => module.id === selectedSection,
  );

  return (
    <section
      id="financial-settings-panel"
      className="mt-7 scroll-mt-24"
      aria-labelledby="selected-financial-module-title"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h2
            id="selected-financial-module-title"
            className="text-xl font-semibold tracking-[-0.02em]"
          >
            {selectedModule?.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {selectedModule?.description}
          </p>
        </div>
        <Link
          href="/settings/financials"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium outline-none transition-colors hover:border-primary/35 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          All modules
        </Link>
      </div>

      <div className="space-y-5">
        {selectedSection === "fees" && <FeesSettings settings={settings} />}
        {selectedSection === "salaries" && salarySettings && (
          <SalarySettingsModule
            defaultMonth={defaultMonth}
            settings={salarySettings}
          />
        )}
        {selectedSection === "payments" && (
          <PaymentSettings settings={settings} />
        )}
        {selectedSection === "categories" && (
          <CategoriesSettings settings={settings} />
        )}
      </div>
    </section>
  );
}
