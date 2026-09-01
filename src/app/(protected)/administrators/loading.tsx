import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading administrators"
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
      <span className="sr-only">Loading administrators…</span>
    </div>
  );
}
