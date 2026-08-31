import { getAccessContext } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  let context;
  try {
    context = await getAccessContext();
  } catch {
    return Response.json(
      { error: "ACCESS_SERVICE_UNAVAILABLE" },
      { status: 503, headers },
    );
  }
  if (!context)
    return Response.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
  if (!hasPermission(context, "dashboard.read"))
    return Response.json({ error: "ACCESS_DENIED" }, { status: 403, headers });
  return Response.json(
    { displayName: context.displayName, roles: context.roles },
    { headers },
  );
}
