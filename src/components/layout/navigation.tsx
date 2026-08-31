"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  School,
  BriefcaseBusiness,
  WalletCards,
  ChartNoAxesCombined,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { permittedRoutes } from "@/lib/permissions/routes";
import type { AccessContext } from "@/lib/permissions/contracts";
import { cn } from "@/lib/utils";

const items: {
  title: string;
  href: string;
  icon: LucideIcon;
  group?: boolean;
}[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Admissions", href: "/admissions", icon: UserPlus, group: true },
  { title: "Students", href: "/students", icon: GraduationCap },
  { title: "Classes", href: "/classes", icon: School },
  { title: "Staff", href: "/staff", icon: BriefcaseBusiness },
  { title: "Financials", href: "/financials", icon: WalletCards, group: true },
  { title: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { title: "Administrators", href: "/administrators", icon: ShieldCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Navigation({
  context,
  compact = false,
  onNavigate,
}: {
  context: AccessContext;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const allowed = permittedRoutes(context);
  return (
    <nav aria-label="Main navigation" className="space-y-1">
      {items
        .filter((item) => allowed.some((route) => route.href === item.href))
        .map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const classes = cn(
            "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors hover:bg-muted",
            active
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground",
            compact && "justify-center px-0",
          );
          if (item.group && !compact)
            return (
              <details
                key={item.href}
                open={active || undefined}
                className="group"
              >
                <summary
                  className={cn(
                    classes,
                    "list-none [&::-webkit-details-marker]:hidden",
                  )}
                >
                  <Icon size={19} />
                  <span className="flex-1">{item.title}</span>
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="ml-5 my-2 border-l border-border pl-3">
                  {allowed
                    .filter(
                      (route) =>
                        route.href === item.href ||
                        route.href.startsWith(`${item.href}/`),
                    )
                    .map((route) => (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={onNavigate}
                        aria-current={
                          pathname === route.href ? "page" : undefined
                        }
                        className={cn(
                          "my-0.5 flex min-h-10 items-center rounded-md px-3 text-xs hover:bg-muted",
                          pathname === route.href
                            ? "font-semibold text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {route.title}
                      </Link>
                    ))}
                </div>
              </details>
            );
          return (
            <Link
              key={item.href}
              href={item.href}
              title={compact ? item.title : undefined}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={classes}
            >
              <Icon size={19} />
              <span className={compact ? "sr-only" : ""}>{item.title}</span>
            </Link>
          );
        })}
    </nav>
  );
}
