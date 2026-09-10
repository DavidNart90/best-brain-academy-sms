import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  GraduationCap,
  Tags,
  WalletCards,
} from "lucide-react";

export const financialModules = [
  {
    id: "fees",
    title: "Student fees",
    description:
      "Maintain class fees, transport charges, feeding and admission amounts for the current academic term.",
    detail: "Class, transport and daily charges",
    icon: GraduationCap,
  },
  {
    id: "salaries",
    title: "Salaries",
    description:
      "Manage effective staff salary rates and the percentage or fixed deductions used by the salary register.",
    detail: "Staff rates and deductions",
    icon: Banknote,
  },
  {
    id: "payments",
    title: "Payment setup",
    description:
      "Control approved payment methods and review the server-generated reference formats used for financial records.",
    detail: "Methods and document references",
    icon: WalletCards,
  },
  {
    id: "categories",
    title: "Financial categories",
    description:
      "Maintain the approved expense and miscellaneous income categories used when staff record daily activity.",
    detail: "Expense and income lists",
    icon: Tags,
  },
] as const;

export type FinancialModuleId = (typeof financialModules)[number]["id"];

export function isFinancialModule(
  value: string | undefined,
): value is FinancialModuleId {
  return financialModules.some((module) => module.id === value);
}

export function FinancialModuleCards({
  selectedSection,
}: {
  selectedSection: FinancialModuleId | null;
}) {
  return (
    <section aria-labelledby="financial-modules-title">
      <div>
        <h2 id="financial-modules-title" className="text-base font-semibold">
          Configuration modules
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open one module at a time to keep financial configuration focused and
          easier to review.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {financialModules.map((module) => {
          const Icon = module.icon;
          const isSelected = module.id === selectedSection;

          return (
            <Link
              key={module.id}
              href={`/settings/financials?section=${module.id}#financial-settings-panel`}
              aria-current={isSelected ? "page" : undefined}
              className={`group panel flex min-h-52 flex-col p-5 outline-none transition-[transform,border-color,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_rgba(47,34,32,0.08)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 motion-reduce:transform-none ${
                isSelected ? "border-primary/45 bg-brand-subtle/45" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-md bg-brand-subtle text-primary">
                  <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  size={19}
                  className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-[-0.015em]">
                {module.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {module.description}
              </p>
              <p className="mt-5 border-t border-border pt-4 text-xs font-medium text-primary">
                {isSelected ? "Currently open" : module.detail}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
