import { hasApiPermission } from "@/lib/auth/api-access";
import { buildAdministratorTemplate } from "@/features/administrators/server/workbooks";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await hasApiPermission("administrators.manage")))
    return Response.json(
      { message: "Administrator management access is required." },
      { status: 403 },
    );
  const workbook = await buildAdministratorTemplate();
  return new Response(workbook, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition":
        'attachment; filename="best-brain-administrator-import-template.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
