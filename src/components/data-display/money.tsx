import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/money";

export function Money({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatMoney(value)}
    </span>
  );
}
