import Link from "next/link";
import { PageState } from "@/components/data-display/page-state";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6 pt-20">
      <PageState
        title="Page not found"
        description="This address does not match a school workspace."
      >
        <Button asChild variant="outline" className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </PageState>
    </main>
  );
}
