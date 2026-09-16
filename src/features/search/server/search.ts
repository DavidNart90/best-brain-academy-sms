import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPermission, type AccessContext } from "@/lib/permissions/contracts";
import type { GlobalSearchItem } from "../types";

const perSourceLimit = 4;
const totalLimit = 12;

function safeSearch(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s@.+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function searchApplication(
  context: AccessContext,
  rawQuery: string,
): Promise<GlobalSearchItem[]> {
  const search = safeSearch(rawQuery);
  if (search.length < 2) return [];
  const pattern = `%${search}%`;
  const supabase = await createServerSupabaseClient();
  const sources: Array<Promise<GlobalSearchItem[]>> = [];

  if (hasPermission(context, "students.read")) {
    sources.push(
      (async () => {
        const result = await supabase
          .from("student_directory")
          .select("id,full_name,admission_number,class_name")
          .or(
            `full_name.ilike.${pattern},admission_number.ilike.${pattern},guardian_phone.ilike.${pattern}`,
          )
          .order("full_name")
          .limit(perSourceLimit);
        if (result.error) throw new Error("Student search failed.");
        return result.data.flatMap((row) =>
          row.id
            ? [
                {
                  id: `student-${row.id}`,
                  category: "Student" as const,
                  title: row.full_name ?? "Student",
                  description: `${row.admission_number ?? "No admission number"} · ${row.class_name ?? "No active class"}`,
                  href: `/students/${row.id}`,
                },
              ]
            : [],
        );
      })(),
    );
  }

  if (hasPermission(context, "staff.read")) {
    sources.push(
      (async () => {
        const result = await supabase
          .from("staff_directory")
          .select("id,full_name,staff_number,position")
          .or(
            `full_name.ilike.${pattern},staff_number.ilike.${pattern},position.ilike.${pattern},phone.ilike.${pattern}`,
          )
          .order("full_name")
          .limit(perSourceLimit);
        if (result.error) throw new Error("Staff search failed.");
        return result.data.flatMap((row) =>
          row.id
            ? [
                {
                  id: `staff-${row.id}`,
                  category: "Staff" as const,
                  title: row.full_name ?? "Staff member",
                  description: `${row.staff_number ?? "No staff number"} · ${row.position ?? "Position not recorded"}`,
                  href: `/staff/${row.id}`,
                },
              ]
            : [],
        );
      })(),
    );
  }

  if (hasPermission(context, "classes.read")) {
    sources.push(
      (async () => {
        const result = await supabase
          .from("classes")
          .select("id,name,code,status")
          .or(`name.ilike.${pattern},code.ilike.${pattern}`)
          .order("sort_order")
          .limit(perSourceLimit);
        if (result.error) throw new Error("Class search failed.");
        return result.data.map((row) => ({
          id: `class-${row.id}`,
          category: "Class" as const,
          title: row.name,
          description: `${row.code} · ${row.status === "active" ? "Active" : "Archived"}`,
          href: `/classes/${row.id}`,
        }));
      })(),
    );
  }

  if (hasPermission(context, "financials.read")) {
    sources.push(
      (async () => {
        const [invoices, payments, receipts, expenses] = await Promise.all([
          supabase
            .from("invoices")
            .select(
              "id,invoice_number,student_name_snapshot,admission_number_snapshot,status",
            )
            .or(
              `invoice_number.ilike.${pattern},student_name_snapshot.ilike.${pattern},admission_number_snapshot.ilike.${pattern}`,
            )
            .order("id", { ascending: false })
            .limit(perSourceLimit),
          supabase
            .from("payments")
            .select("id,payment_number,invoice_id,business_date,status")
            .ilike("payment_number", pattern)
            .order("id", { ascending: false })
            .limit(perSourceLimit),
          supabase
            .from("receipts")
            .select(
              "id,payment_id,receipt_number,student_name_snapshot,admission_number_snapshot",
            )
            .or(
              `receipt_number.ilike.${pattern},student_name_snapshot.ilike.${pattern},admission_number_snapshot.ilike.${pattern}`,
            )
            .order("id", { ascending: false })
            .limit(perSourceLimit),
          supabase
            .from("expenses")
            .select(
              "id,expense_number,description,expense_category_name_snapshot,status",
            )
            .or(
              `expense_number.ilike.${pattern},description.ilike.${pattern},expense_category_name_snapshot.ilike.${pattern}`,
            )
            .order("id", { ascending: false })
            .limit(perSourceLimit),
        ]);
        if (
          invoices.error ||
          payments.error ||
          receipts.error ||
          expenses.error
        )
          throw new Error("Financial search failed.");
        return [
          ...invoices.data.map((row) => ({
            id: `invoice-${row.id}`,
            category: "Finance" as const,
            title: row.invoice_number,
            description: `${row.student_name_snapshot} · Invoice · ${row.status}`,
            href: `/financials/invoices/${row.id}`,
          })),
          ...payments.data.map((row) => ({
            id: `payment-${row.id}`,
            category: "Finance" as const,
            title: row.payment_number,
            description: `${row.business_date} · Payment · ${row.status}`,
            href: `/financials/invoices/${row.invoice_id}`,
          })),
          ...receipts.data.map((row) => ({
            id: `receipt-${row.id}`,
            category: "Finance" as const,
            title: row.receipt_number,
            description: `${row.student_name_snapshot} · Receipt`,
            href: `/financials/receipts/document?source=School%20fee&id=${row.payment_id}`,
          })),
          ...expenses.data.map((row) => ({
            id: `expense-${row.id}`,
            category: "Finance" as const,
            title: row.expense_number,
            description: `${row.expense_category_name_snapshot} · ${row.description}`,
            href: `/financials/expenses/document?id=${row.id}`,
          })),
        ];
      })(),
    );
  }

  if (hasPermission(context, "administrators.manage")) {
    sources.push(
      (async () => {
        const result = await supabase.rpc("get_administrator_directory", {
          search_text: search,
          status_filter: "all",
          role_filter: "all",
          page_number: 1,
          page_size: perSourceLimit,
        });
        if (result.error) throw new Error("Administrator search failed.");
        return (result.data as Array<Record<string, unknown>>).map((row) => ({
          id: `administrator-${String(row.user_id)}`,
          category: "Administrator" as const,
          title: String(row.display_name || "Unnamed account"),
          description: `${String(row.email)} · ${String(row.account_status)}`,
          href: `/administrators?q=${encodeURIComponent(String(row.email))}`,
        }));
      })(),
    );
  }

  return (await Promise.all(sources)).flat().slice(0, totalLimit);
}
