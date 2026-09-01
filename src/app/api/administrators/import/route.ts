import { revalidatePath } from "next/cache";
import { hasApiPermission } from "@/lib/auth/api-access";
import { administratorImportModeSchema } from "@/features/administrators/schemas";
import { inviteAdministrators } from "@/features/administrators/server/actions";
import { parseAdministratorWorkbook } from "@/features/administrators/server/workbooks";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  if (!(await hasApiPermission("administrators.manage")))
    return Response.json(
      { message: "Administrator management access is required." },
      { status: 403 },
    );
  try {
    const formData = await request.formData();
    const mode = administratorImportModeSchema.parse(formData.get("mode"));
    const file = formData.get("file");
    if (!(file instanceof File))
      return Response.json(
        { message: "Choose an Excel workbook." },
        { status: 400 },
      );
    if (
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > MAX_FILE_BYTES
    )
      return Response.json(
        { message: "Use an .xlsx workbook no larger than 2 MB." },
        { status: 400 },
      );
    if (
      mode === "confirm" &&
      request.headers.get("x-import-confirmation") !== "confirmed"
    )
      return Response.json(
        { message: "Explicit confirmation is required." },
        { status: 400 },
      );
    const parsed = await parseAdministratorWorkbook(file);
    if (mode === "preview") return Response.json(parsed.preview);
    if (!parsed.preview.canConfirm)
      return Response.json(parsed.preview, { status: 422 });
    const result = await inviteAdministrators(parsed.validRows);
    if (!result.ok)
      return Response.json(
        { ...parsed.preview, message: result.message },
        { status: 400 },
      );
    revalidatePath("/administrators");
    return Response.json({
      ok: true,
      createdCount: result.createdCount,
      message: result.message,
    });
  } catch (error) {
    const message =
      error instanceof Error &&
      /^(Missing columns:|Import up to 100|The Administrators sheet|The workbook)/.test(
        error.message,
      )
        ? error.message
        : "The workbook could not be processed. Resolve its validation or duplicate errors and preview it again.";
    return Response.json({ message }, { status: 400 });
  }
}
