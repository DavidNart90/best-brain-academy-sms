import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading class details" className="space-y-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-52 w-full" />
      <span className="sr-only">Loading class details…</span>
    </div>
  );
}
