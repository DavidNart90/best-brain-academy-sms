import Link from "next/link";
import { ShieldOff, CircleAlert, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageState({
  title,
  description,
  kind = "empty",
  children,
}: {
  title: string;
  description: string;
  kind?: "empty" | "denied" | "error";
  children?: React.ReactNode;
}) {
  const Icon =
    kind === "denied" ? ShieldOff : kind === "error" ? CircleAlert : FolderOpen;
  return (
    <section className="panel flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="mb-1 size-7 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children}
    </section>
  );
}

export function PermissionDenied() {
  return (
    <PageState
      kind="denied"
      title="You don’t have access to this page"
      description="Your account does not have the required permission. Ask your school administrator if you need access."
    >
      <Button asChild variant="outline" className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </PageState>
  );
}
