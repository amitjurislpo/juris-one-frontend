import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, expectLanded, login, loginWithCode, OTP, sql } from "./helpers";

/**
 * The multi-business journey: the super admin creates a business and its sub admin, grants Juris Track; the sub
 * admin publishes a policy and adds a new hire; the hire accepts the policy before anything else; and the
 * subscription decides access: not started or cancelled = no sign-in, expired = read-only (view and export only).
 */
const run = Math.random().toString(36).slice(2, 8);
const BUSINESS = `E2E Advisors ${run}`;
const OWNER_EMAIL = `owner.${run}@e2e-advisors.test`;
const WORK_EMAIL = `riya.${run}@e2e-advisors.test`;

const toast = (page: Page) => page.locator(".toast").last();

/** Moves the e2e business's only subscription (SQL date expressions) to test what each state allows. */
async function setSubscriptionDates(starts: string, ends: string) {
  await sql(`UPDATE business_subscriptions SET status = 'ACTIVE', cancelled_at = NULL, starts_on = ${starts}, ends_on = ${ends}
             WHERE business_id = (SELECT id FROM businesses WHERE name = $1)`, [BUSINESS]);
}

async function asOwner(page: Page) {
  await login(page, OWNER_EMAIL);
  await expectLanded(page, "/overview");
}

