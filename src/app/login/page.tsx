import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getPublicEnvironment } from "@/lib/env";

export const metadata: Metadata = { title: "Staff sign-in" };
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const configured = !!getPublicEnvironment();
  const { notice } = await searchParams;
  return (
    <AuthShell>
      <div className="mb-8">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
          Secure staff access
        </p>
        <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.035em]">
          Welcome back
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Sign in with the email and password issued for your staff account.
        </p>
      </div>
      {!configured && (
        <p
          role="status"
          className="mb-5 rounded-md border border-border bg-muted p-3 text-sm leading-6"
        >
          Sign-in is awaiting school environment setup. No accounts can sign in
          yet.
        </p>
      )}
      {notice === "access" && (
        <p
          role="alert"
          className="mb-5 rounded-md bg-danger-soft p-3 text-sm text-destructive"
        >
          Your account is pending or disabled. Contact your school
          administrator.
        </p>
      )}
      <LoginForm configured={configured} />
      <p className="mt-8 border-t border-border pt-5 text-center text-xs leading-5 text-muted-foreground">
        New accounts receive a temporary password and must replace it after the
        first sign-in.
      </p>
    </AuthShell>
  );
}
