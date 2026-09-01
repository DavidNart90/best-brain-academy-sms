import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

const fixtureUrl = `http://127.0.0.1:${process.env.E2E_AUTH_PORT ?? "54329"}`;

async function login(page: Page, actor = "super") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`${actor}@example.invalid`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-test-only-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("anonymous routes and direct API access are denied; login is accessible", async ({
  page,
  request,
}) => {
  await page.goto("/financials/payments");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sign up/i })).toHaveCount(0);
  const response = await request.get("/api/access");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("heading", { name: "Welcome back" }).click();
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("failed, rate-limited and disabled sign-in produce safe errors", async ({
  page,
}) => {
  for (const actor of ["unknown", "limited", "disabled", "unassigned"]) {
    await login(page, actor);
    await expect(
      page.getByRole("alert").filter({
        hasText:
          /Unable to sign in|Too many sign-in attempts|Your account does not have access/,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("synthetic dashboard, filters, navigation, responsive layout and logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Demo data only.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: /Synthetic monthly collections/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const measurements = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    return {
      navigationDurationMs: navigation?.duration,
      resourceRequests: resources.length,
      transferredBytes: resources.reduce(
        (total, resource) =>
          total +
          (resource instanceof PerformanceResourceTiming
            ? resource.transferSize
            : 0),
        0,
      ),
      decodedBytes: resources.reduce(
        (total, resource) =>
          total +
          (resource instanceof PerformanceResourceTiming
            ? resource.decodedBodySize
            : 0),
        0,
      ),
      viewport: { width: innerWidth, height: innerHeight },
      scope:
        "Warm local production reload; synthetic Auth and five demo rows. Not a Core Web Vitals or real backend benchmark.",
    };
  });
  await test.info().attach("local-network-baseline", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  await writeFile(
    `test-results/network-${test.info().project.name}.json`,
    JSON.stringify(measurements, null, 2),
  );
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Partially Paid");
  await expect(page.getByText("Showing 2 of 5 demo records")).toBeVisible();
  await page.getByLabel("Student or ID").fill("missing");
  await expect(
    page.getByText("No demo records match your filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Showing 5 of 5 demo records")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("heading", { name: "Dashboard", exact: true }).click();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  if (test.info().project.name !== "desktop") {
    const tableRegion = page.getByRole("region", {
      name: "Scrollable records",
    });
    await tableRegion.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => tableRegion.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.getByRole("link", { name: "Students", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your student directory is ready" }),
  ).toBeVisible();
  await page.goto("/financials/payments");
  await expect(
    page.getByRole("heading", { name: "Payments", exact: true }),
  ).toBeVisible();
  if (test.info().project.name !== "desktop")
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});

test("account disablement and access-service errors fail closed", async ({
  page,
  request,
}) => {
  await login(page, "manager");
  await expect(page).toHaveURL(/\/dashboard$/);
  await request.post(`${fixtureUrl}/control`, {
    data: { email: "manager@example.invalid", action: "disable" },
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?notice=access$/);
  await login(page, "super");
  await expect(page).toHaveURL(/\/dashboard$/);
  await request.post(`${fixtureUrl}/control`, {
    data: { email: "super@example.invalid", action: "fail-access" },
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The workspace couldn’t be loaded" }),
  ).toBeVisible();
  expect((await page.request.get("/api/access")).status()).toBe(503);
});

test("documented module and record shells remain unavailable for business work", async ({
  page,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  const paths = [
    "/admissions",
    "/admissions/demo-001",
    "/classes/demo-001",
    "/financials",
    "/financials/fees",
    "/financials/invoices",
    "/financials/invoices/demo-001",
    "/financials/payments",
    "/financials/receipts",
    "/financials/receipts/demo-001",
    "/financials/outstanding",
    "/financials/expenses",
    "/financials/salary-deductions",
    "/reports",
    "/settings/financial",
    "/settings/roles",
  ];
  for (const path of paths) {
    await page.goto(path);
    await expect(
      page.getByText("This workspace is not available yet"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Record Payment|Save Changes|Generate Invoice/,
      }),
    ).toHaveCount(0);
  }
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("student empty state, template, import confirmation and onboarding validation", async ({
  page,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/students");
  await expect(
    page.getByRole("heading", { name: "Students", exact: true }),
  ).toBeVisible();
  await expect(page.locator("ol > li h3").allTextContents()).resolves.toEqual([
    "Add Student",
    "Download Excel Template",
    "Import Students",
  ]);

  const template = await page.request.get("/api/students/template");
  expect(template.status()).toBe(200);
  expect(template.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  await page.getByRole("button", { name: "Import Students" }).click();
  await expect(
    page.getByRole("heading", { name: "Import students" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and import" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/admissions/new");
  await expect(page).toHaveURL(/\/students\/new$/);
  await expect(
    page.getByRole("heading", { name: "Add student", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  await expect(page.getByText("First name is required.")).toBeVisible();
  await expect(page.getByText("Last name is required.")).toBeVisible();
  await expect(page.getByText("Guardian name is required.")).toBeVisible();
  await expect(
    page.getByText("Religious denomination is required."),
  ).toBeVisible();
  await page
    .getByLabel("Does the student have a disability?")
    .selectOption("yes");
  await expect(page.getByLabel("Disability details")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("heading", { name: "Add student", exact: true }).click();
  await page.screenshot({
    path: `test-results/student-onboarding-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("academic configuration renders approved classes, terms and locations", async ({
  page,
}) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/classes");
  await expect(
    page.getByRole("heading", { name: "Class catalogue" }),
  ).toBeVisible();
  await expect(page.getByText("13 matching classes")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Nursery 1" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "JHS 3" })).toBeVisible();
  await page.getByLabel("Class name").fill("Basic");
  await expect(page).toHaveURL(/\/classes\?q=Basic$/);
  await expect(page.getByText("6 matching classes")).toBeVisible();

  await page.goto("/settings/academics");
  await expect(
    page.getByRole("heading", { name: "Academic settings" }),
  ).toBeVisible();
  await expect(page.getByText("2026/2027").first()).toBeVisible();
  await expect(page.getByText("8 Sept 2026").first()).toBeVisible();
  await expect(page.getByText("Dates can be added when confirmed")).toHaveCount(
    2,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto("/settings/school");
  await expect(
    page.getByRole("heading", { name: "School locations" }),
  ).toBeVisible();
  for (const location of [
    "Osenase & Akwadum",
    "Asuofori",
    "Kobriso & Abaase",
    "Anomaa Kojo",
    "Bamenase",
  ])
    await expect(page.getByText(location, { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("management cannot open administrator shells or gain access through URL role spoofing", async ({
  page,
}) => {
  await login(page, "manager");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/administrators?role=SUPER_ADMIN");
  await expect(
    page.getByRole("heading", { name: "You don’t have access to this page" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Administrators", exact: true }),
  ).toHaveCount(0);
  await page.goto("/settings/roles");
  await expect(
    page.getByRole("heading", { name: "You don’t have access to this page" }),
  ).toBeVisible();
  await page.goto("/settings/academics");
  await expect(
    page.getByRole("heading", { name: "You don’t have access to this page" }),
  ).toBeVisible();
});

test("revoked sessions and removed permissions are rechecked on the server", async ({
  page,
  request,
}) => {
  await login(page, "manager");
  await expect(page).toHaveURL(/\/dashboard$/);
  await request.post(`${fixtureUrl}/control`, {
    data: { email: "manager@example.invalid", action: "remove-permissions" },
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You don’t have access to this page" }),
  ).toBeVisible();
  expect((await page.request.get("/api/access")).status()).toBe(403);
  await request.post(`${fixtureUrl}/control`, {
    data: { email: "manager@example.invalid", action: "revoke" },
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
