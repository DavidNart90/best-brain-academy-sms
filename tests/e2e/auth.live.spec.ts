import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ExcelJS from "exceljs";

async function signInAllowed(page: import("@playwright/test").Page) {
  const email = process.env.TEST_ALLOWED_EMAIL;
  const password = process.env.TEST_ALLOWED_PASSWORD;
  if (!email || !password) throw new Error("Missing isolated Auth credentials");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("provisioned staff can sign in through real Supabase and log out", async ({
  page,
}) => {
  const email = process.env.TEST_ALLOWED_EMAIL;
  const password = process.env.TEST_ALLOWED_PASSWORD;
  if (!email || !password) throw new Error("Missing isolated Auth credentials");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/financials/payments");
  await expect(page).toHaveURL(/\/login$/);
});

test("authorized staff can review a student profile and open validated history actions", async ({
  page,
}) => {
  await signInAllowed(page);
  await page.goto("/students");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/students\/\d+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Financial account · Phase 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Guardians" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Enrollment history" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Link guardian" }).click();
  await page.getByRole("button", { name: "Save guardian" }).click();
  await expect(page.getByText("Guardian name is required.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/student-profile-${viewport.name}.png`,
      fullPage: true,
    });
  }
});

test("authorized administrator can validate import rows and manage a staff assignment without creating login access", async ({
  page,
}) => {
  await signInAllowed(page);
  await page.goto("/staff");
  await expect(
    page.getByRole("heading", { name: "Staff", exact: true }),
  ).toBeVisible();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Staff");
  sheet.addRow([
    "Staff ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Phone",
    "Email",
    "Staff Type",
    "Position",
    "Assigned Class",
    "Status",
  ]);
  const duplicateId = `BBA/STF/DUP/${Date.now()}`;
  sheet.addRow([
    duplicateId,
    "Ama",
    "",
    "Mensah",
    "0240000001",
    "",
    "Teaching",
    "Teacher",
    "",
    "Active",
  ]);
  sheet.addRow([
    duplicateId,
    "Kojo",
    "",
    "Asare",
    "0240000002",
    "",
    "Teaching",
    "Teacher",
    "",
    "Active",
  ]);
  const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  await page.getByRole("button", { name: "Import Staff" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "staff-duplicate-preview.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: bytes,
  });
  await page.getByRole("button", { name: "Preview file" }).click();
  await expect(
    page.getByText("0 valid · 2 with errors · 2 duplicates"),
  ).toBeVisible();
  await expect(page.getByText("Fix errors and preview again")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and import" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page
    .getByRole("link", { name: /Add staff/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Add staff member" }).click();
  await expect(
    page.getByText("Use 3–40 letters, numbers, slashes or hyphens."),
  ).toBeVisible();
  await page.goto("/staff");

  const staffId = `BBA/STF/E2E/${Date.now()}`;
  const validWorkbook = new ExcelJS.Workbook();
  const validSheet = validWorkbook.addWorksheet("Staff");
  validSheet.addRow([
    "Staff ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Phone",
    "Email",
    "Staff Type",
    "Position",
    "Assigned Class",
    "Status",
  ]);
  validSheet.addRow([
    staffId,
    "Esi",
    "",
    "Owusu",
    "0241234567",
    "",
    "Teaching",
    "Class Teacher",
    "",
    "Active",
  ]);
  await page.getByRole("button", { name: "Import Staff" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "staff-valid-import.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await validWorkbook.xlsx.writeBuffer()),
  });
  await page.getByRole("button", { name: "Preview file" }).click();
  await expect(
    page.getByText("1 valid · 0 with errors · 0 duplicates"),
  ).toBeVisible();
  await expect(page.getByText("Ready to confirm")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and import" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm and import" }).click();
  await expect(
    page.getByRole("heading", { name: "Import complete" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
  await page
    .getByRole("row")
    .filter({ hasText: staffId })
    .getByRole("link", { name: "Esi Owusu" })
    .click();
  await expect(page).toHaveURL(/\/staff\/\d+$/);
  await expect(
    page.getByText("This staff profile is not a login."),
  ).toBeVisible();

  await page.getByLabel("Class", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add assignment" }).click();
  await expect(
    page.getByText("Class assignment added and history preserved."),
  ).toBeVisible();
  const endButton = page.getByRole("button", { name: /^End / });
  await expect(endButton).toBeVisible();
  await endButton.click();
  await expect(
    page.getByText("Assignment ended; its history remains available."),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive staff record" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("authorized administrator can review accounts and preview invitations while MFA protects writes", async ({
  page,
}) => {
  await signInAllowed(page);
  await page.goto("/administrators");
  await expect(
    page.getByRole("heading", { name: "Administrators", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Administrator directory" }),
  ).toBeVisible();
  await expect(page.getByText("MFA required for access changes")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set up MFA" })).toBeVisible();

  await page.getByRole("button", { name: "Add Administrator" }).click();
  await page.getByLabel("Full name").fill("MFA Gate Check");
  await page.getByLabel("Email").fill(`no-send-${Date.now()}@example.invalid`);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(
    page.getByText("Verify with MFA before inviting administrators."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Administrators");
  sheet.addRow(["Full Name", "Email", "Phone", "Role", "Status"]);
  sheet.addRow([
    "Ama Mensah",
    "duplicate@example.invalid",
    "0240000001",
    "Administrator",
    "Active",
  ]);
  sheet.addRow([
    "Kojo Asare",
    "duplicate@example.invalid",
    "0240000002",
    "Accountant",
    "Active",
  ]);
  await page.getByRole("button", { name: "Import Administrators" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "administrator-duplicate-preview.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  await page.getByRole("button", { name: "Preview file" }).click();
  await expect(
    page.getByText("0 valid · 2 with errors · 2 duplicates"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and import" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page
    .getByPlaceholder("Search name, email or phone")
    .fill("no-account-can-match-this");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByText("No administrators match this search"),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

for (const actor of ["DENIED", "DISABLED"]) {
  test(`${actor.toLowerCase()} account is denied by the real provider and application`, async ({
    page,
  }) => {
    const email = process.env[`TEST_${actor}_EMAIL`];
    const password = process.env[`TEST_${actor}_PASSWORD`];
    if (!email || !password)
      throw new Error("Missing isolated Auth credentials");
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText(
        "Your account does not have access. Contact your school administrator.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
}
