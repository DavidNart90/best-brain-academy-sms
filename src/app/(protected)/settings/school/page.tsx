import { requirePermission } from "@/lib/auth/access";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  LocationForm,
  SchoolSettingsForm,
} from "@/features/academics/components/configuration-forms";
import { getSchoolLocations } from "@/features/academics/server/queries";
import { SchoolLogoUpload } from "@/features/academics/components/school-logo-upload";

export default async function SchoolSettingsPage() {
  const context = await requirePermission("settings.manage");
  if (!context) return <PermissionDenied />;
  const { settings, locations } = await getSchoolLocations();
  return (
    <>
      <PageHeader
        title="School settings"
        description="Maintain school identity and the transport locations used to charge each student's transport fee by how far they stay from school."
      />
      <section className="panel p-5" aria-labelledby="school-details-title">
        <h2 id="school-details-title" className="text-base font-semibold">
          School details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Blank contact fields remain blank until the school confirms them.
        </p>
        <div className="mt-5">
          <SchoolLogoUpload version={settings.updated_at} />
        </div>
        <div className="pt-6">
          <SchoolSettingsForm settings={settings} />
        </div>
      </section>
      <section className="panel mt-6 p-5" aria-labelledby="locations-title">
        <div>
          <h2 id="locations-title" className="text-base font-semibold">
            Transport locations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A location is not a school campus; it identifies how far a student
            stays from school and sets that student&apos;s transport charge.
            These five approved locations are configuration only. Their
            monetary transport charges will be implemented with fee
            structures in Phase 3.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {locations.map((location) => (
            <details key={location.id} className="configuration-disclosure">
              <summary>
                <span>
                  <strong>{location.name}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {location.code}
                  </span>
                </span>
                <StatusBadge
                  status={location.status === "active" ? "Active" : "Archived"}
                />
              </summary>
              <div className="border-t border-border p-4">
                <LocationForm record={location} />
              </div>
            </details>
          ))}
          <details className="configuration-disclosure">
            <summary>
              <strong>Add location</strong>
              <span className="text-xs text-muted-foreground">
                Use when the school approves another location
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <LocationForm />
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
