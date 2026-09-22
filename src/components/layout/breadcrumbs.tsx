"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { permittedRoutes } from "@/lib/permissions/routes";
import type { AccessContext } from "@/lib/permissions/contracts";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  admissions: "Admissions",
  new: "New admission",
  students: "Students",
  finance: "Financial account",
  classes: "Classes",
  staff: "Staff",
  library: "Library collections",
  financials: "Financials",
  cashflow: "Daily cashflow",
  fees: "Fee structure",
  invoices: "Invoices",
  "end-of-term-invoices": "End-of-Term Invoices",
  payments: "Payments",
  receipts: "Receipts",
  outstanding: "Outstanding fees",
  expenses: "Expenses",
  "salary-deductions": "Salaries & deductions",
  document: "Document",
  print: "Print preview",
  reports: "Reports",
  administrators: "Administrators",
  settings: "Settings",
  profile: "Profile settings",
  school: "School settings",
  academics: "Academic settings",
  roles: "Roles & permissions",
};

function labelFor(segment: string, previous?: string) {
  if (labels[segment]) return labels[segment];
  if (/^\d+$/.test(segment)) {
    if (previous === "students") return "Student record";
    if (previous === "staff") return "Staff profile";
    if (previous === "classes") return "Class profile";
    if (previous === "invoices") return "Invoice";
    if (previous === "salary-deductions") return "Salary record";
  }
  return "Record";
}

export function Breadcrumbs({ context }: { context: AccessContext }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const allowed = new Set(permittedRoutes(context).map((route) => route.href));
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: labelFor(segment, segments[index - 1]),
      current: index === segments.length - 1,
      canOpen: allowed.has(href),
    };
  });

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 min-w-0 overflow-x-auto pb-0.5 print:hidden"
    >
      <ol className="flex min-w-max items-center gap-1 text-xs text-muted-foreground">
        <li>
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Home className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
        {crumbs
          .filter((crumb) => crumb.href !== "/dashboard")
          .map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="size-3.5" aria-hidden="true" />
              {crumb.current || !crumb.canOpen ? (
                <span
                  aria-current={crumb.current ? "page" : undefined}
                  className={crumb.current ? "font-medium text-foreground" : ""}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded px-1 py-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        {pathname === "/dashboard" && (
          <li aria-current="page" className="font-medium text-foreground">
            Dashboard
          </li>
        )}
      </ol>
    </nav>
  );
}
