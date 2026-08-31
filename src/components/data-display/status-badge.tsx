import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles = {
  Paid: "bg-success-soft text-success",
  "Partially Paid": "bg-warning-soft text-warning",
  Unpaid: "bg-muted text-muted-foreground",
};
export type PaymentStatus = keyof typeof styles;
export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
        styles[status],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}
