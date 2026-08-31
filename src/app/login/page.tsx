import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/layout/brand";
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
    <main className="flex min-h-dvh items-center justify-center p-5 sm:p-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[0.95fr_1fr]">
        <section className="flex flex-col justify-between gap-10 bg-brand-subtle p-8 md:min-h-[540px] md:p-10">
          <Brand />
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Service with diligence
            </p>
            <h2 className="max-w-xs text-2xl font-semibold leading-9 tracking-tight">
              School administration,
              <br />
              carefully managed.
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              One place for the records that keep Best Brain Academy running.
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={16} />
            Authorized school staff only
          </p>
        </section>
        <section className="flex flex-col justify-center p-8 md:p-12">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mb-8 mt-2 text-sm text-muted-foreground">
            Sign in to your staff account.
          </p>
          {!configured && (
            <p
              role="status"
              className="mb-5 rounded-md border border-border bg-muted p-3 text-sm leading-6"
            >
              Sign-in is awaiting school environment setup. No accounts can sign
              in yet.
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
        </section>
      </div>
    </main>
  );
}
