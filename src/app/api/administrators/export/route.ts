import { guardApiRequest } from "@/lib/auth/api-access";
import { getAdministratorExportRows } from "@/features/administrators/server/queries";
import { buildAdministratorExport } from "@/features/administrators/server/workbooks";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const access = await guardApiRequest("administrators.manage", "data-export");
  if (!access.ok) return access.response;
  try {
    const params = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    return new Response(
      await buildAdministratorExport(await getAdministratorExportRows(params)),
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition":
            'attachment; filename="best-brain-administrators.xlsx"',
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return Response.json(
      { message: "The administrator export could not be created." },
      { status: 500 },
    );
  }
}
