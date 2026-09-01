import { hasApiPermission } from "@/lib/auth/api-access";
import { getStaffReferenceData } from "@/features/staff/server/queries";
import { buildStaffTemplate } from "@/features/staff/server/workbooks";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await hasApiPermission("staff.import")))
    return Response.json(
      { message: "Staff import access is required." },
      { status: 403 },
    );
  try {
    const workbook = await buildStaffTemplate(await getStaffReferenceData());
    return new Response(workbook, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          'attachment; filename="best-brain-staff-import-template.xlsx"',
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
