import { z } from "zod";

export const paymentQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  searchBy: z.enum(["student", "invoice", "receipt"]).catch("student"),
  date: z.union([z.string().date(), z.literal("")]).catch(""),
  status: z.enum(["all", "active", "reversed"]).catch("all"),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});

export function paymentPageHref(
  query: z.infer<typeof paymentQuerySchema>,
  page: number,
) {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
    params.set("searchBy", query.searchBy);
  }
  if (query.date) params.set("date", query.date);
  if (query.status !== "all") params.set("status", query.status);
  if (page > 1) params.set("page", String(page));
  return `/financials/payments${params.size ? `?${params}` : ""}`;
}
