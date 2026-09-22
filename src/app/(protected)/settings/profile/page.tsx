import type { Metadata } from "next";
import {
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { ProfileSettingsForm } from "@/features/profile/components/profile-settings-form";
import { getOwnProfile } from "@/features/profile/server/queries";
import { requireActiveAccount } from "@/lib/auth/access";
import { roleLabels } from "@/lib/permissions/contracts";

export const metadata: Metadata = { title: "Profile settings" };

const passwordDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, profile, query] = await Promise.all([
    requireActiveAccount(),
    getOwnProfile(),
    searchParams,
  ]);
  const roles = context.roles.map((role) => roleLabels[role]);
  const initials = profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const passwordUpdated = firstQueryValue(query.notice) === "password-updated";

  return (
    <>
      <PageHeader
        title="Profile settings"
        description="Keep your account details current and protect your sign-in password."
      />

      {passwordUpdated ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Password updated. Other signed-in sessions have been signed out.
          </p>
        </div>
      ) : null}

      <section
        className="panel overflow-hidden"
        aria-labelledby="profile-title"
      >
        <div className="grid lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
          <div className="border-b border-border bg-canvas p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <span className="flex size-16 items-center justify-center rounded-full border border-primary/15 bg-brand-subtle text-lg font-semibold text-primary">
              {initials || "ST"}
            </span>
            <h2
              id="profile-title"
              className="mt-5 text-xl font-semibold tracking-[-0.02em]"
            >
              {profile.displayName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {roles.join(" · ") || "Staff account"}
            </p>

            <dl className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="mt-0.5 break-all font-medium">
                    {profile.email}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="mt-0.5 font-medium">
                    {profile.phone || "Not added"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 size-4 text-success"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Account status
                  </dt>
                  <dd className="mt-0.5 font-medium text-success">Active</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-primary">
                <UserRound size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Personal details</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Update the name shown across the school workspace and your
                  contact number.
                </p>
              </div>
            </div>
            <ProfileSettingsForm profile={profile} />
          </div>
        </div>
      </section>

      <section
        className="panel mt-6 overflow-hidden"
        aria-labelledby="password-settings-title"
      >
        <div className="grid lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
          <div className="border-b border-border bg-canvas p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <span className="flex size-10 items-center justify-center rounded-md bg-brand-subtle text-primary">
              <KeyRound size={19} aria-hidden="true" />
            </span>
            <h2
              id="password-settings-title"
              className="mt-5 text-base font-semibold"
            >
              Password security
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter your current password before choosing a new one. Other
              sessions will be signed out after the change.
            </p>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              {profile.passwordChangedAt
                ? `Last changed ${passwordDateFormatter.format(new Date(profile.passwordChangedAt))}`
                : "No completed password change is recorded."}
            </p>
          </div>

          <div className="p-5 sm:p-6">
            <ChangePasswordForm mode="settings" />
          </div>
        </div>
      </section>
    </>
  );
}
