"use client";

import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Brand } from "./brand";
import { Navigation } from "./navigation";
import { PageSearch } from "./page-search";
import { LogoutButton } from "./logout-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { AccessContext, Role } from "@/lib/permissions/contracts";
import { cn } from "@/lib/utils";

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMINISTRATOR: "Administrator",
  ACCOUNTANT: "Accountant",
  MANAGEMENT: "Management · Read only",
};

export function AppShell({
  context,
  children,
}: {
  context: AccessContext;
  children: React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = context.roles[0];
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card px-4 lg:flex",
          compact ? "w-[72px] px-2" : "w-[232px]",
        )}
      >
        <div className="shrink-0 py-2">
          <Brand compact={compact} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <Navigation context={context} compact={compact} />
        </div>
        <div className="space-y-2 border-t border-border py-4">
          <LogoutButton compact={compact} />
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCompact(!compact)}
          >
            {compact ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            {!compact && <span>Collapse sidebar</span>}
          </Button>
        </div>
      </aside>
      <div className={compact ? "lg:pl-[72px]" : "lg:pl-[232px]"}>
        <header className="flex h-[72px] items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto p-5">
                <SheetTitle className="sr-only">School navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate to the pages available to your account.
                </SheetDescription>
                <Brand />
                <Navigation
                  context={context}
                  onNavigate={() => setMobileOpen(false)}
                />
                <LogoutButton />
              </SheetContent>
            </Sheet>
            <PageSearch context={context} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold">
                {context.displayName || "Staff account"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {role ? roleLabels[role] : "No role assigned"}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full border border-border bg-brand-subtle text-xs font-semibold text-accent-foreground"
            >
              {context.displayName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2) || "ST"}
            </span>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 p-4 sm:p-6 xl:p-7"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
