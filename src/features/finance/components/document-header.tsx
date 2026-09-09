import Image from "next/image";
import defaultSchoolLogo from "@/app/public/logo.png";

export type DocumentIdentity = {
  schoolName: string;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolMotto?: string | null;
  schoolLogoPath?: string | null;
};

export function DocumentHeader({
  title,
  reference,
  identity = { schoolName: "Best Brain Academy" },
  children,
}: {
  title: string;
  reference: string;
  identity?: DocumentIdentity;
  children?: React.ReactNode;
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
    <div className="flex flex-wrap items-start justify-between gap-5 border-b pb-5">
      <div className="flex items-center gap-3">
        <Image
          src={logoSource}
          alt={`${identity.schoolName} crest`}
          width={64}
          height={64}
          className="size-16 shrink-0 object-contain"
          unoptimized
          priority
        />
        <div>
          <h2 className="text-lg font-semibold">{identity.schoolName}</h2>
          <p className="text-sm font-medium text-primary">{title}</p>
          {contacts.length > 0 && (
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {contacts.join(" · ")}
            </p>
          )}
          {identity.schoolMotto && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {identity.schoolMotto}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="break-all font-mono text-sm font-semibold">{reference}</p>
        {children}
      </div>
    </div>
  );
}
