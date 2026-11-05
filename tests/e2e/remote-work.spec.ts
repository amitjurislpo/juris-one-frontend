import { expect, test, type Page } from "@playwright/test";
import { expectLanded, login, sql } from "./helpers";

const toast = (page: Page) => page.locator(".toast").last();
const TEST_START_TIME = new Date().toISOString();

const isoDaysFromNow = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);

test.describe("remote work requests", () => {
  test.afterAll(async () => {
    await sql(`DELETE FROM remote_work_requests WHERE created_at >= $1`, [TEST_START_TIME]);
  });

  test("an employee asks for two remote days, HR approves it in the Team tab", async ({ page, browser }) => {
    const fromDate = isoDaysFromNow(20);
    const toDate = isoDaysFromNow(21);

    await login(page, "JC074");
    await expectLanded(page, "/home");
    await page.goto("/attendance?tab=remote-work");
    await expect(page.getByRole("heading", { name: /Remote work/ })).toBeVisible();
    await page.getByRole("button", { name: "Add request" }).click();
    await page.getByLabel(/^From/).fill(fromDate);
    await page.getByLabel(/^To/).fill(toDate);
    await expect(page.getByText("2 days")).toBeVisible();
    await page.getByLabel(/^Reason/).fill("Internet repair at home");
    await page.getByRole("button", { name: "Send for approval" }).click();
    await expect(toast(page)).toContainText("Remote work request added successfully");
    await expect(page.locator("tbody tr", { hasText: "Internet repair at home" })).toContainText("Waiting for approval");

    // the same days again are refused
    await page.getByRole("button", { name: "Add request" }).click();
    await page.getByLabel(/^From/).fill(fromDate);
    await page.getByLabel(/^To/).fill(fromDate);
    await page.getByLabel(/^Reason/).fill("Again");
    await page.getByRole("button", { name: "Send for approval" }).click();
    await expect(page.getByRole("alert")).toContainText("already have a remote work request");
    await page.getByRole("button", { name: "Cancel" }).click();

    // HR (HR Manager) sees it under Team
    const hrPage = await browser.newPage();
    await login(hrPage, "JC012");
    await expectLanded(hrPage, "/home");
    await hrPage.goto("/attendance?tab=remote-work&scope=team");
    const row = hrPage.locator("tbody tr", { hasText: "Internet repair at home" });
    await expect(row).toContainText("JC074");
    await row.click();
    await hrPage.getByRole("button", { name: "Approve" }).click();
    await expect(toast(hrPage)).toContainText("Approved");

    const [request] = await sql<{ status: string; decided_role: string }>(`SELECT status, decided_role FROM remote_work_requests WHERE reason = 'Internet repair at home' AND created_at >= $1`, [TEST_START_TIME]);
    expect(request).toEqual({ status: "APPROVED", decided_role: "HR Manager" });
    await hrPage.close();

    // the employee sees the decision
    await page.reload();
    await expect(page.locator("tbody tr", { hasText: "Internet repair at home" })).toContainText("Approved");
  });
});
