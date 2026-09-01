import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-h-16 items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center">
        <Image
          src="/api/branding/logo"
          alt=""
          width={1254}
          height={1254}
          className="size-11 object-contain drop-shadow-[0_4px_8px_rgba(78,35,32,0.12)]"
          sizes="44px"
          unoptimized
          priority
        />
      </span>
      <span className={compact ? "sr-only" : "text-[13px] leading-5"}>
        <strong className="block font-semibold">Best Brain Academy</strong>
        <span className="text-xs text-muted-foreground">School Management</span>
      </span>
    </div>
  );
}
