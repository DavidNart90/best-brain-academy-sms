"use client";
import { PageState } from "@/components/data-display/page-state";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl p-6 pt-20">
      <PageState
        kind="error"
        title="The workspace couldn’t be loaded"
        description="Access or school services could not be verified. No business transaction was attempted."
      >
        <Button onClick={reset} className="mt-2">
          Try again
        </Button>
      </PageState>
    </main>
  );
}
