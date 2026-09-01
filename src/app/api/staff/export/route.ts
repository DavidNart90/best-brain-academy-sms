import { hasApiPermission } from "@/lib/auth/api-access";
import { getStaffExportRows } from "@/features/staff/server/queries";
import { buildStaffExport } from "@/features/staff/server/workbooks";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await hasApiPermission("staff.export")))
    return Response.json(
      { message: "Staff export access is required." },
      { status: 403 },
    );
  try {
    const params = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const workbook = await buildStaffExport(await getStaffExportRows(params));
    return new Response(workbook, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": 'attachment; filename="best-brain-staff.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { message: "The staff export could not be created." },
      { status: 500 },
    );
  }
}