test.describe.serial("a business on JurisOne, end to end", () => {
  let businessPath = "";

  test("the super admin creates a business with a plan and its sub admin, and grants Juris Track", async ({ page }) => {
    await login(page, ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.getByRole("button", { name: "New business" }).click();
    const dialog = page.getByRole("dialog", { name: "New business" });
    await dialog.getByLabel("Business name").fill(BUSINESS);
    await dialog.getByLabel("Employee ID prefix").fill("EA");
    const [plan] = await sql<{ id: string }>("SELECT id::text FROM subscription_plans WHERE name = 'Standard'");
    await dialog.getByRole("combobox", { name: /^Plan/ }).selectOption(plan.id);
    await dialog.getByLabel("Name", { exact: true }).fill("Esha Owner");
    await dialog.getByLabel(/Email \(signs in with it\)/).fill(OWNER_EMAIL);
    // the phone takes the country's digits only, and must be complete
    await dialog.getByLabel("Phone number", { exact: true }).fill("12345");
    await dialog.getByRole("button", { name: "Create business" }).click();
    await expect(dialog.getByText("India numbers have 10 digits")).toBeVisible();
    await dialog.getByLabel("Phone number", { exact: true }).fill("98765432109999");
    await expect(dialog.getByLabel("Phone number", { exact: true })).toHaveValue("9876543210");
    await dialog.getByRole("button", { name: "Create business" }).click();
    await expect(page).toHaveURL(/\/platform\/[0-9a-f-]{36}$/);
    businessPath = new URL(page.url()).pathname;
    await expect(page.getByRole("heading", { name: BUSINESS })).toBeVisible();
    await expect(page.getByText("Esha Owner")).toBeVisible();
    await expect(page.getByText("Not in the plan. Grant it on its own")).toBeVisible();

    await page.getByRole("button", { name: "Grant Juris Track" }).click();
    const grantDialog = page.getByRole("dialog", { name: "Grant Juris Track" });
    await grantDialog.getByLabel("Notes").fill("Launch partner");
    await grantDialog.getByRole("button", { name: "Grant", exact: true }).click();
    await expect(toast(page)).toContainText("Juris Track granted");
    await expect(page.locator("tr", { hasText: "Launch partner" }).locator(".chip")).toHaveText("Active");
  });

  test("the sub admin runs the business: Juris Track, subscription and a policy everyone must accept", async ({ page }) => {
    await asOwner(page);
    await expect(page.locator(".side")).toContainText(BUSINESS);
    await page.getByRole("link", { name: "Juris Track" }).click();
    await expect(page.getByText("Coming soon")).toBeVisible();
    await page.goto("/subscription");
    await expect(page.getByText("Standard", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Export employees (Excel)" })).toBeVisible();

    await page.goto("/policies");
    await page.getByRole("button", { name: "New policy" }).click();
    await page.getByRole("dialog", { name: "New policy" }).getByLabel("Title").fill("Code of conduct");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/policies\/[0-9a-f-]{36}$/);
    await page.getByLabel(/Policy text/).fill("Be kind.\n\nBe on time.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(toast(page)).toContainText("Draft saved");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
    await expect(toast(page)).toContainText("Version 1 published");
  });

  test("the sub admin adds a new hire (onboarding wizard switched off for this one)", async ({ page }) => {
    await asOwner(page);
    await page.goto("/employees");
    await page.getByRole("button", { name: "Add employee" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("First name *").fill("Riya");
    await dialog.getByLabel("Last name *").fill("Sen");
    await dialog.getByLabel("Father’s name *").fill("Amit Sen");
    await dialog.getByLabel("Work email *").fill(WORK_EMAIL);
    await dialog.getByLabel("Phone number", { exact: true }).fill("9810011223");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel(/PAN/).fill("ABCPS1234K");
    await dialog.getByLabel(/Aadhaar/).fill("2345 6789 0124");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Designation *").fill("Associate");
    await dialog.getByLabel("Department *").selectOption({ label: "Human Resources" });
    await dialog.getByLabel(/Reporting manager/).selectOption({ index: 1 });
    await dialog.getByLabel("Date of joining *").fill("2026-10-01");
    await dialog.getByRole("button", { name: "Create employee" }).click();
    await expect(toast(page)).toContainText("Riya Sen added as");
  });

  test("access on → the new hire signs in with an emailed code → must accept the policy first", async ({ page, browser }) => {
    await asOwner(page);
    await page.goto("/employees");
    await page.getByRole("switch", { name: "Enable portal access for Riya Sen" }).click();
    await expect(toast(page)).toContainText("sign in with the code emailed to their work email");

    const ctx = await browser.newContext();
    const hire = await ctx.newPage();
    await login(hire, WORK_EMAIL);
    await expect(hire).toHaveURL(/\/acknowledge$/, { timeout: 15_000 });
    const popup = hire.getByRole("dialog", { name: "Code of conduct" });
    await expect(popup.getByText("Be on time.")).toBeVisible();
    await hire.goto("/leave"); // no way around it
    await expect(hire).toHaveURL(/\/acknowledge$/);
    await popup.getByRole("checkbox").check();
    await popup.getByRole("button", { name: "I accept" }).click();
    await expect(hire).toHaveURL(/\/home$/, { timeout: 15_000 });
    // the acceptance is on record
    const [ack] = await sql<{ employee_email: string; version: number }>(
      "SELECT employee_email, version FROM policy_acknowledgements WHERE employee_email = $1", [WORK_EMAIL]);
    expect(ack.version).toBe(1);
    // My profile: the work email is shown and locked
    await hire.goto("/profile");
    await expect(hire.getByText(WORK_EMAIL)).toBeVisible();
    await ctx.close();

    // HR sees who accepted
    await page.goto("/policies");
    await expect(page.locator("tr", { hasText: "Code of conduct" })).toContainText("1 / 1");
  });

  test("a subscription that has not started yet: nobody in the business can sign in", async ({ page }) => {
    await setSubscriptionDates("current_date + 5", "current_date + 370");
    await loginWithCode(page, OWNER_EMAIL, OTP);
    await expect(page.getByRole("alert")).toContainText("subscription starts on");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an expired subscription is read-only: sign in, see the data, nothing to change, export still works", async ({ page }) => {
    await setSubscriptionDates("current_date - 400", "current_date - 10");
    await asOwner(page);
    await expect(page.getByText("Your JurisOne subscription has ended")).toBeVisible();
    await page.goto("/employees");
    await expect(page.getByRole("heading", { name: /All\s*employees/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add employee" })).toHaveCount(0);
    await expect(page.getByRole("switch")).toHaveCount(0);
    await page.goto("/subscription");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export employees (Excel)" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    // the API refuses writes too, not just the screen
    expect((await page.request.get("/api/people")).status()).toBe(200);
    const write = await page.request.post("/api/departments", { data: { name: "Sneaky" }, headers: { Origin: "http://localhost:3006" } });
    expect(write.status()).toBe(402);
  });

  test("a cancelled subscription: the business can no longer sign in", async ({ page }) => {
    await setSubscriptionDates("current_date", "current_date + 365");
    await login(page, ADMIN_EMAIL);
    await expectLanded(page, "/platform");
    await page.goto(businessPath);
    await page.getByRole("button", { name: /^Cancel Standard/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel subscription" }).click();
    await expect(toast(page)).toContainText("Subscription cancelled");

    const ctx = await page.context().browser()!.newContext();
    const owner = await ctx.newPage();
    await loginWithCode(owner, OWNER_EMAIL, OTP);
    await expect(owner.getByRole("alert")).toContainText("no active subscription");
    await ctx.close();
  });

});
