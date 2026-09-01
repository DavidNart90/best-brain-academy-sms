"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCHOOL_LOGO_MAX_BYTES } from "../logo";

type UploadState = { tone: "success" | "error"; message: string } | null;

export function SchoolLogoUpload({ version }: { version: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>(null);
  const [logoVersion, setLogoVersion] = useState(version);

  async function upload(file: File) {
    if (file.type !== "image/png" || file.size > SCHOOL_LOGO_MAX_BYTES) {
      setUploadState({
        tone: "error",
        message: "Choose a PNG no larger than 2 MB.",
      });
      return;
    }

    setUploading(true);
    setUploadState(null);
    const body = new FormData();
    body.set("logo", file);

    try {
      const response = await fetch("/api/settings/school/logo", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        message?: string;
        version?: number;
      };
      if (!response.ok) throw new Error(result.message || "Upload failed.");

      setLogoVersion(String(result.version ?? Date.now()));
      setUploadState({
        tone: "success",
        message: result.message || "School logo updated.",
      });
      router.refresh();
    } catch (error) {
      setUploadState({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The school logo could not be uploaded.",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid items-center gap-6 border-b border-border pb-6 md:grid-cols-[160px_1fr]">
      <div className="flex min-h-36 items-center justify-center bg-canvas px-4 py-3">
        <Image
          src={`/api/branding/logo?v=${encodeURIComponent(logoVersion)}`}
          alt="Current Best Brain Academy crest"
          width={1254}
          height={1254}
          className="size-32 object-contain drop-shadow-[0_8px_14px_rgba(78,35,32,0.14)]"
          unoptimized
          priority
        />
      </div>
      <div className="max-w-xl">
        <h3 className="text-sm font-semibold">School logo</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This transparent crest appears on sign-in and throughout the school
          workspace. Use a clear PNG, at least 128 pixels wide, up to 2 MB.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            id="school-logo-upload"
            type="file"
            accept="image/png,.png"
            aria-label="Upload school logo"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <ImageUp aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Upload new logo"}
          </Button>
          <span className="text-xs text-muted-foreground">PNG · max 2 MB</span>
        </div>
        <p
          className={
            uploadState?.tone === "error"
              ? "mt-3 text-sm text-destructive"
              : "mt-3 text-sm text-success"
          }
          role="status"
          aria-live="polite"
        >
          {uploadState?.message}
        </p>
      </div>
    </div>
  );
}
