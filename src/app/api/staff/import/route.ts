import { revalidatePath } from "next/cache";
import { guardApiRequest } from "@/lib/auth/api-access";
import { importModeSchema } from "@/features/staff/schemas";
import { getStaffReferenceData } from "@/features/staff/server/queries";
import {
  importStaffRows,
  parseStaffWorkbook,
} from "@/features/staff/server/workbooks";
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
function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  return [
    /^Missing columns: .+\.$/,
    /^Import up to 250 staff at a time\.$/,
    /^The Staff sheet does not contain any records\.$/,
    /^The workbook does not contain a worksheet\.$/,
    /^The workbook does not contain a Staff worksheet\.$/,
    /^Each assignment must refer to a populated Staff row\.$/,
    /^Import up to 1000 assignment rows at a time\.$/,
    /^Use plain values, not formulas, in staff workbooks\.$/,
    /^This workbook format could not be read\. Copy the values into the downloaded staff template and try again\. No records were saved\.$/,
  ].some((pattern) => pattern.test(error.message))
    ? error.message
    : null;
}
export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  const access = await guardApiRequest("staff.import", "data-import");
  if (!access.ok) return access.response;
  if (!hasContentType(request, "multipart/form-data"))
    return Response.json(
      { message: "Send an Excel workbook upload." },
      { status: 415 },
    );
  try {
    const formData = await readBoundedFormData(request, MAX_BODY_BYTES);
    const mode = importModeSchema.parse(formData.get("mode"));
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
    const parsed = await parseStaffWorkbook(
      file,
      await getStaffReferenceData(),
      mode === "preview",
    );
    if (mode === "preview") return Response.json(parsed.preview);
    if (!parsed.preview.canConfirm)
      return Response.json(parsed.preview, { status: 422 });
    const createdCount = await importStaffRows(
      parsed.validRows,
      parsed.requestKey,
    );
    revalidatePath("/staff");
    return Response.json({
      ok: true,
      createdCount,
      message: `${createdCount} ${createdCount === 1 ? "staff member" : "staff members"} imported successfully.`,
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
    return Response.json(
      {
        message:
          safeMessage(error) ??
          "The workbook could not be imported. Preview it again and resolve validation or duplicate errors.",
      },
      { status: 400 },
    );
  }
}
