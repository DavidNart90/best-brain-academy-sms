import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { paymentQuerySchema } from "../payment-query";

export async function getPaymentsPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const query = paymentQuerySchema.parse(raw);
  const supabase = await createServerSupabaseClient();
  const pageSize = 25;
  // Each committed school-fee payment has one immutable receipt snapshot.
  let request = supabase
    .from("receipts")
    .select(
      "payment_id,receipt_number,student_name_snapshot,admission_number_snapshot,invoice_number_snapshot,payment_method_name_snapshot,amount,business_date,status,reversal_reason",
      { count: "exact" },
    );
  if (query.q) {
    const columns = {
      student: "student_name_snapshot",
      invoice: "invoice_number_snapshot",
      receipt: "receipt_number",
    } as const;
    request = request.ilike(
      columns[query.searchBy],
      `%${query.q.replace(/[\\%_]/g, "\\$&")}%`,
    );
  }
  if (query.date) request = request.eq("business_date", query.date);
  if (query.status !== "all") request = request.eq("status", query.status);
  const receipts = await request
    .order("business_date", { ascending: false })
    .order("id", { ascending: false })
    .range((query.page - 1) * pageSize, query.page * pageSize - 1);
  if (receipts.error)
    throw new Error("Payments could not be loaded. Please try again.");
  const ids = receipts.data.map((row) => row.payment_id);
  const payments = ids.length
    ? await supabase
        .from("payments")
        .select("id,payment_number,invoice_id,external_reference")
        .in("id", ids)
    : { data: [], error: null };
  if (payments.error)
    throw new Error(
      "Payment references could not be loaded. Please try again.",
    );
  const byId = new Map(payments.data.map((payment) => [payment.id, payment]));
  return {
    query,
    pageSize,
    total: receipts.count ?? 0,
    rows: receipts.data.map((receipt) => {
      const payment = byId.get(receipt.payment_id);
      if (!payment)
        throw new Error(
          "Payment references could not be loaded. Please try again.",
        );
      return { ...receipt, ...payment, amount: receipt.amount.toFixed(2) };
    }),
  };
}
