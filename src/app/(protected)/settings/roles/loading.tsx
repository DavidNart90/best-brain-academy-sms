import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading roles and permissions"
      className="space-y-6"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-[38rem] w-full" />
      <span className="sr-only">Loading roles and permissions…</span>
    </div>
  );
}
