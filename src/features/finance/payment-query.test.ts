import { expect, it } from "vitest";
import { paymentPageHref, paymentQuerySchema } from "./payment-query";

it("defaults invalid filters safely", () => {
  expect(
    paymentQuerySchema.parse({
      page: -1,
      status: "unknown",
      date: "2026-02-30",
    }),
  ).toEqual({ q: "", searchBy: "student", page: 1, status: "all", date: "" });
});
it("preserves filters when changing pages", () => {
  const query = paymentQuerySchema.parse({
    q: "A & B",
    searchBy: "invoice",
    date: "2026-09-08",
    status: "reversed",
  });
  const url = new URL(paymentPageHref(query, 2), "http://localhost");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    q: "A & B",
    searchBy: "invoice",
    date: "2026-09-08",
    status: "reversed",
    page: "2",
  });
});
