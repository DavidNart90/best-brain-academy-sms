import type { LucideIcon } from "lucide-react";
import { Money } from "./money";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  amount,
  note,
  icon: Icon,
  accent = false,
  format = "money",
}: {
  label: string;
  amount: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
  format?: "money" | "number";
}) {
  return (
    <section
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border p-5",
        accent ? "bg-brand-subtle" : "bg-card",
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{label}</h2>
        <Icon
          className="size-[18px] shrink-0 text-muted-foreground"
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
