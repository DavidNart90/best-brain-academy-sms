import Link from "next/link";
import {
  Banknote,
  Boxes,
  CircleAlert,
  PackageCheck,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetInventoryForm } from "@/features/assets/components/asset-inventory-form";
import { assetStatuses } from "@/features/assets/schemas";
import { getAssetInventoryPage } from "@/features/assets/server/queries";
import type {
  AssetCondition,
  AssetInventoryRecord,
  AssetStatus,
} from "@/features/assets/types";
import { requirePermission } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

const statusLabels: Record<AssetStatus, string> = {
  active: "Active",
  in_storage: "In storage",
  under_repair: "Under repair",
  out_of_stock: "Out of stock",
  disposed: "Disposed",
};

const conditionLabels: Record<AssetCondition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
  not_applicable: "N/A",
};

const statusStyles: Record<AssetStatus, string> = {
  active: "bg-success-soft text-success",
  in_storage: "bg-muted text-muted-foreground",
  under_repair: "bg-warning-soft text-warning",
  out_of_stock: "bg-danger-soft text-destructive",
  disposed: "bg-muted text-muted-foreground",
};

const conditionStyles: Record<AssetCondition, string> = {
  new: "bg-brand-subtle text-primary",
  good: "bg-success-soft text-success",
  fair: "bg-warning-soft text-warning",
  poor: "bg-danger-soft text-destructive",
  damaged: "bg-danger-soft text-destructive",
  not_applicable: "bg-muted text-muted-foreground",
};

function quantity(value: string) {
  const parsed = Number(value);
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

function updatedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function recordValue(row: AssetInventoryRecord) {
  return row.unitCost
    ? (Number(row.quantity) * Number(row.unitCost)).toFixed(2)
    : null;
}

function queryHref(
  query: {
    q: string;
    type: string;
    status: string;
    edit: number | null;
  },
  options: { page?: number; edit?: number | null } = {},
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type !== "all") params.set("type", query.type);
  if (query.status !== "all") params.set("status", query.status);
  const edit = options.edit === undefined ? query.edit : options.edit;
  if (edit) params.set("edit", String(edit));
  if (options.page && options.page > 1)
    params.set("page", String(options.page));
  const suffix = params.toString();
  return suffix ? `/financials/assets?${suffix}` : "/financials/assets";
}

