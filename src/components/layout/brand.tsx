import { BookOpen } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-h-16 items-center gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <BookOpen size={21} strokeWidth={1.6} />
      </span>
      <span className={compact ? "sr-only" : "text-[13px] leading-5"}>
        <strong className="block font-semibold">Best Brain Academy</strong>
        <span className="text-xs text-muted-foreground">School Management</span>
      </span>
    </div>
  );
}
