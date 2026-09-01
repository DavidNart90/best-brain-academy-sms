import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div aria-label="Loading students" aria-busy="true">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b p-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10" />
            ))}
          </div>
        </div>
        <div className="space-y-px">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-none" />
          ))}
        </div>
      </section>
    </div>
  );
}
