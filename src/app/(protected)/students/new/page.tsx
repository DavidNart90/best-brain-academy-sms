import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StudentForm } from "@/features/students/components/student-form";
import { getStudentReferenceData } from "@/features/students/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function NewStudentPage() {
  const context = await requirePermission("students.manage");
  if (!context) return <PermissionDenied />;
  const reference = await getStudentReferenceData();
  const configurationReady =
    reference.academicYears.length > 0 &&
    reference.academicTerms.length > 0 &&
    reference.classes.length > 0 &&
    reference.locations.length > 0;

  return (
    <>
      <PageHeader
        title="Add student"
        description="Create the student, primary guardian and first enrollment as one verified record."
      >
        <Button asChild variant="outline">
          <Link href="/students">
            <ArrowLeft /> Back to students
          </Link>
        </Button>
      </PageHeader>
      {configurationReady ? (
        <StudentForm reference={reference} />
      ) : (
        <PageState
          kind="error"
          title="Academic setup is incomplete"
          description="Add an active academic year, term, class and student location before onboarding a student."
        >
          <Button asChild variant="outline" className="mt-2">
            <Link href="/settings/academics">Review academic settings</Link>
          </Button>
        </PageState>
      )}
    </>
  );
}
