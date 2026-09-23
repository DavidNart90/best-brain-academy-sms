import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TermRateWorkflow } from "./term-rate-workflow";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/settings/server/term-rate-actions", () => ({
  approveTermRateConfiguration: vi.fn(),
  prepareTermRateDraft: vi.fn(),
}));

const notStarted = {
  status: "not_started" as const,
  sourceTermId: null,
  sourceTermLabel: null,
  previousTermId: 1,
  previousTermLabel: "2026/2027 · Term 1",
  approvedAt: null,
};

describe("term rate workflow", () => {
  it("locks future student fees without offering a draft action", () => {
    render(
      <TermRateWorkflow
        canManage
        configuration={notStarted}
        domain="school_fees"
        isCurrentTerm={false}
        termId={2}
        termLabel="2026/2027 · Term 2"
      />,
    );

    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(
      screen.getByText(/will open when the term becomes current/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /copy previous term/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the current student-fee draft editable and approvable", () => {
    render(
      <TermRateWorkflow
        canManage
        configuration={{ ...notStarted, status: "draft" }}
        domain="school_fees"
        isCurrentTerm
        termId={1}
        termLabel="2026/2027 · Term 1"
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /approve rates/i }),
    ).toBeEnabled();
  });

  it("keeps approved current-term student fees editable", () => {
    render(
      <TermRateWorkflow
        canManage
        configuration={{
          ...notStarted,
          status: "approved",
          approvedAt: "2026-09-23T09:26:46.504285+00:00",
        }}
        domain="school_fees"
        isCurrentTerm
        termId={1}
        termLabel="2026/2027 · Term 1"
      />,
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(
      screen.getByText(/current-term student fees remain editable/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve rates/i }),
    ).not.toBeInTheDocument();
  });

  it("locks future Books and Prospectus without offering a draft action", () => {
    render(
      <TermRateWorkflow
        canManage
        configuration={notStarted}
        domain="library_prospectus"
        isCurrentTerm={false}
        termId={2}
        termLabel="2026/2027 · Term 2"
      />,
    );

    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(
      screen.getByText(/books & prospectus.*future term are locked/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /copy previous term/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps approved current-term Books and Prospectus editable", () => {
    render(
      <TermRateWorkflow
        canManage
        configuration={{
          ...notStarted,
          status: "approved",
          approvedAt: "2026-09-22T11:10:25.538498+00:00",
        }}
        domain="library_prospectus"
        isCurrentTerm
        termId={1}
        termLabel="2026/2027 · Term 1"
      />,
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(
      screen.getByText(/books & prospectus prices remain editable/i),
    ).toBeInTheDocument();
  });
});
