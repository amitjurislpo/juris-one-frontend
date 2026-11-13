import { expect, test, type Page } from "@playwright/test";
import { expectLanded, login, sql } from "./helpers";

const toast = (page: Page) => page.locator(".toast").last();

test.describe("shift roster", () => {
  test.afterAll(async () => {
    await sql(`DELETE FROM shift_assignments WHERE shift_id IN (SELECT id FROM shifts WHERE name LIKE 'E2E %')`);
    await sql(`DELETE FROM shifts WHERE name LIKE 'E2E %'`);
  });

  test("HR makes a shift, puts an employee on it, and the employee sees it on their own roster", async ({ page, browser }) => {
    await login(page, "JC012"); // HR
    await expectLanded(page, "/home");
    await page.goto("/attendance?tab=shift");
    await expect(page.getByRole("heading", { name: /Shift/ }).first()).toBeVisible();
    await expect(page.locator(".roster-grid")).toBeVisible();

    await page.getByRole("button", { name: "Manage shifts" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("E2E Evening");
    await dialog.getByLabel("Starts").fill("14:00");
    await dialog.getByLabel("Ends").fill("23:00");
    await dialog.getByRole("button", { name: "Add shift" }).click();
    await expect(toast(page)).toContainText("Shift created");
    await dialog.getByRole("button", { name: "Close" }).last().click();

    await page.getByRole("button", { name: "Assign shift" }).click();
    const assignDialog = page.getByRole("dialog");
    await assignDialog.locator("select").selectOption({ label: "E2E Evening · 2:00 PM – 11:00 PM" });
    await assignDialog.getByLabel("Search employees").fill("JC074");
    await assignDialog.getByRole("checkbox", { name: /JC074/ }).check();
    await assignDialog.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.locator(".toast").last()).toContainText("1 employee assigned");
    await expect(page.locator(".roster-grid")).toContainText("E2E Evening");

    // the same shift again for the same days is refused as a whole
    await page.getByRole("button", { name: "Assign shift" }).click();
    const again = page.getByRole("dialog");
    await again.locator("select").selectOption({ label: "E2E Evening · 2:00 PM – 11:00 PM" });
    await again.getByLabel("Search employees").fill("JC074");
    await again.getByRole("checkbox", { name: /JC074/ }).check();
    await again.getByRole("button", { name: "Assign", exact: true }).click();
    await expect(page.locator(".toast").last()).toContainText("Already on a shift");
    await again.getByRole("button", { name: "Cancel" }).click();

    // the employee sees only their own row, and no management buttons
    const employeePage = await browser.newPage();
    await login(employeePage, "JC074");
    await expectLanded(employeePage, "/home");
    await employeePage.goto("/attendance?tab=shift");
    await expect(employeePage.locator(".roster-grid tbody tr")).toHaveCount(1);
    await expect(employeePage.locator(".roster-grid")).toContainText("E2E Evening");
    await expect(employeePage.getByRole("button", { name: "Assign shift" })).toHaveCount(0);
    await employeePage.close();

    // HR removes the assignment again
    await page.locator(".roster-cell-button").first().click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.locator(".toast").last()).toContainText("removed");
    await expect(page.locator(".roster-grid")).not.toContainText("E2E Evening");
  });
});
