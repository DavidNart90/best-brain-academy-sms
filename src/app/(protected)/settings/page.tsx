import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  ReceiptText,
  School,
  ShieldCheck,
  UserRoundCog,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { getSettingsSummary } from "@/features/academics/server/queries";
import {
  resolveDashboardVariant,
  type DashboardVariant,
} from "@/features/dashboard/role";
import { requirePermission } from "@/lib/auth/access";

const updatedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type SettingsDestination = {
  href?: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
};

type RoleSettings = {
  title: string;
  description: string;
  accessLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  noteTitle: string;
  note: string;
  destinations: SettingsDestination[];
};

const settingsByRole: Record<DashboardVariant, RoleSettings> = {
  "super-admin": {
    title: "Super Administrator settings",
    description:
      "Manage school-wide configuration, access controls and financial setup.",
    accessLabel: "Full configuration access",
    sectionTitle: "System settings",
    sectionDescription:
      "Each area opens its live, permission-protected configuration workflow.",
    noteTitle: "Developer access",
    note: "This workspace includes every operational setting. Changes remain protected by server authorization and database policies.",
    destinations: [
      {
        href: "/settings/school",
        title: "School settings",
        description:
          "Manage the school identity, official crest, contact details and transport locations.",
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
          "Review the permission matrix and administrator account assignments.",
        detail: "Access matrix and roles",
        icon: ShieldCheck,
      },
      {
        href: "/settings/financials",
        title: "Financial settings",
        description:
          "Configure fees, salaries, payment methods and financial categories.",
        detail: "Fees, charges and categories",
        icon: Wallet,
      },
    ],
  },
  administrator: {
    title: "Administrator settings",
    description:
      "Review the academic context and open the tools used for student onboarding and fee follow-up.",
    accessLabel: "Student administration",
    sectionTitle: "Administration workspace",
    sectionDescription:
      "These destinations match the Administrator's daily responsibilities.",
    noteTitle: "Financial boundary",
    note: "Administrators can view and print outstanding fees, but cannot record or reverse payments.",
    destinations: [
      {
        href: "/admissions",
        title: "Admissions",
        description:
          "Open admission records and continue the approved student onboarding workflow.",
        detail: "Create and review admissions",
        icon: UserPlus,
      },
      {
        href: "/classes",
        title: "Academic context",
        description:
          "Review the active class catalogue used by admissions and enrollment records.",
        detail: "View classes and current context",
        icon: School,
      },
      {
        href: "/students",
        title: "Student records",
        description:
          "Maintain student records, guardian details and enrollment information.",
        detail: "Open the student directory",
        icon: GraduationCap,
      },
      {
        href: "/financials/outstanding",
        title: "Outstanding fees",
        description:
          "Filter balances by student, class and term, then print the current result set.",
        detail: "View and print only",
        icon: CircleAlert,
      },
    ],
  },
  accountant: {
    title: "Accountant settings",
    description:
      "Manage financial configuration and open the reporting and transaction tools used by Accounts.",
    accessLabel: "Finance operations",
    sectionTitle: "Accounts workspace",
    sectionDescription:
      "Financial configuration and high-use finance destinations are grouped here.",
    noteTitle: "Personal records boundary",
    note: "Accountants can view Student and Staff personal records for finance work, but cannot edit them.",
    destinations: [
      {
        href: "/settings/financials",
        title: "Financial settings",
        description:
          "Configure fees, salaries, payment methods and approved financial categories.",
        detail: "Manage finance configuration",
        icon: Wallet,
      },
      {
        href: "/financials/payments",
        title: "Payments",
        description:
          "Record fee payments and review the payment activity available to Accounts.",
        detail: "Open transaction workspace",
        icon: CreditCard,
      },
      {
        href: "/reports",
        title: "Financial reports",
        description:
          "Review reconciled summaries and generate the approved report outputs.",
        detail: "Open reports",
        icon: ChartNoAxesCombined,
      },
      {
        href: "/staff",
        title: "Staff finance reference",
        description:
          "View Staff records required for salary work without changing personal details.",
        detail: "View-only Staff directory",
        icon: BriefcaseBusiness,
      },
    ],
  },
  "board-member": {
    title: "Board Member settings",
    description:
      "Use a read-only oversight workspace for school performance and financial review.",
    accessLabel: "Read-only oversight",
    sectionTitle: "Oversight workspace",
    sectionDescription:
      "Every operational workspace is available for review without write controls.",
    noteTitle: "Oversight boundary",
    note: "Board Members can review Administrator, Accountant and Librarian workspaces. They cannot create, edit, import, record, reverse or configure data, and cannot access Super Administrator pages.",
    destinations: [
      {
        href: "/admissions",
        title: "Students & admissions",
        description:
          "Review admissions, student records, enrollment and outstanding fee follow-up.",
        detail: "Read-only administration",
        icon: GraduationCap,
      },
      {
        href: "/staff",
        title: "Staff & classes",
        description:
          "Review teaching and non-teaching Staff records alongside the class catalogue.",
        detail: "Read-only school operations",
        icon: BriefcaseBusiness,
      },
      {
        href: "/financials",
        title: "Finance & reports",
        description:
          "Review revenue, expenses, invoices, payments, salaries and reconciled reports.",
        detail: "Read-only financial oversight",
        icon: ReceiptText,
      },
      {
        href: "/library",
        title: "Library",
        description:
          "Review Books & Prospectus charges, collection performance and balances.",
        detail: "Read-only Library oversight",
        icon: LibraryBig,
      },
    ],
  },
  librarian: {
    title: "Librarian settings",
    description:
      "Review the current academic context and open the Books & Prospectus workspace.",
    accessLabel: "Library operations",
    sectionTitle: "Library workspace",
    sectionDescription:
      "Library responsibilities and system boundaries are kept together here.",
    noteTitle: "Configuration boundary",
    note: "The Librarian can generate Library charges and record or reverse collections. Books & Prospectus rates remain controlled by the Super Administrator.",
    destinations: [
      {
        href: "/library",
        title: "Books & Prospectus",
        description:
          "Review charge coverage, generate term charges and manage Library collections.",
        detail: "Open Library operations",
        icon: LibraryBig,
      },
      {
        title: "Role access",
        description:
          "Your navigation is limited to the Dashboard, Library and this Settings page.",
        detail: "Library-only access boundary",
        icon: BookOpenCheck,
      },
    ],
  },
  workspace: {
    title: "Workspace settings",
    description:
      "Review your active school context and the destinations available to this account.",
    accessLabel: "Assigned workspace",
    sectionTitle: "Available workspace",
    sectionDescription:
      "Access is based on the permissions assigned to this account.",
    noteTitle: "Access support",
    note: "Contact a Super Administrator if this account is missing a required responsibility.",
    destinations: [
      {
        href: "/dashboard",
        title: "Dashboard",
        description:
          "Return to the overview selected for this account's active permissions.",
        detail: "Open dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Role access",
        description:
          "Only routes granted to this active account appear in the application navigation.",
        detail: "Permission-controlled access",
        icon: ShieldCheck,
      },
    ],
  },
};

