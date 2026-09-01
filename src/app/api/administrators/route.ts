import { hasApiPermission } from "@/lib/auth/api-access";
import { inviteAdministrators } from "@/features/administrators/server/actions";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 64 * 1024;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  if (!(await hasApiPermission("administrators.manage")))
    return Response.json(
      { message: "Administrator management access is required." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json(
      { message: "Send JSON account details." },
      { status: 415 },
    );
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES)
    return Response.json(
      { message: "The request is too large." },
      { status: 413 },
    );

  const payload = (await request.json().catch(() => null)) as {
    administrators?: unknown;
  } | null;
  const result = await inviteAdministrators(payload?.administrators);
  return Response.json(result, { status: result.ok ? 201 : 400 });
}
