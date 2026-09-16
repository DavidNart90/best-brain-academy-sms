import { describe, expect, it } from "vitest";
import {
  normalizeOutstandingQuery,
  outstandingFeesHref,
} from "./outstanding-query";

describe("outstanding-fees query", () => {
  it("normalizes safe filters and falls back from invalid paging values", () => {
    expect(
      normalizeOutstandingQuery({
        q: ["  Ama,   / INV-01!! ", "ignored"],
        classId: "12",
        academicTermId: "7",
        page: "not-a-page",
      }),
    ).toEqual({
      q: "Ama / INV-01",
      classId: 12,
      academicTermId: 7,
      page: 1,
    });

    expect(
      normalizeOutstandingQuery({ classId: "-2", academicTermId: "all" }),
    ).toMatchObject({ classId: undefined, academicTermId: undefined, page: 1 });
  });

  it("preserves active filters in pagination and print links", () => {
    const query = normalizeOutstandingQuery({
      q: "INV/24-01",
      classId: "3",
      academicTermId: "5",
    });

    expect(outstandingFeesHref(query, { page: 2 })).toBe(
      "/financials/outstanding?q=INV%2F24-01&classId=3&academicTermId=5&page=2",
    );
    expect(
      outstandingFeesHref(query, {
        pathname: "/financials/outstanding/print",
      }),
    ).toBe(
      "/financials/outstanding/print?q=INV%2F24-01&classId=3&academicTermId=5",
    );
  });
});
