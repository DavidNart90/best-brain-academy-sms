"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdateManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;
    let onInstallingStateChange: (() => void) | null = null;

    const showWaitingWorker = (worker: ServiceWorker | null) => {
      if (!disposed && worker) {
        setWaitingWorker(worker);
        setDismissed(false);
      }
    };
    const onControllerChange = () => {
      if (reloading.current) window.location.reload();
    };
    const onUpdateFound = () => {
      const worker = registration?.installing ?? null;
      if (!worker) return;
      if (installingWorker && onInstallingStateChange)
        installingWorker.removeEventListener(
          "statechange",
          onInstallingStateChange,
        );
      installingWorker = worker;
      onInstallingStateChange = () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          showWaitingWorker(worker);
        }
      };
      worker.addEventListener("statechange", onInstallingStateChange);
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registered) => {
        if (disposed) return;
        registration = registered;
        showWaitingWorker(registered.waiting);
        registered.addEventListener("updatefound", onUpdateFound);
      })
      .catch(() => {
        // PWA support is progressive; the authenticated web app remains usable.
      });

    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void registration?.update();
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    const interval = window.setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      registration?.removeEventListener("updatefound", onUpdateFound);
      if (installingWorker && onInstallingStateChange)
        installingWorker.removeEventListener(
          "statechange",
          onInstallingStateChange,
        );
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  return (
    <aside
      aria-label="Application update available"
      className="fixed inset-x-4 bottom-4 z-50 ml-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-md sm:inset-x-auto sm:right-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-primary">
          <RefreshCw className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Application update ready</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Update now to load the latest fixes and improvements. Your signed-in
            session will be preserved.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                reloading.current = true;
                waitingWorker.postMessage({ type: "SKIP_WAITING" });
              }}
            >
              Update now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Later
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Dismiss update notification"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
