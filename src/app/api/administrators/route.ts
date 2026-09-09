import { guardApiRequest } from "@/lib/auth/api-access";
import { inviteAdministrators } from "@/features/administrators/server/actions";
import {
  hasContentType,
  InvalidRequestBodyError,
  isTrustedMutationRequest,
  readBoundedJson,
  RequestBodyTooLargeError,
} from "@/lib/security/request";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  const access = await guardApiRequest("administrators.manage");
  if (!access.ok) return access.response;
  if (!hasContentType(request, "application/json"))
    return Response.json(
      { message: "Send JSON account details." },
      { status: 415 },
    );
  let payload: { administrators?: unknown } | null;
  try {
    payload = (await readBoundedJson(request, MAX_BODY_BYTES)) as {
      administrators?: unknown;
    } | null;
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof RequestBodyTooLargeError
            ? "The request is too large."
            : error instanceof InvalidRequestBodyError
              ? "Send valid JSON account details."
              : "Send valid JSON account details.",
      },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }
  const result = await inviteAdministrators(payload?.administrators);
  return Response.json(result, { status: result.ok ? 201 : 400 });
}
