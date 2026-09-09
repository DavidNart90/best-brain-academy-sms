import { guardApiRequest } from "@/lib/auth/api-access";
import { hasPermission } from "@/lib/permissions/contracts";
import { getReportExport } from "@/features/reports/server/queries";
import {
  buildReportCsv,
  buildReportWorkbook,
} from "@/features/reports/server/exports";

export const dynamic = "force-dynamic";

function fileName(view: string, extension: "csv" | "xlsx") {
  return `best-brain-${view.replace(/[^a-z0-9-]/g, "")}.${extension}`;
}

export async function GET(request: Request) {
  const access = await guardApiRequest("reports.read", "report-export");
  if (!access.ok) return access.response;
  const available = {
    financials: hasPermission(access.context, "financials.read"),
    students: hasPermission(access.context, "students.read"),
    admissions: hasPermission(access.context, "admissions.read"),
    staff: hasPermission(access.context, "staff.read"),
    classes: hasPermission(access.context, "classes.read"),
  };
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const params = Object.fromEntries(url.searchParams.entries());
    const { filters, table } = await getReportExport(params, available);
    const body =
      format === "csv"
        ? buildReportCsv(table, filters)
        : await buildReportWorkbook(table, filters);
    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${fileName(filters.view, format)}"`,
        "Content-Type":
          format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The report could not be exported.";
    return Response.json({ message }, { status: 400 });
  }
}
