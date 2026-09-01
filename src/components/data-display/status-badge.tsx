import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles = {
  Paid: "bg-success-soft text-success",
  "Partially Paid": "bg-warning-soft text-warning",
  Unpaid: "bg-muted text-muted-foreground",
  Active: "bg-success-soft text-success",
  Inactive: "bg-muted text-muted-foreground",
  Graduated: "bg-brand-subtle text-primary",
  Completed: "bg-brand-subtle text-primary",
  Transferred: "bg-warning-soft text-warning",
  Withdrawn: "bg-danger-soft text-destructive",
  Current: "bg-brand-subtle text-primary",
  Scheduled: "bg-brand-subtle text-primary",
  Unscheduled: "bg-warning-soft text-warning",
  Archived: "bg-muted text-muted-foreground",
  Pending: "bg-warning-soft text-warning",
  Disabled: "bg-danger-soft text-destructive",
  Enrolled: "bg-success-soft text-success",
  Required: "bg-warning-soft text-warning",
};
export type StatusLabel = keyof typeof styles;
export type PaymentStatus = Extract<
  StatusLabel,
  "Paid" | "Partially Paid" | "Unpaid"
>;
export function StatusBadge({ status }: { status: StatusLabel }) {
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
