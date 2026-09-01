import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hasApiPermission } from "@/lib/auth/api-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { studentIdSchema } from "@/features/students/schemas";
import { studentPhotoExtension } from "@/features/students/photo";

export const dynamic = "force-dynamic";

async function parsedId(params: Promise<{ id: string }>) {
  return studentIdSchema.safeParse((await params).id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasApiPermission("students.read")))
    return Response.json(
      { message: "Student access is required." },
      { status: 403 },
    );
  const id = await parsedId(params);
  if (!id.success)
    return Response.json({ message: "Student not found." }, { status: 404 });
  const supabase = await createServerSupabaseClient();
  const student = await supabase
    .from("students")
    .select("photo_path")
    .eq("id", id.data)
    .maybeSingle();
  if (student.error || !student.data?.photo_path)
    return Response.json(
      { message: "Student photo not found." },
      { status: 404 },
    );
  const photo = await supabase.storage
    .from("student-photos")
    .download(student.data.photo_path);
  if (photo.error)
    return Response.json(
      { message: "Student photo not found." },
      { status: 404 },
    );
  return new Response(photo.data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": photo.data.type || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasApiPermission("students.manage")))
    return Response.json(
      { message: "Student management access is required." },
      { status: 403 },
    );
  const id = await parsedId(params);
  if (!id.success)
    return Response.json({ message: "Student not found." }, { status: 404 });
  const file = (await request.formData()).get("photo");
  if (!(file instanceof File))
    return Response.json(
      { message: "Use a JPG, PNG or WebP image no larger than 5 MB." },
      { status: 400 },
    );
  const supabase = await createServerSupabaseClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = studentPhotoExtension(file.type, file.size, bytes);
  if (!extension)
    return Response.json(
      { message: "Use a valid JPG, PNG or WebP image no larger than 5 MB." },
      { status: 400 },
    );
  const path = `${id.data}/${randomUUID()}.${extension}`;
  const uploaded = await supabase.storage
    .from("student-photos")
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploaded.error)
    return Response.json(
      { message: "The photo could not be uploaded." },
      { status: 400 },
    );
  const saved = await supabase.rpc("set_student_photo", {
    target_student_id: id.data,
    target_photo_path: path,
  });
  if (saved.error) {
    await supabase.storage.from("student-photos").remove([path]);
    return Response.json(
      { message: "The photo could not be attached to this student." },
      { status: 400 },
    );
  }
  const previous = (saved.data as { previousPhotoPath?: unknown } | null)
    ?.previousPhotoPath;
  if (typeof previous === "string" && previous !== path)
    await supabase.storage.from("student-photos").remove([previous]);
  revalidatePath(`/students/${id.data}`);
  return Response.json({ ok: true, message: "Student photo updated." });
}
