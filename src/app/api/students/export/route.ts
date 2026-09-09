import { guardApiRequest } from "@/lib/auth/api-access";
import { getStudentExportRows } from "@/features/students/server/queries";
import { buildStudentExport } from "@/features/students/server/workbooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await guardApiRequest("students.export", "data-export");
  if (!access.ok) return access.response;
  try {
    const params = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const workbook = await buildStudentExport(
      await getStudentExportRows(params),
    );
    return new Response(workbook, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'attachment; filename="best-brain-students.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { message: "The student export could not be created." },
      { status: 500 },
    );
  }
}
