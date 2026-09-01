import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { getAccessContext } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Set a new password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.status !== "active" || context.roles.length === 0)
    redirect("/login?notice=access");
  if (!context.mustChangePassword) redirect("/dashboard");

  return (
    <AuthShell>
      <div className="mb-7">
        <span className="mb-5 flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-primary">
          <KeyRound size={19} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          First sign-in
        </p>
        <h1 className="text-2xl font-bold tracking-[-0.025em]">
          Make this account yours
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Replace the temporary password before opening the school workspace.
          Other sessions will be signed out automatically.
        </p>
      </div>
      <ChangePasswordForm />
    </AuthShell>
  );
}
