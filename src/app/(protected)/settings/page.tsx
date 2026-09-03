import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { getSettingsSummary } from "@/features/academics/server/queries";
import { requirePermission } from "@/lib/auth/access";

const updatedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const settingsDestinations = [
  {
    href: "/settings/school",
    title: "School settings",
    description:
      "Manage the school identity, official crest, contact details and the transport locations used to charge students by how far they stay.",
    detail: "Identity and transport locations",
    icon: Building2,
  },
  {
    href: "/settings/academics",
    title: "Academic settings",
    description:
      "Maintain academic years, term schedules, current context and the class catalogue.",
    detail: "Calendar and classes",
    icon: CalendarRange,
  },
  {
    href: "/settings/roles",
    title: "Roles & permissions",
    description:
      "Review the live permission matrix and open administrator accounts when a role assignment must change.",
    detail: "Access matrix and roles",
    icon: ShieldCheck,
  },
] as const;

export default async function SettingsPage() {
  const context = await requirePermission("settings.manage");
  if (!context) return <PermissionDenied />;
  const summary = await getSettingsSummary();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Review the current school configuration and open the area you need to maintain."
      />

      <section
        className="panel overflow-hidden"
        aria-labelledby="configuration-summary-title"
      >
        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2
                  id="configuration-summary-title"
                  className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
                >
                  {summary.schoolName}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {summary.motto ||
                    "School identity and academic configuration are ready to maintain."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-success">
                <CheckCircle2 size={16} aria-hidden="true" />
                Phase 1 configured
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Academic year</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {summary.currentYear}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Current term</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {summary.currentTerm}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Active classes
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {summary.activeClasses}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Transport locations
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {summary.activeLocations}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center gap-5 border-t border-border bg-canvas p-5 lg:border-l lg:border-t-0 lg:p-6">
            <Image
              src={`/api/branding/logo?v=${encodeURIComponent(summary.updatedAt)}`}
              alt="Best Brain Academy crest"
              width={1254}
              height={1254}
              className="size-24 shrink-0 object-contain drop-shadow-[0_8px_14px_rgba(78,35,32,0.14)]"
              sizes="96px"
              unoptimized
              priority
            />
            <div>
              <p className="text-sm font-semibold">
                {summary.shortName || summary.schoolName}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Last configuration update
              </p>
              <p className="mt-0.5 text-xs font-medium">
                {updatedAtFormatter.format(new Date(summary.updatedAt))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="manage-settings-title">
        <div>
          <h2 id="manage-settings-title" className="text-base font-semibold">
            Manage settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each area opens its live, permission-protected configuration
            workflow.
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {settingsDestinations.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group panel flex min-h-56 flex-col p-5 outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_rgba(47,34,32,0.08)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 motion-reduce:transform-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-md bg-brand-subtle text-primary">
                    <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <ArrowUpRight
                    size={19}
                    className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-7 text-lg font-semibold tracking-[-0.015em]">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-5 border-t border-border pt-4 text-xs font-medium text-primary">
                  {item.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="mt-6 border-l-2 border-primary/55 bg-brand-subtle/55 px-4 py-3">
        <p className="text-sm font-medium">Finance configuration comes next</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Fee categories, document numbering and payment settings remain locked
          until the Phase 3 finance foundation is implemented and verified.
        </p>
      </aside>
    </>
  );
}
