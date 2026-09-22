"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeleteResult = {
  ok: boolean;
  message: string;
};

export function ConfigurationDeleteControl({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => Promise<DeleteResult>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<DeleteResult | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setOutcome(null);
    startTransition(async () => {
      const result = await onDelete();
      setOutcome(result);
      if (!result.ok) setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <div className="ml-auto flex min-w-0 flex-col items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:bg-danger-soft hover:text-destructive"
          onClick={() => {
            setOutcome(null);
            setConfirming(true);
          }}
        >
          <Trash2 />
          Delete
        </Button>
        {outcome && (
          <p
            role="alert"
            className="max-w-xl text-right text-sm text-destructive"
          >
            {outcome.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ml-auto max-w-xl rounded-md border border-destructive/20 bg-danger-soft p-3">
      <p className="text-sm font-medium text-destructive">
        Delete {label}? This cannot be undone.
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Settings already used by school records cannot be deleted; archive them
        instead.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={remove}
          disabled={pending}
        >
          {pending && <LoaderCircle className="animate-spin" />}
          Delete
        </Button>
      </div>
    </div>
  );
}
