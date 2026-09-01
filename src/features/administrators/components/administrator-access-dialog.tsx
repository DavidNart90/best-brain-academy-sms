"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Settings2 } from "lucide-react";
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
import type { AdministratorDirectoryRow } from "../types";
import {
  changeAdministratorRole,
  changeAdministratorStatus,
} from "../server/actions";

export function AdministratorAccessDialog({
  account,
  currentUserId,
}: {
  account: AdministratorDirectoryRow;
  currentUserId: string;
}) {
  const [role, setRole] = useState(account.role ?? "ADMINISTRATOR");
  const [status, setStatus] = useState<"active" | "disabled">(
    account.status === "disabled" ? "disabled" : "active",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const isSelf = account.userId === currentUserId;
  function run(kind: "role" | "status") {
    setMessage("");
    startTransition(async () => {
      const result =
        kind === "role"
          ? await changeAdministratorRole({ userId: account.userId, role })
          : await changeAdministratorStatus({ userId: account.userId, status });
      setMessage(result.message);
      if (result.ok) setConfirmed(false);
    });
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isSelf}>
          <Settings2 /> Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,40rem)]">
        <DialogHeader>
          <DialogTitle>Manage {account.displayName}</DialogTitle>
          <DialogDescription>
            Permission changes apply immediately. Your own account cannot be
            changed here, and the final active Super Administrator is protected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label
              className="field text-sm font-medium"
              htmlFor={`role-${account.userId}`}
            >
              Role
              <select
                id={`role-${account.userId}`}
                className="native-select"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="SUPER_ADMIN">Super Administrator</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="MANAGEMENT">Management</option>
              </select>
            </label>
            <Button
              type="button"
              onClick={() => run("role")}
              disabled={!confirmed || pending || role === account.role}
            >
              {pending && <LoaderCircle className="animate-spin" />} Save role
            </Button>
          </div>
          <div className="grid gap-2 border-t pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <label
              className="field text-sm font-medium"
              htmlFor={`status-${account.userId}`}
            >
              Account status
              <select
                id={`status-${account.userId}`}
                className="native-select"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "disabled")
                }
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <Button
              type="button"
              variant={status === "disabled" ? "destructive" : "default"}
              onClick={() => run("status")}
              disabled={!confirmed || pending || status === account.status}
            >
              {pending && <LoaderCircle className="animate-spin" />} Save status
            </Button>
          </div>
          <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I confirm this privileged access change for {account.email}.
            </span>
          </label>
          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
