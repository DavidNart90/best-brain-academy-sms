export type TermRateDomain = "school_fees" | "library_prospectus";

export type TermRateConfigurationStatus = "not_started" | "draft" | "approved";

export type TermRateConfiguration = {
  status: TermRateConfigurationStatus;
  sourceTermId: number | null;
  sourceTermLabel: string | null;
  previousTermId: number | null;
  previousTermLabel: string | null;
  approvedAt: string | null;
};
