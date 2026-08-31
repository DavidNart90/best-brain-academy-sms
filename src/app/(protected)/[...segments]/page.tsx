import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { resolveRoute, permittedRoutes } from "@/lib/permissions/routes";
import { PageHeader } from "@/components/layout/page-header";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { Button } from "@/components/ui/button";

export default async function ModuleShell({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const route = resolveRoute(`/${segments.join("/")}`);
  if (!route) notFound();
  const context = await requirePermission(route.permission);
  if (!context) return <PermissionDenied />;
  const children = permittedRoutes(context).filter((item) =>
    item.href.startsWith(`${route.href}/`),
  );
  return (
    <>
      <PageHeader title={route.title} description={route.description} />
      <PageState
        title="This workspace is not available yet"
        description={`This is a Phase 0 route shell. The ${route.title.toLowerCase()} workflow is planned for Phase ${route.phase}. No records can be created, changed or exported here.`}
      >
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          No live data · No business actions
        </p>
      </PageState>
      {children.length > 0 && (
        <nav
          aria-label={`${route.title} pages`}
          className="mt-6 flex flex-wrap gap-3"
        >
          {children.map((child) => (
            <Button key={child.href} asChild variant="outline">
              <Link href={child.href}>{child.title}</Link>
            </Button>
          ))}
        </nav>
      )}
    </>
  );
}
