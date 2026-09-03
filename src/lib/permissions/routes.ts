import {
  hasPermission,
  type AccessContext,
  type Permission,
} from "./contracts";

export type AppRoute = {
  href: string;
  title: string;
  permission: Permission;
  phase: number;
  description: string;
};
export const appRoutes: AppRoute[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    permission: "dashboard.read",
    phase: 0,
    description: "Your school at a glance.",
  },
  {
    href: "/admissions/new",
    title: "New Admission",
    permission: "students.manage",
    phase: 2,
    description: "Student and guardian intake with class enrollment.",
  },
  {
    href: "/admissions",
    title: "Admission Records",
    permission: "admissions.read",
    phase: 2,
    description: "Review admission records and enrollment history.",
  },
  {
    href: "/students",
    title: "Students",
    permission: "students.read",
    phase: 2,
    description: "Student records, guardian details and financial accounts.",
  },
  {
    href: "/classes",
    title: "Classes",
    permission: "classes.read",
    phase: 1,
    description: "Class configuration and academic context.",
  },
  {
    href: "/staff",
    title: "Staff",
    permission: "staff.read",
    phase: 2,
    description: "Teaching and non-teaching staff records.",
  },
  {
    href: "/financials",
    title: "Financial Overview",
    permission: "financials.read",
    phase: 5,
    description: "Verified collections, expenses and outstanding balances.",
  },
  {
    href: "/financials/cashflow",
    title: "Daily Cashflow",
    permission: "financials.read",
    phase: 3,
    description: "Posted receipts, expenses and net cashflow by business date.",
  },
  {
    href: "/financials/fees",
    title: "Fee Structure",
    permission: "financials.read",
    phase: 3,
    description: "Configurable fees by academic year, term and class.",
  },
  {
    href: "/financials/invoices",
    title: "Invoices",
    permission: "financials.read",
    phase: 3,
    description: "Issued invoices and their original fee snapshots.",
  },
  {
    href: "/financials/payments",
    title: "Payments",
    permission: "financials.read",
    phase: 3,
    description: "Full and partial fee payments.",
  },
  {
    href: "/financials/receipts",
    title: "Receipts",
    permission: "financials.read",
    phase: 3,
    description: "Payment receipts and reprints.",
  },
  {
    href: "/financials/outstanding",
    title: "Outstanding Fees",
    permission: "financials.read",
    phase: 3,
    description: "Outstanding balances by student and class.",
  },
  {
    href: "/financials/expenses",
    title: "Expenses",
    permission: "financials.read",
    phase: 4,
    description: "School expenses and supporting records.",
  },
  {
    href: "/financials/salary-deductions",
    title: "Salary Deductions",
    permission: "financials.read",
    phase: 4,
    description: "Staff deduction records. Full payroll is outside scope.",
  },
  {
    href: "/reports",
    title: "Reports",
    permission: "reports.read",
    phase: 5,
    description: "Reconciled administrative and financial reports.",
  },
  {
    href: "/administrators",
    title: "Administrators",
    permission: "administrators.manage",
    phase: 2,
    description: "Explicit staff account access and role assignments.",
  },
  {
    href: "/settings",
    title: "Settings",
    permission: "settings.manage",
    phase: 1,
    description: "School, academic and system configuration.",
  },
  {
    href: "/settings/school",
    title: "School Settings",
    permission: "settings.manage",
    phase: 1,
    description: "School identity and contact information.",
  },
  {
    href: "/settings/academics",
    title: "Academic Settings",
    permission: "settings.manage",
    phase: 1,
    description: "Academic years and terms.",
  },
  {
    href: "/settings/financial",
    title: "Financial Settings",
    permission: "settings.manage",
    phase: 3,
    description: "Financial categories and document numbering.",
  },
  {
    href: "/settings/roles",
    title: "Roles & Permissions",
    permission: "administrators.manage",
    phase: 2,
    description: "Controlled administrator permissions.",
  },
];

export function permittedRoutes(context: AccessContext) {
  return appRoutes.filter((route) => hasPermission(context, route.permission));
}

export function resolveRoute(path: string): AppRoute | undefined {
  const exact = appRoutes.find((route) => route.href === path);
  if (exact) return exact;
  const details =
    /^\/(admissions|students|classes|staff|financials\/invoices|financials\/receipts)\/[a-zA-Z0-9-]{1,64}$/.exec(
      path,
    );
  if (!details) return undefined;
  const parent = appRoutes.find((route) => route.href === `/${details[1]}`);
  return parent
    ? { ...parent, href: path, title: `${parent.title} · Record` }
    : undefined;
}
