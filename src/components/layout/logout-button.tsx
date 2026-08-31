"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/server/actions";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="ghost"
        className="min-h-10 w-full justify-start text-muted-foreground"
        disabled={pending}
        aria-label="Log out"
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await signOut();
              setError(result.error);
            } catch {
              setError("Unable to sign out. Please retry.");
            }
          })
        }
      >
        <LogOut size={18} />
        <span className={compact ? "sr-only" : ""}>
          {pending ? "Signing out…" : "Log out"}
        </span>
      </Button>
      {error && (
        <p role="alert" className="p-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
