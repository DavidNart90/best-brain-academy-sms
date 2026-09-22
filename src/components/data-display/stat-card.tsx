import type { LucideIcon } from "lucide-react";
import { Money } from "./money";
import { cn } from "@/lib/utils";

export type StatCardTone = "default" | "brand" | "warning" | "success";

const toneStyles: Record<
  StatCardTone,
  { surface: string; icon: string; rule: string }
> = {
  default: {
    surface: "border-border bg-card",
    icon: "text-muted-foreground",
    rule: "bg-border",
  },
  brand: {
    surface: "border-brand-panel-accent bg-brand-soft",
    icon: "text-primary",
    rule: "bg-primary",
  },
  warning: {
    surface: "border-warning/25 bg-warning-soft",
    icon: "text-warning",
    rule: "bg-warning",
  },
  success: {
    surface: "border-success/25 bg-success-soft",
    icon: "text-success",
    rule: "bg-success",
  },
};

export function StatCard({
  label,
  amount,
  note,
  icon: Icon,
  accent = false,
  tone,
  format = "money",
}: {
  label: string;
  amount: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
  tone?: StatCardTone;
  format?: "money" | "number";
}) {
  const resolvedTone = tone ?? (accent ? "brand" : "default");
  const styles = toneStyles[resolvedTone];

  return (
    <section
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 print:border-border print:bg-white",
        styles.surface,
      )}
    >
      <span
        className={cn("absolute inset-x-0 top-0 h-1 print:hidden", styles.rule)}
        aria-hidden="true"
      />
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
        <Icon
          className={cn("size-[18px] shrink-0", styles.icon)}
          aria-hidden="true"
        />
      </div>
      <div>
        {format === "money" ? (
          <Money
            value={amount}
            className="text-[19px] font-semibold tracking-tight"
          />
        ) : (
          <span className="text-[19px] font-semibold tabular-nums tracking-tight">
            {amount}
          </span>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{note}</p>
      </div>
    </section>
  );
}
