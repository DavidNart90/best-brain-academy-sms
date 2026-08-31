import { requireActiveAccount } from "@/lib/auth/access";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireActiveAccount();
  return <AppShell context={context}>{children}</AppShell>;
}
