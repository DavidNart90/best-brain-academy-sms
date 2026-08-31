import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading workspace…</span>
    </div>
  );
}
