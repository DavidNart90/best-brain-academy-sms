import { NextResponse } from "next/server";
import defaultSchoolLogo from "@/app/public/logo.png";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function logoRedirect(request: Request, target: string) {
  const response = NextResponse.redirect(new URL(target, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const branding = await supabase
      .from("school_settings")
      .select("logo_path")
      .eq("id", 1)
      .maybeSingle();

    if (!branding.error && branding.data?.logo_path) {
      const { data } = supabase.storage
        .from("school-branding")
        .getPublicUrl(branding.data.logo_path);
      return logoRedirect(request, data.publicUrl);
    }
  } catch {
    // The bundled official logo remains available during backend downtime.
  }

  return logoRedirect(request, defaultSchoolLogo.src);
}
