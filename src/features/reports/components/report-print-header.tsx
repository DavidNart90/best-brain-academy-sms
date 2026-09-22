import Image from "next/image";
import defaultSchoolLogo from "@/app/public/logo.png";
import { cn } from "@/lib/utils";
import type { ReportIdentity } from "../types";

export function ReportPrintHeader({
  identity,
  title,
  periodLabel,
  className,
}: {
  identity: ReportIdentity;
  title: string;
  periodLabel: string;
  className?: string;
}) {
  const contacts = [
    identity.schoolAddress,
    identity.schoolPhone,
    identity.schoolEmail,
  ].filter(Boolean);
  const logoSource = identity.schoolLogoPath
    ? `/api/branding/logo?path=${encodeURIComponent(identity.schoolLogoPath)}`
    : defaultSchoolLogo;

  return (
    <header
      className={cn(
        "hidden items-start justify-between gap-6 border-b-2 border-primary pb-4 print:flex",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={logoSource}
          alt={`${identity.schoolName} crest`}
          width={64}
          height={64}
          className="size-16 shrink-0 object-contain"
          unoptimized
          priority
        />
        <div className="min-w-0">
          <p className="text-lg font-bold">{identity.schoolName}</p>
          {identity.schoolMotto && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {identity.schoolMotto}
            </p>
          )}
          {contacts.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {contacts.join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
      </div>
    </header>
  );
}
