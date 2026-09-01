"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PreviewRow = {
  rowNumber: number;
  values: Record<string, string | null>;
  errors: string[];
};
type Preview = {
  fileName: string;
  rows: PreviewRow[];
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  canConfirm: boolean;
};

export function SpreadsheetImportDialog({
  entityLabel,
  endpoint,
  columns,
  triggerVariant = "outline",
}: {
  entityLabel: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "previewing" | "importing" | "done"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(mode: "preview" | "confirm") {
    if (!file) return setMessage("Choose an Excel workbook first.");
    setStatus(mode === "preview" ? "previewing" : "importing");
    setMessage("");
    const body = new FormData();
    body.set("mode", mode);
    body.set("file", file);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body,
        headers:
          mode === "confirm" ? { "x-import-confirmation": "confirmed" } : {},
      });
      const data = (await response.json()) as Preview & {
        message?: string;
        createdCount?: number;
      };
      if (!response.ok) {
        if (Array.isArray(data.rows)) setPreview(data);
        throw new Error(data.message ?? "The workbook could not be processed.");
      }
      if (mode === "preview") {
        setPreview(data);
        setConfirmed(false);
        setStatus("idle");
      } else {
        setStatus("done");
        setMessage(
          data.message ?? `${data.createdCount ?? 0} records imported.`,
        );
        router.refresh();
      }
    } catch (error) {
      setStatus("idle");
      setMessage(
        error instanceof Error
          ? error.message
          : "The workbook could not be processed.",
      );
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setConfirmed(false);
    setStatus("idle");
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Upload /> Import {entityLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import {entityLabel.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Upload the approved Excel template. Nothing is saved during preview;
            every row must pass before confirmation is enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {status === "done" ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <CheckCircle2 className="size-9 text-success" />
              <h3 className="mt-4 text-base font-semibold">Import complete</h3>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            </div>
          ) : (
            <>
              <label
                htmlFor="spreadsheet-import-file"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-muted/25 px-5 text-center hover:bg-muted/45"
              >
                <FileSpreadsheet className="size-6 text-primary" />
                <span className="mt-3 text-sm font-semibold">
                  {file?.name ?? "Choose an .xlsx workbook"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Maximum 2 MB
                </span>
              </label>
              <Input
                ref={inputRef}
                id="spreadsheet-import-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setConfirmed(false);
                  setMessage("");
                }}
              />
              {message && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {message}
                </p>
              )}
              {preview && (
                <section
                  className="mt-5"
                  aria-labelledby="import-preview-title"
                >
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 id="import-preview-title" className="font-semibold">
                        Import preview
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {preview.validCount} valid · {preview.errorCount} with
                        errors · {preview.duplicateCount} duplicates
                      </p>
                    </div>
                    <span
                      className={
                        preview.canConfirm
                          ? "text-xs font-semibold text-success"
                          : "text-xs font-semibold text-destructive"
                      }
                    >
                      {preview.canConfirm
                        ? "Ready to confirm"
                        : "Fix errors and preview again"}
                    </span>
                  </div>
                  <div
                    className="table-scroll max-h-80 rounded-lg border"
                    tabIndex={0}
                    role="region"
                    aria-label={`${entityLabel} import preview`}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/70 hover:bg-muted/70">
                          <TableHead>Row</TableHead>
                          {columns.map((column) => (
                            <TableHead key={column.key}>
                              {column.label}
                            </TableHead>
                          ))}
                          <TableHead>Validation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell>{row.rowNumber}</TableCell>
                            {columns.map((column) => (
                              <TableCell
                                key={column.key}
                                className="whitespace-nowrap"
                              >
                                {row.values[column.key] || "—"}
                              </TableCell>
                            ))}
                            <TableCell className="min-w-64">
                              {row.errors.length === 0 ? (
                                <span className="font-medium text-success">
                                  Valid
                                </span>
                              ) : (
                                <ul className="list-disc space-y-1 pl-4 text-xs text-destructive">
                                  {row.errors.map((error) => (
                                    <li key={error}>{error}</li>
                                  ))}
                                </ul>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {preview.canConfirm && (
                    <label className="mt-4 flex items-start gap-3 rounded-lg border bg-muted/25 p-4 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-primary"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      <span>
                        I confirm these {preview.rows.length}{" "}
                        {entityLabel.toLowerCase()} records are ready to save.
                      </span>
                    </label>
                  )}
                </section>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {status === "done" ? (
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!file || status !== "idle"}
                  onClick={() => void submit("preview")}
                >
                  {status === "previewing" && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {status === "previewing" ? "Previewing…" : "Preview file"}
                </Button>
                <Button
                  type="button"
                  disabled={
                    !preview?.canConfirm || !confirmed || status !== "idle"
                  }
                  onClick={() => void submit("confirm")}
                >
                  {status === "importing" && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {status === "importing" ? "Importing…" : "Confirm and import"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