function SettingsDestinationCard({ item }: { item: SettingsDestination }) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 items-center justify-center rounded-md bg-brand-subtle text-primary">
          <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
        </span>
        {item.href ? (
          <ArrowUpRight
            size={19}
            className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <h3 className="mt-6 text-lg font-semibold tracking-[-0.015em]">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
        {item.description}
      </p>
      <p className="mt-5 border-t border-border pt-4 text-xs font-medium text-primary">
        {item.detail}
      </p>
    </>
  );
  const className =
    "panel flex min-h-52 flex-col p-5 outline-none transition-[transform,border-color,box-shadow] duration-200";

  return item.href ? (
    <Link
      href={item.href}
      className={`${className} group hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_rgba(47,34,32,0.08)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 motion-reduce:transform-none`}
    >
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export default async function SettingsPage() {
  const context = await requirePermission("dashboard.read");
  if (!context) return <PermissionDenied />;

  const [summary, roleSettings] = await Promise.all([
    getSettingsSummary(),
    Promise.resolve(settingsByRole[resolveDashboardVariant(context.roles)]),
  ]);

  return (
    <>
      <PageHeader
        title={roleSettings.title}
        description={roleSettings.description}
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
                    "School identity and academic configuration are ready."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-success">
                <CheckCircle2 size={16} aria-hidden="true" />
                {roleSettings.accessLabel}
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

      <section className="mt-7" aria-labelledby="role-settings-title">
        <div>
          <h2 id="role-settings-title" className="text-base font-semibold">
            {roleSettings.sectionTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {roleSettings.sectionDescription}
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SettingsDestinationCard
            item={{
              href: "/settings/profile",
              title: "Profile & password",
              description:
                "Update your display name and contact number, or securely change your password.",
              detail: "Personal account settings",
              icon: UserRoundCog,
            }}
          />
          {roleSettings.destinations.map((item) => (
            <SettingsDestinationCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <aside className="mt-6 border-l-2 border-primary/55 bg-brand-subtle/55 px-4 py-3">
        <p className="text-sm font-medium">{roleSettings.noteTitle}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {roleSettings.note}
        </p>
      </aside>
    </>
  );
}
