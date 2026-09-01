import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StaffListQuery } from "../schemas";

export function StaffFilters({ initial }: { initial: StaffListQuery }) {
  return (
    <form
      method="get"
      className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_11rem_11rem_auto]"
      role="search"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={initial.q}
          className="pl-9"
          placeholder="Search name, ID, phone or position"
          aria-label="Search staff"
        />
      </div>
      <select
        name="staffType"
        defaultValue={initial.staffType}
        className="native-select"
        aria-label="Staff type"
      >
        <option value="all">All staff types</option>
        <option value="teaching">Teaching</option>
        <option value="non_teaching">Non-teaching</option>
      </select>
      <select
        name="status"
        defaultValue={initial.status}
        className="native-select"
        aria-label="Employment status"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
