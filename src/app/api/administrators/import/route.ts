import { revalidatePath } from "next/cache";
import { guardApiRequest } from "@/lib/auth/api-access";
import { administratorImportModeSchema } from "@/features/administrators/schemas";
import { inviteAdministrators } from "@/features/administrators/server/actions";
import { parseAdministratorWorkbook } from "@/features/administrators/server/workbooks";
import {
  hasContentType,
  InvalidRequestBodyError,
  isTrustedMutationRequest,
  readBoundedFormData,
  RequestBodyTooLargeError,
} from "@/lib/security/request";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 256 * 1024;
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  const access = await guardApiRequest("administrators.manage", "data-import");
  if (!access.ok) return access.response;
  if (!hasContentType(request, "multipart/form-data"))
    return Response.json(
      { message: "Send an Excel workbook upload." },
      { status: 415 },
    );
  try {
    const formData = await readBoundedFormData(request, MAX_BODY_BYTES);
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
    if (error instanceof RequestBodyTooLargeError)
      return Response.json(
        { message: "Use an .xlsx workbook no larger than 2 MB." },
        { status: 413 },
      );
    if (error instanceof InvalidRequestBodyError)
      return Response.json(
        { message: "The workbook upload could not be read." },
        { status: 400 },
      );
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
