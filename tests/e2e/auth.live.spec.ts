import { test, expect } from "@playwright/test";

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

for (const actor of ["DENIED", "DISABLED"]) {
  test(`${actor.toLowerCase()} account is denied by the real provider and application`, async ({
    page,
  }) => {
    const email = process.env[`TEST_${actor}_EMAIL`];
    const password = process.env[`TEST_${actor}_PASSWORD`];
    if (!email || !password) throw new Error("Missing isolated Auth credentials");
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
