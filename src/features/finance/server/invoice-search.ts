"use server";

import { z } from "zod";
import { requireRateLimitedPermission } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OpenInvoiceOption } from "../types";

export async function searchOpenInvoicesAction(input: unknown): Promise<{
  invoices: OpenInvoiceOption[];
  message: string;
}> {
  const access = await requireRateLimitedPermission(
    "finance.transactions.manage",
    "invoice-search",
  );
  if (!access.ok)
    return {
      invoices: [],
      message: access.message,
    };
  const query = z.string().trim().min(2).max(80).safeParse(input);
  if (!query.success)
    return { invoices: [], message: "Enter 2–80 characters." };
  const supabase = await createServerSupabaseClient();
  // Bound values separately; never interpolate search text into a PostgREST OR expression.
  const pattern = "%" + query.data.replace(/[\\%_]/g, "\\$&") + "%";
  const results = await Promise.all(
    (["invoice_number", "student_name_snapshot"] as const).map((column) =>
      supabase
        .from("invoices")
        .select("id,invoice_number,student_name_snapshot,outstanding")
        .in("status", ["unpaid", "partially_paid"])
        .gt("outstanding", 0)
        .ilike(column, pattern)
        .order("issued_on", { ascending: false })
        .order("id", { ascending: false })
        .limit(10),
    ),
  );
  if (results.some((result) => result.error))
    return {
      invoices: [],
      message: "Invoices could not be loaded. Please try again.",
    };
  const invoices = [
    ...new Map(
      results
        .flatMap((result) => result.data ?? [])
        .map((invoice) => [invoice.id, invoice]),
    ).values(),
  ].slice(0, 10);
  return {
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      studentName: invoice.student_name_snapshot,
      outstanding: (invoice.outstanding ?? 0).toFixed(2),
    })),
    message:
      invoices.length === 10
        ? "Showing up to 10 matches. Type more to narrow the results."
        : "",
  };
}
