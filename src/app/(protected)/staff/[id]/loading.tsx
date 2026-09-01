import { Skeleton } from "@/components/ui/skeleton";
export default function StaffProfileLoading() {
  return (
    <div className="space-y-5" aria-label="Loading staff profile">
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
