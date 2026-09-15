import { z } from "zod";

export type OutstandingSearchParams = Record<
  string,
  string | string[] | undefined
>;

const optionalFilterIdSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional().catch(undefined),
);

const outstandingQuerySchema = z.object({
  q: z.string().trim().max(80).catch(""),
  classId: optionalFilterIdSchema,
  academicTermId: optionalFilterIdSchema,
  page: z.coerce.number().int().min(1).max(400).catch(1),
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeOutstandingQuery(raw: OutstandingSearchParams) {
  const parsed = outstandingQuerySchema.parse({
    q: firstValue(raw.q),
    classId: firstValue(raw.classId),
    academicTermId: firstValue(raw.academicTermId),
    page: firstValue(raw.page),
  });

  return {
    ...parsed,
    q: parsed.q
      .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

export type OutstandingQuery = ReturnType<typeof normalizeOutstandingQuery>;

export function outstandingFeesHref(
  query: OutstandingQuery,
  options: {
    page?: number;
    pathname?: "/financials/outstanding" | "/financials/outstanding/print";
  } = {},
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.classId) params.set("classId", String(query.classId));
  if (query.academicTermId)
    params.set("academicTermId", String(query.academicTermId));
  if (options.page && options.page > 1)
    params.set("page", String(options.page));

  const pathname = options.pathname ?? "/financials/outstanding";
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
