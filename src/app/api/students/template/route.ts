import { guardApiRequest } from "@/lib/auth/api-access";
import { getStudentReferenceData } from "@/features/students/server/queries";
import { buildStudentTemplate } from "@/features/students/server/workbooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await guardApiRequest("students.import", "data-export");
  if (!access.ok) return access.response;
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
