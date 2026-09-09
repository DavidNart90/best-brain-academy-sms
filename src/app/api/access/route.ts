import { guardApiRequest } from "@/lib/auth/api-access";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const access = await guardApiRequest("dashboard.read");
  if (!access.ok) return access.response;
  return Response.json(
    {
      displayName: access.context.displayName,
      roles: access.context.roles,
    },
    { headers },
  );
}
