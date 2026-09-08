import Image from "next/image";

export function DocumentHeader({
  title,
  reference,
  children,
}: {
  title: string;
  reference: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5 border-b pb-5">
      <div className="flex items-center gap-3">
        <Image
          src="/api/branding/logo"
          alt="Best Brain Academy crest"
          width={64}
          height={64}
          className="size-16 shrink-0 object-contain"
          unoptimized
          priority
        />
        <div>
          <h2 className="text-lg font-semibold">Best Brain Academy</h2>
          <p className="text-sm font-medium text-primary">{title}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="break-all font-mono text-sm font-semibold">{reference}</p>
        {children}
      </div>
    </div>
  );
}
