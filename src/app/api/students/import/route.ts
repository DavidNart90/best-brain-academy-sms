import { revalidatePath } from "next/cache";
import { guardApiRequest } from "@/lib/auth/api-access";
import { importModeSchema } from "@/features/students/schemas";
import { getStudentReferenceData } from "@/features/students/server/queries";
import {
  importStudentRows,
  parseStudentWorkbook,
} from "@/features/students/server/workbooks";
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

function safeImportMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  const allowedMessages = [
    /^Missing columns: .+\.$/,
    /^Import up to 250 students at a time\.$/,
    /^The Students sheet does not contain any records\.$/,
    /^The workbook does not contain a worksheet\.$/,
  ];
  return allowedMessages.some((pattern) => pattern.test(error.message))
    ? error.message
    : null;
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  const access = await guardApiRequest("students.import", "data-import");
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
    const parsed = await parseStudentWorkbook(
      file,
      await getStudentReferenceData(),
    );
    if (mode === "preview") return Response.json(parsed.preview);
    if (!parsed.preview.canConfirm)
      return Response.json(parsed.preview, { status: 422 });
    const createdCount = await importStudentRows(parsed.validRows);
    revalidatePath("/students");
    return Response.json({
      ok: true,
      createdCount,
      message: `${createdCount} ${createdCount === 1 ? "student" : "students"} imported successfully.`,
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
      safeImportMessage(error) ??
      "The workbook could not be imported. Preview it again and resolve any duplicate or validation errors.";
    return Response.json({ message }, { status: 400 });
  }
}
