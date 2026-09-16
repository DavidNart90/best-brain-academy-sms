import { z } from "zod";
import { searchApplication } from "@/features/search/server/search";
import { guardApiRequest } from "@/lib/auth/api-access";

const querySchema = z.string().trim().min(2).max(80);
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const access = await guardApiRequest("dashboard.read");
  if (!access.ok) return access.response;
  const parsed = querySchema.safeParse(
    new URL(request.url).searchParams.get("q"),
  );
  if (!parsed.success)
    return Response.json({ results: [] }, { status: 400, headers });
  try {
    const results = await searchApplication(access.context, parsed.data);
    return Response.json({ results }, { headers });
  } catch {
    return Response.json(
      { message: "Search is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
