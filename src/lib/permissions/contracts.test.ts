import { describe, expect, it } from "vitest";
import {
  getRoleLabel,
  hasPermission,
  parseAccessContext,
  type AccessContext,
} from "./contracts";
import { permittedRoutes, resolveRoute } from "./routes";

const id = "00000000-0000-4000-8000-000000000001";
const manager: AccessContext = {
  id,
  displayName: "Synthetic manager",
  status: "active",
  mustChangePassword: false,
  roles: ["MANAGEMENT"],
  permissions: [
    "dashboard.read",
    "admissions.read",
    "students.read",
    "classes.read",
    "staff.read",
    "financials.read",
    "finance.end_term_invoices.read",
    "finance.outstanding.read",
    "finance.outstanding.print",
    "library.read",
    "reports.read",
  ],
};
const administrator: AccessContext = {
  ...manager,
  displayName: "Synthetic administrator",
  roles: ["ADMINISTRATOR"],
  permissions: [
    "dashboard.read",
    "admissions.read",
    "students.read",
    "students.manage",
    "students.import",
    "students.export",
    "classes.read",
    "staff.read",
    "finance.outstanding.read",
    "finance.outstanding.print",
    "finance.end_term_invoices.read",
    "finance.end_term_invoices.manage",
  ],
};
const accountant: AccessContext = {
  ...manager,
  displayName: "Synthetic accountant",
  roles: ["ACCOUNTANT"],
  permissions: [
    "dashboard.read",
    "students.read",
    "staff.read",
    "financials.read",
    "finance.transactions.manage",
    "finance.end_term_invoices.read",
    "finance.end_term_invoices.manage",
    "finance.settings.manage",
    "finance.outstanding.read",
    "finance.outstanding.print",
    "reports.read",
  ],
};
const librarian: AccessContext = {
  ...manager,
  displayName: "Synthetic librarian",
  roles: ["LIBRARIAN"],
  permissions: ["dashboard.read", "library.read", "library.collections.manage"],
};
describe("permission boundary", () => {
  it("denies absent, pending and disabled actors even with a stale permission list", () => {
    expect(hasPermission(null, "financials.read")).toBe(false);
    for (const status of ["pending", "disabled"] as const)
      expect(hasPermission({ ...manager, status }, "financials.read")).toBe(
        false,
      );
  });
  it("requires an explicit permission rather than inferring grants from a role", () => {
    expect(hasPermission(manager, "financials.read")).toBe(true);
    expect(hasPermission(manager, "administrators.manage")).toBe(false);
    expect(
      hasPermission(
        { ...manager, roles: ["SUPER_ADMIN"], permissions: [] },
        "settings.manage",
      ),
    ).toBe(false);
  });
  it("rejects malformed, mismatched and unrecognized database contracts", () => {
    expect(parseAccessContext(manager, id)).toEqual(manager);
    expect(parseAccessContext(manager, "different-user")).toBeNull();
    expect(
      parseAccessContext({ ...manager, status: "enabled" }, id),
    ).toBeNull();
    expect(
      parseAccessContext({ ...manager, permissions: ["all"] }, id),
    ).toBeNull();
    expect(parseAccessContext(null, id)).toBeNull();
  });
  it("gives Board Members every read-only operational workspace", () => {
    const paths = permittedRoutes(manager).map((route) => route.href);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/admissions",
        "/students",
        "/classes",
        "/staff",
        "/library",
        "/financials",
        "/financials/payments",
        "/financials/outstanding",
        "/financials/end-of-term-invoices",
        "/reports",
        "/settings",
      ]),
    );
    expect(paths).not.toContain("/admissions/new");
    expect(paths).not.toContain("/settings/roles");
    expect(paths).not.toContain("/settings/financials");
    expect(paths).not.toContain("/administrators");
    expect(hasPermission(manager, "students.manage")).toBe(false);
    expect(hasPermission(manager, "finance.transactions.manage")).toBe(false);
    expect(hasPermission(manager, "finance.end_term_invoices.manage")).toBe(
      false,
    );
    expect(hasPermission(manager, "library.collections.manage")).toBe(false);
    expect(permittedRoutes({ ...manager, status: "disabled" })).toEqual([]);
  });
  it("keeps administrator finance access to outstanding and end-term invoices", () => {
    const paths = permittedRoutes(administrator).map((route) => route.href);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/admissions",
        "/admissions/new",
        "/students",
        "/classes",
        "/staff",
        "/financials/outstanding",
        "/financials/end-of-term-invoices",
      ]),
    );
    expect(paths).not.toContain("/financials");
    expect(paths).not.toContain("/financials/payments");
    expect(paths).not.toContain("/settings/financials");
    expect(hasPermission(administrator, "finance.transactions.manage")).toBe(
      false,
    );
    expect(
      hasPermission(administrator, "finance.end_term_invoices.manage"),
    ).toBe(true);
  });
  it("gives accountants read-only people access and the finance workspace", () => {
    const paths = permittedRoutes(accountant).map((route) => route.href);
    expect(paths).toEqual(
      expect.arrayContaining([
        "/students",
        "/staff",
        "/financials",
        "/financials/payments",
        "/financials/outstanding",
        "/financials/end-of-term-invoices",
        "/reports",
        "/settings",
        "/settings/financials",
      ]),
    );
    expect(hasPermission(accountant, "students.manage")).toBe(false);
    expect(hasPermission(accountant, "staff.manage")).toBe(false);
    expect(hasPermission(accountant, "finance.transactions.manage")).toBe(true);
  });
  it("gives every active role its settings landing without widening settings access", () => {
    for (const context of [manager, administrator, accountant, librarian]) {
      expect(permittedRoutes(context).map((route) => route.href)).toContain(
        "/settings",
      );
    }
    expect(permittedRoutes(librarian).map((route) => route.href)).not.toContain(
      "/settings/financials",
    );
    expect(
      permittedRoutes(administrator).map((route) => route.href),
    ).not.toContain("/settings/school");
  });
  it("presents the compatibility role code as Board Member", () => {
    expect(getRoleLabel("MANAGEMENT")).toBe("Board Member");
    expect(getRoleLabel(null)).toBe("Unassigned");
  });
  it("resolves record shells without granting an arbitrary route", () => {
    expect(resolveRoute("/students/demo-001")?.permission).toBe(
      "students.read",
    );
    expect(resolveRoute("/financials/receipts/demo-001")?.phase).toBe(3);
    expect(resolveRoute("/settings/roles")?.permission).toBe(
      "administrators.manage",
    );
    expect(resolveRoute("/financials/outstanding")?.permission).toBe(
      "finance.outstanding.read",
    );
    expect(
      resolveRoute("/financials/end-of-term-invoices/123")?.permission,
    ).toBe("finance.end_term_invoices.read");
    expect(resolveRoute("/settings/financials")?.permission).toBe(
      "finance.settings.manage",
    );
    expect(resolveRoute("/settings")?.permission).toBe("dashboard.read");
    expect(resolveRoute("/unknown")).toBeUndefined();
    expect(resolveRoute("/students/../../settings")).toBeUndefined();
  });
});
