import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionsTable } from "./collections-table";
describe("synthetic table controls", () => {
  it("combines filters, announces no results, and restores rows on clear", async () => {
    const user = userEvent.setup();
    render(<CollectionsTable />);
    await user.selectOptions(screen.getByLabelText("Class"), "Demo Class B");
    await user.selectOptions(screen.getByLabelText("Status"), "Partially Paid");
    expect(screen.getByText("Demo student 002")).toBeInTheDocument();
    expect(screen.queryByText("Demo student 005")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Student or ID"), "missing");
    expect(
      screen.getByText("No demo records match your filters."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Showing 5 of 5 demo records")).toBeInTheDocument();
    expect(screen.getAllByText("GHS 1,250.00").length).toBeGreaterThan(0);
  });
});
