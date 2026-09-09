import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { guardApiRequest } from "@/lib/auth/api-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { studentIdSchema } from "@/features/students/schemas";
import { studentPhotoExtension } from "@/features/students/photo";
import {
  hasContentType,
  InvalidRequestBodyError,
  isTrustedMutationRequest,
  readBoundedFormData,
  RequestBodyTooLargeError,
} from "@/lib/security/request";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 256 * 1024;

async function parsedId(params: Promise<{ id: string }>) {
  return studentIdSchema.safeParse((await params).id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await guardApiRequest("students.read");
  if (!access.ok) return access.response;
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
  if (!isTrustedMutationRequest(request))
    return Response.json(
      { message: "Request origin is not allowed." },
      { status: 403 },
    );
  const access = await guardApiRequest("students.manage", "file-upload");
  if (!access.ok) return access.response;
  if (!hasContentType(request, "multipart/form-data"))
    return Response.json(
      { message: "Send a student photo upload." },
      { status: 415 },
    );
  const id = await parsedId(params);
  if (!id.success)
    return Response.json({ message: "Student not found." }, { status: 404 });
  let formData: FormData;
  try {
    formData = await readBoundedFormData(request, MAX_BODY_BYTES);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof RequestBodyTooLargeError
            ? "Use a JPG, PNG or WebP image no larger than 5 MB."
            : error instanceof InvalidRequestBodyError
              ? "The photo upload could not be read."
              : "The photo upload could not be read.",
      },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }
  const file = formData.get("photo");
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
