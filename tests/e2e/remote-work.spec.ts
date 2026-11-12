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
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    // HR (HR Manager) sees it under Team
    const hrPage = await browser.newPage();
    await login(hrPage, "JC012");
    await expectLanded(hrPage, "/home");
    await hrPage.goto("/attendance?tab=remote-work&scope=team");
    const row = hrPage.locator("tbody tr", { hasText: "Internet repair at home" });
    await expect(row).toContainText("JC074");
    await row.click();
    await hrPage.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(toast(hrPage)).toContainText("Approved");

    const [request] = await sql<{ status: string; decided_role: string }>(`SELECT status, decided_role FROM remote_work_requests WHERE reason = 'Internet repair at home' AND created_at >= $1`, [TEST_START_TIME]);
    expect(request).toEqual({ status: "APPROVED", decided_role: "HR Manager" });
    await hrPage.close();

    // the employee sees the decision
    await page.reload();
    await expect(page.locator("tbody tr", { hasText: "Internet repair at home" })).toContainText("Approved");
  });

  test("HR raises remote work for an employee from the Request menu and it is approved at once", async ({ page }) => {
    const fromDate = isoDaysFromNow(40);
    const [employee] = await sql<{ fullName: string }>(`SELECT full_name AS "fullName" FROM employees WHERE code = 'JC074'`);

    await login(page, "JC012");
    await expectLanded(page, "/home");
    await page.goto("/attendance");
    await page.getByRole("button", { name: "Request", exact: true }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Regularization", "On Duty", "Remote Work"]);
    await page.getByRole("menuitem", { name: "Remote Work" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Search by employee").fill(employee.fullName.slice(0, 5));
    await dialog.getByRole("button", { name: employee.fullName }).click();
    await dialog.getByLabel(/^From/).fill(fromDate);
    await dialog.getByLabel(/^To/).fill(fromDate);
    await dialog.getByLabel(/^Reason/).fill("Raised by HR for the employee");
    await dialog.getByRole("button", { name: "Add for the employee" }).click();
    await expect(toast(page)).toContainText("Remote work request added successfully");

    const [request] = await sql<{ status: string; decided_role: string; code: string }>(
      `SELECT r.status, r.decided_role, e.code FROM remote_work_requests r JOIN employees e ON e.id = r.employee_id WHERE r.reason = 'Raised by HR for the employee' AND r.created_at >= $1`, [TEST_START_TIME]);
    expect(request).toEqual({ status: "APPROVED", decided_role: "HR Manager", code: "JC074" });

    // an ordinary employee has no employee picker
    const employeePage = await page.context().browser()!.newPage();
    await login(employeePage, "JC074");
    await expectLanded(employeePage, "/home");
    await employeePage.goto("/attendance");
    await employeePage.getByRole("button", { name: "Request", exact: true }).click();
    await employeePage.getByRole("menuitem", { name: "On Duty" }).click();
    await expect(employeePage.getByRole("dialog").getByPlaceholder("Search by employee")).toHaveCount(0);
    await employeePage.close();
  });
});
