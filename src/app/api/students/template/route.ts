import { hasApiPermission } from "@/lib/auth/api-access";
import { getStudentReferenceData } from "@/features/students/server/queries";
import { buildStudentTemplate } from "@/features/students/server/workbooks";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasApiPermission("students.import")))
    return Response.json(
      { message: "Student import access is required." },
      { status: 403 },
    );
  try {
    const workbook = await buildStudentTemplate(
      await getStudentReferenceData(),
    );
    return new Response(workbook, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'attachment; filename="best-brain-student-import-template.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { message: "The template could not be created." },
      { status: 500 },
    );
  }
}
