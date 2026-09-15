"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const textInputTypes = new Set(["", "search", "text", "email", "tel"]);

export function LiveFilterForm({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();

  function update(form: HTMLFormElement, delay: number) {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const currentSearch = window.location.search.slice(1);
      const params = new URLSearchParams(currentSearch);
      const namedControls = Array.from(form.elements).filter(
        (
          control,
        ): control is
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement,
      );
      for (const control of namedControls) {
        if (control.name) params.delete(control.name);
      }
      for (const [name, rawValue] of new FormData(form)) {
        const value = typeof rawValue === "string" ? rawValue.trim() : "";
        if (value) params.append(name, value);
      }
      params.delete("page");
      params.delete("notice");
      const nextSearch = params.toString();
      const nextHref = nextSearch ? `${pathname}?${nextSearch}` : pathname;
      const currentHref = currentSearch
        ? `${pathname}?${currentSearch}`
        : pathname;
      if (nextHref === currentHref) return;
      startTransition(() => router.replace(nextHref, { scroll: false }));
    }, delay);
  }

  return (
    <form
      method="get"
      role="search"
      aria-label={ariaLabel}
      aria-busy={pending}
      className={cn("relative", className)}
      onChange={(event) => {
        const target = event.target;
        const isText =
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLInputElement &&
            textInputTypes.has(target.type));
        update(event.currentTarget, isText ? 300 : 0);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        update(event.currentTarget, 0);
      }}
    >
      {children}
      <button type="submit" className="sr-only">
        Update results
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Updating results" : ""}
      </span>
    </form>
  );
}