export default async function AssetsInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("assets.manage");
  if (!context) return <PermissionDenied />;

  const result = await getAssetInventoryPage(await searchParams);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const cancelHref = queryHref(result.query, { edit: null });
  const clearHref = result.query.edit
    ? `/financials/assets?edit=${result.query.edit}`
    : "/financials/assets";

  return (
    <>
      <PageHeader
        title="Assets & inventory"
        description="Maintain an audited register of school equipment, furniture, supplies and consumable stock."
      >
        <Button asChild>
          <Link href={`${cancelHref}#asset-record-form`}>
            <Plus /> New record
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-5">
        <section
          className="panel grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Asset and inventory summary"
        >
          <SummaryCell
            icon={Boxes}
            label="Register records"
            value={String(result.summary.recordCount)}
            detail="Assets and inventory lines"
          />
          <SummaryCell
            icon={PackageCheck}
            label="Quantity on record"
            value={quantity(String(result.summary.totalQuantity))}
            detail="Across all recorded units"
          />
          <SummaryCell
            icon={Banknote}
            label="Active recorded value"
            value={<Money value={result.summary.activeValue.toFixed(2)} />}
            detail="Excludes disposed records"
          />
          <SummaryCell
            icon={CircleAlert}
            label="Needs attention"
            value={String(result.summary.attentionCount)}
            detail={`${result.summary.lowStockCount} at or below reorder level`}
            warning={result.summary.attentionCount > 0}
          />
        </section>

        <AssetInventoryForm
          key={result.editRecord?.id ?? "new"}
          record={result.editRecord}
          suggestedRecordCode={result.summary.nextRecordCode}
          locations={result.locations}
          cancelHref={cancelHref}
        />

        <section className="panel p-5" aria-labelledby="asset-register-title">
          <div className="mb-4">
            <h2 id="asset-register-title" className="text-base font-semibold">
              School register
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by code, item, category, serial number or custodian.
            </p>
          </div>
          <LiveFilterForm
            ariaLabel="Filter asset and inventory records"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_13rem_auto] lg:items-end"
          >
            <div className="field">
              <label htmlFor="asset-register-search" className="field-label">
                Search register
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="asset-register-search"
                  name="q"
                  defaultValue={result.query.q}
                  maxLength={80}
                  placeholder="Code, item or custodian"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="asset-register-type" className="field-label">
                Type
              </label>
              <select
                id="asset-register-type"
                name="type"
                defaultValue={result.query.type}
                className="native-select w-full"
              >
                <option value="all">All types</option>
                <option value="asset">Assets</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="asset-register-status" className="field-label">
                Status
              </label>
              <select
                id="asset-register-status"
                name="status"
                defaultValue={result.query.status}
                className="native-select w-full"
              >
                <option value="all">All statuses</option>
                {assetStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <Button asChild type="button" variant="ghost">
              <Link href={clearHref}>Clear filters</Link>
            </Button>
          </LiveFilterForm>
        </section>

        {result.rows.length === 0 ? (
          <PageState
            kind="empty"
            title="No register records found"
            description={
              result.summary.recordCount === 0
                ? "Add the school's first asset or inventory record using the form above."
                : "Try a different search, type or status filter."
            }
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Asset and inventory register"
            >
              <table className="w-full min-w-260 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Item</th>
                    <th className="py-3 text-left font-medium">Type</th>
                    <th className="py-3 text-left font-medium">Quantity</th>
                    <th className="py-3 text-left font-medium">Location</th>
                    <th className="py-3 text-left font-medium">Condition</th>
                    <th className="py-3 text-left font-medium">Status</th>
                    <th className="py-3 text-right font-medium">Value</th>
                    <th className="py-3 text-left font-medium">Updated</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const lowStock =
                      row.recordType === "inventory" &&
                      row.reorderLevel !== null &&
                      Number(row.quantity) <= Number(row.reorderLevel);
                    const value = recordValue(row);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t align-top",
                          lowStock && "bg-warning-soft/25",
                        )}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium">{row.itemName}</p>
                          <p className="mt-1 font-mono text-xs text-primary">
                            {row.recordCode}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.category}
                            {row.serialNumber
                              ? ` · S/N ${row.serialNumber}`
                              : ""}
                          </p>
                        </td>
                        <td className="py-4 capitalize">{row.recordType}</td>
                        <td className="py-4">
                          <p className="font-medium tabular-nums">
                            {quantity(row.quantity)} {row.unitName}
                          </p>
                          {lowStock && (
                            <p className="mt-1 text-xs font-medium text-warning">
                              Reorder at {quantity(row.reorderLevel ?? "0")}
                            </p>
                          )}
                        </td>
                        <td className="py-4">
                          <p>{row.schoolLocationName ?? "Not assigned"}</p>
                          {row.roomOrStore && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.roomOrStore}
                            </p>
                          )}
                          {row.custodian && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.custodian}
                            </p>
                          )}
                        </td>
                        <td className="py-4">
                          <Badge
                            variant="secondary"
                            className={conditionStyles[row.condition]}
                          >
                            {conditionLabels[row.condition]}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant="secondary"
                            className={statusStyles[row.status]}
                          >
                            {statusLabels[row.status]}
                          </Badge>
                        </td>
                        <td className="py-4 text-right">
                          {value ? <Money value={value} /> : "Not recorded"}
                        </td>
                        <td className="py-4 text-xs text-muted-foreground">
                          {updatedDate(row.updatedAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`${queryHref(result.query, { edit: row.id })}#asset-record-form`}
                            >
                              <Pencil /> Edit
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={result.page}
              pageCount={pageCount}
              total={result.total}
              pageSize={result.pageSize}
              hrefForPage={(page) => queryHref(result.query, { page })}
              itemLabel="records"
            />
          </section>
        )}
      </div>
    </>
  );
}

function SummaryCell({
  icon: Icon,
  label,
  value,
  detail,
  warning = false,
}: {
  icon: typeof Boxes;
  label: string;
  value: React.ReactNode;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="border-b p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon
          className={cn("size-4", warning ? "text-warning" : "text-primary")}
          aria-hidden="true"
        />
        {label}
      </div>
      <p
        className={cn(
          "mt-3 text-xl font-semibold tabular-nums",
          warning && "text-warning",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
