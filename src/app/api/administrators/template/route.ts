import { guardApiRequest } from "@/lib/auth/api-access";
import { buildAdministratorTemplate } from "@/features/administrators/server/workbooks";

export const dynamic = "force-dynamic";
export async function GET() {
  const access = await guardApiRequest("administrators.manage", "data-export");
  if (!access.ok) return access.response;
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
