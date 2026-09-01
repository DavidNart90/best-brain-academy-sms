import { describe, expect, it } from "vitest";
import {
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
  permissions: ["dashboard.read", "financials.read", "reports.read"],
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
  it("excludes unauthorized navigation including direct child links", () => {
    const paths = permittedRoutes(manager).map((route) => route.href);
    expect(paths).toContain("/financials/payments");
    expect(paths).not.toContain("/settings/roles");
    expect(paths).not.toContain("/students");
    expect(permittedRoutes({ ...manager, status: "disabled" })).toEqual([]);
  });
  it("resolves record shells without granting an arbitrary route", () => {
    expect(resolveRoute("/students/demo-001")?.permission).toBe(
      "students.read",
    );
    expect(resolveRoute("/financials/receipts/demo-001")?.phase).toBe(3);
    expect(resolveRoute("/settings/roles")?.permission).toBe(
      "administrators.manage",
    );
    expect(resolveRoute("/unknown")).toBeUndefined();
    expect(resolveRoute("/students/../../settings")).toBeUndefined();
  });
});
