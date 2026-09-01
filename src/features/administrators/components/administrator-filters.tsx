import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdministratorListQuery } from "../schemas";

export function AdministratorFilters({
  initial,
}: {
  initial: AdministratorListQuery;
}) {
  return (
    <form
      method="get"
      className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_11rem_13rem_auto]"
      role="search"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={initial.q}
          className="pl-9"
          placeholder="Search name, email or phone"
          aria-label="Search administrators"
        />
      </div>
      <select
        name="status"
        defaultValue={initial.status}
        className="native-select"
        aria-label="Account status"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="disabled">Disabled</option>
      </select>
      <select
        name="role"
        defaultValue={initial.role}
        className="native-select"
        aria-label="Administrator role"
      >
        <option value="all">All roles</option>
        <option value="SUPER_ADMIN">Super Administrator</option>
        <option value="ADMINISTRATOR">Administrator</option>
        <option value="ACCOUNTANT">Accountant</option>
        <option value="MANAGEMENT">Management</option>
      </select>
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
