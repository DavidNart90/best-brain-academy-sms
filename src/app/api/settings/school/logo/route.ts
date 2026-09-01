import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isValidSchoolLogo } from "@/features/academics/logo";
import { hasApiPermission } from "@/lib/auth/api-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uploadGuidance =
  "Use a valid PNG between 128 and 4,096 pixels, no larger than 2 MB.";

export async function POST(request: Request) {
  if (!(await hasApiPermission("settings.manage")))
    return Response.json(
      { message: "School settings access is required." },
      { status: 403 },
    );

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("logo");
  } catch {
    return Response.json({ message: uploadGuidance }, { status: 400 });
  }
  if (!(file instanceof File))
    return Response.json({ message: uploadGuidance }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isValidSchoolLogo(file.type, file.size, bytes))
    return Response.json({ message: uploadGuidance }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const current = await supabase
    .from("school_settings")
    .select("logo_path")
    .eq("id", 1)
    .single();
  if (current.error)
    return Response.json(
      { message: "The current school logo could not be read." },
      { status: 400 },
    );

  const path = `school/${randomUUID()}.png`;
  const uploaded = await supabase.storage
    .from("school-branding")
    .upload(path, bytes, {
      cacheControl: "31536000",
      contentType: "image/png",
      upsert: false,
    });
  if (uploaded.error)
    return Response.json(
      { message: "The school logo could not be uploaded." },
      { status: 400 },
    );

  const saved = await supabase
    .from("school_settings")
    .update({ logo_path: path })
    .eq("id", 1)
    .select("logo_path")
    .single();
  if (saved.error) {
    await supabase.storage.from("school-branding").remove([path]);
    return Response.json(
      { message: "The school logo could not be saved." },
      { status: 400 },
    );
  }

  const previous = current.data.logo_path;
  if (previous && previous !== path)
    await supabase.storage.from("school-branding").remove([previous]);

  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/settings/school");
  return Response.json({
    ok: true,
    message: "School logo updated.",
    version: Date.now(),
  });
}
