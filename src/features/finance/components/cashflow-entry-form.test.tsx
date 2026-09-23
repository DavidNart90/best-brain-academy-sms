import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashflowEntryForm } from "./cashflow-entry-form";

const { post, search, refresh } = vi.hoisted(() => ({
  post: vi.fn(),
  search: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("../server/actions", () => ({ recordFinanceAction: post }));
vi.mock("../server/invoice-search", () => ({
  searchOpenInvoicesAction: search,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const options = {
  paymentMethods: [
    { id: 1, name: "Cash", requires_reference: false },
    { id: 2, name: "Mobile Money", requires_reference: true },
  ],
  expenseCategories: [
    { id: 1, code: "FUEL", name: "Fuel", status: "active" },
    { id: 2, code: "OTHER", name: "Other", status: "active" },
  ],
};

function renderForm() {
  return render(
    <CashflowEntryForm
      options={options}
      businessDate="2026-09-08"
      admissionExpectation={{
        businessDate: "2026-09-08",
        admissionCount: 3,
        feePerAdmission: "50.00",
        expectedAmount: "150.00",
        termLabel: "2026/2027 · Term 1",
      }}
    />,
  );
}

describe("daily cashflow entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockResolvedValue({
      ok: true,
      message: "Transaction posted successfully.",
    });
    search.mockResolvedValue({
      invoices: [
        {
          id: 241,
          invoiceNumber: "BBA/INV/2026/00241",
          studentName: "Synthetic Student",
          outstanding: "500.00",
        },
      ],
      message: "",
    });
  });

  it("searches invoices by name and posts the selected result using the keyboard", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(
      screen.getByRole("combobox", { name: /Find invoice/ }),
      "Synthetic",
    );
    await screen.findByRole("option", { name: /Synthetic Student/ });
    expect(search).toHaveBeenCalledWith("Synthetic");
    await user.keyboard("{Enter}");
    expect(screen.getByText(/Outstanding:/)).toHaveTextContent("GHS 500.00");
    await user.type(screen.getByLabelText(/Amount \(GHS\)/), "500");
    await user.selectOptions(screen.getByLabelText(/Payment method/), "1");
    await user.click(screen.getByRole("button", { name: "Post transaction" }));
    await screen.findByRole("status");
    expect(post).toHaveBeenCalledWith(
      "school_fee_payment",
      expect.objectContaining({ invoiceId: 241, amount: "500" }),
    );
    expect(screen.getByRole("combobox", { name: /Find invoice/ })).toHaveValue(
      "",
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("requires selecting a search result and invalidates selection when the query changes", async () => {
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByRole("combobox", { name: /Find invoice/ });
    await user.type(input, "BBA/INV");
    await user.click(
      await screen.findByRole("option", { name: /Synthetic Student/ }),
    );
    await user.clear(input);
    await user.type(input, "another");
    await user.type(screen.getByLabelText(/Amount \(GHS\)/), "10");
    await user.selectOptions(screen.getByLabelText(/Payment method/), "1");
    await user.click(screen.getByRole("button", { name: "Post transaction" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Select an invoice",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it.each(["Feeding fees", "Admission fees"])(
    "posts %s as a daily total without a student",
    async (mode) => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: mode }));
      expect(screen.queryByLabelText(/Student/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: /Find invoice/ }),
      ).not.toBeInTheDocument();
      await user.type(screen.getByLabelText(/Daily total/), "125.50");
      await user.selectOptions(screen.getByLabelText(/Payment method/), "1");
      await user.click(
        screen.getByRole("button", { name: "Post transaction" }),
      );
      await waitFor(() => expect(post).toHaveBeenCalledOnce());
      expect(post.mock.calls[0]?.[1]).not.toHaveProperty("studentId");
      expect(post.mock.calls[0]?.[1]).toMatchObject({
        amount: "125.50",
        businessDate: "2026-09-08",
      });
    },
  );

  it("shows the expected admission total before posting", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Admission fees" }));
    expect(
      screen.getByText("Admissions on this date").nextSibling,
    ).toHaveTextContent("3");
    expect(screen.getByText("Fee per admission").nextSibling).toHaveTextContent(
      "GHS 50.00",
    );
    expect(
      screen.getByText("Expected admission fees").nextSibling,
    ).toHaveTextContent("GHS 150.00");
    expect(screen.getByLabelText(/Daily total/)).toHaveAttribute(
      "placeholder",
      "150.00",
    );
  });

  it("asks for an income name and reveals a required name for Other expenses", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(
      screen.getByRole("button", { name: "Miscellaneous income" }),
    );
    expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/Income name/),
      "Exercise book sales",
    );
    await user.type(screen.getByLabelText(/Amount \(GHS\)/), "25");
    await user.selectOptions(screen.getByLabelText(/Payment method/), "1");
    await user.click(screen.getByRole("button", { name: "Post transaction" }));
    await waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      description: "Exercise book sales",
    });
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty("categoryId");
    await user.click(screen.getByRole("button", { name: "Expense" }));
    await user.selectOptions(screen.getByLabelText(/Expense category/), "2");
    expect(screen.getByLabelText(/Other expense name/)).toBeRequired();
    await user.selectOptions(screen.getByLabelText(/Payment method/), "2");
    expect(screen.getByLabelText(/External reference/)).toBeRequired();
  });

  it("preserves inputs and the request key after an uncertain result, then resets on success", async () => {
    post.mockRejectedValueOnce(new Error("Network disconnected"));
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Feeding fees" }));
    await user.type(screen.getByLabelText(/Daily total/), "100");
    await user.selectOptions(screen.getByLabelText(/Payment method/), "1");
    await user.click(screen.getByRole("button", { name: "Post transaction" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Retry without changing",
    );
    expect(screen.getByLabelText(/Daily total/)).toHaveValue("100");
    await user.click(screen.getByRole("button", { name: "Post transaction" }));
    await screen.findByRole("status");
    expect(post.mock.calls[0]?.[1].requestKey).toBe(
      post.mock.calls[1]?.[1].requestKey,
    );
    expect(screen.getByLabelText(/Daily total/)).toHaveValue("");
  });

  it("announces no results without presenting success feedback", async () => {
    search.mockResolvedValue({ invoices: [], message: "" });
    const user = userEvent.setup();
    renderForm();
    await user.type(
      screen.getByRole("combobox", { name: /Find invoice/ }),
      "missing",
    );
    expect(
      await screen.findByText("No open invoices found."),
    ).toBeInTheDocument();
  });

  it("ignores a late response for an earlier search", async () => {
    let resolveOld:
      | ((value: {
          invoices: Array<{
            id: number;
            invoiceNumber: string;
            studentName: string;
            outstanding: string;
          }>;
          message: string;
        }) => void)
      | undefined;
    search.mockImplementation((query: string) =>
      query === "Earlier"
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({
            invoices: [
              {
                id: 301,
                invoiceNumber: "INV-301",
                studentName: "Latest Match",
                outstanding: "10.00",
              },
            ],
            message: "",
          }),
    );
    const user = userEvent.setup();
    renderForm();
    const input = screen.getByRole("combobox", { name: /Find invoice/ });
    await user.type(input, "Earlier");
    await waitFor(() => expect(search).toHaveBeenCalledWith("Earlier"));
    await user.clear(input);
    await user.type(input, "Latest");
    await screen.findByRole("option", { name: /Latest Match/ });
    await act(async () =>
      resolveOld?.({
        invoices: [
          {
            id: 99,
            invoiceNumber: "INV-99",
            studentName: "Stale Match",
            outstanding: "99.00",
          },
        ],
        message: "",
      }),
    );
    expect(
      screen.queryByRole("option", { name: /Stale Match/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Latest Match/ }),
    ).toBeInTheDocument();
  });
});
