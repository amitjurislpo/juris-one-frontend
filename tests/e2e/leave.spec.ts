import { expect, test, type Page } from "@playwright/test";
import { OWNER, expectLanded, login, sql } from "./helpers";

const toast = (page: Page) => page.locator(".toast").last();
const TEST_START_TIME = new Date().toISOString();

/** Put seeded demo requests back exactly as they were. */
async function restore() {
  await sql(`UPDATE leave_requests SET status = 'PENDING', decided_by = NULL, decided_at = NULL WHERE decided_at >= $1`, [TEST_START_TIME]);
  await sql(`UPDATE regularization_requests SET status = 'PENDING', decided_by = NULL, decided_at = NULL, decided_role = NULL WHERE decided_at >= $1`, [TEST_START_TIME]);
  await sql(`DELETE FROM leave_requests WHERE applied_at >= $1`, [TEST_START_TIME]);
  await sql(`DELETE FROM leave_ledger WHERE at >= $1 AND reason <> 'ACCRUAL'`, [TEST_START_TIME]);
  await sql(`DELETE FROM punches WHERE created_at >= $1`, [TEST_START_TIME]);
  await sql(`DELETE FROM notifications WHERE created_at >= $1`, [TEST_START_TIME]);
}

/**
 * October is frozen once the lock day of the next month has passed, and these tests decide October requests. The policy lock day is
 * pushed far out for the run and put back afterwards, so the tests do not depend on today's date.
 */
async function holdMonthsOpen() {
  const [policy] = await sql<{ lockDay: string | null }>(`SELECT value->>'lockDayOfNextMonth' AS "lockDay" FROM settings WHERE key = 'attendance.policy'`);
  await sql(`UPDATE settings SET value = jsonb_set(value, '{lockDayOfNextMonth}', '99') WHERE key = 'attendance.policy'`);
  return async () => {
    if (policy?.lockDay == null) await sql(`UPDATE settings SET value = value - 'lockDayOfNextMonth' WHERE key = 'attendance.policy'`);
    else await sql(`UPDATE settings SET value = jsonb_set(value, '{lockDayOfNextMonth}', $1::jsonb) WHERE key = 'attendance.policy'`, [policy.lockDay]);
  };
}

/**
 * Makes the casual leave JC074 can still take (ledger balance minus what pending requests hold) exactly the given number of days. The
 * accrual job credits a month more every month, so the real balance moves with today's date. The adjustment row is removed by restore().
 */
async function setAvailableCasualLeave(code: string, availableDays: number) {
  const [state] = await sql<{ balance: number; held: number }>(`SELECT
      COALESCE((SELECT sum(l.delta) FROM leave_ledger l WHERE l.employee_id = e.id AND l.leave_type = 'CL'), 0)::float8 AS balance,
      COALESCE((SELECT sum(r.days - r.lop_days) FROM leave_requests r WHERE r.employee_id = e.id AND r.leave_type = 'CL' AND r.status = 'PENDING'), 0)::float8 AS held
    FROM employees e WHERE e.code = $1 AND e.business_id IS NOT NULL`, [code]);
  const adjustment = Math.round((availableDays - (state.balance - state.held)) * 100) / 100;
  await sql(`INSERT INTO leave_ledger (id, employee_id, leave_type, delta, reason, note)
    SELECT gen_random_uuid(), e.id, 'CL', $2::numeric, 'ADJUSTMENT', 'e2e: fixed balance' FROM employees e WHERE e.code = $1 AND e.business_id IS NOT NULL`, [code, adjustment]);
}

/** Picks the first two working days in a row (enabled, consecutive dates) of the month after the current one, so the dates are never in the past. */
async function pickTwoWorkingDaysNextMonth(page: Page) {
  const picker = page.locator(".drp");
  await picker.getByRole("button", { name: "Next month" }).click();
  const buttons = picker.locator(".drp-g button:not([disabled])");
  await expect(buttons.first()).toBeVisible();
  const days = (await buttons.allTextContents()).map(Number);
  const index = days.findIndex((day, position) => days[position + 1] === day + 1);
  expect(index, "two working days in a row in next month").toBeGreaterThanOrEqual(0);
  await buttons.nth(index).click();
  await buttons.nth(index + 1).click();
}

async function ledger(code: string, type: string) {
  const [balance] = await sql<{ total: string | null }>(`SELECT sum(l.delta)::text total FROM leave_ledger l JOIN employees e ON e.id = l.employee_id WHERE e.code = $1 AND l.leave_type = $2`, [code, type]);
  return Number(balance.total ?? 0);
}

const TEST_HOLIDAY_NAME = "E2E Test Holiday";
const MONTH_ABBREVIATIONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const addDays = (isoDate: string, count: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
const weekdayOf = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay(); // 0 = Sunday
const dayOf = (isoDate: string) => Number(isoDate.slice(8));
const shortDate = (isoDate: string) => `${dayOf(isoDate)} ${MONTH_ABBREVIATIONS[Number(isoDate.slice(5, 7)) - 1]}`;

/** The month after the current one (always in the future, so the picker allows every working day in it). */
function nextMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

/** Opens the picker on next month and clicks the first and last day of the range. */
async function pickRangeNextMonth(page: Page, first: string, last: string) {
  const picker = page.locator(".drp");
  const heading = picker.locator(".drp-h b");
  const opening = await heading.textContent();
  await picker.getByRole("button", { name: "Next month" }).click();
  await expect(heading).not.toHaveText(opening ?? "");
  await clickDay(page, first);
  await clickDay(page, last);
}

async function clickDay(page: Page, isoDate: string) {
  await page.locator(".drp-g button", { hasText: new RegExp(`^${dayOf(isoDate)}$`) }).click();
}

test.describe("leave & approvals", () => {
  let putPolicyBack: () => Promise<void>;
  let frozenDays: { id: string }[] = [];
  test.beforeAll(async () => {
    await restore();
    putPolicyBack = await holdMonthsOpen();
  });
  test.afterAll(async () => {
    if (frozenDays.length) await sql(`UPDATE attendance_days SET locked = true WHERE work_date IN ('2026-10-21', '2026-10-22') AND employee_id = $1`, [frozenDays[0].id]);
    await sql(`DELETE FROM holidays WHERE name = $1`, [TEST_HOLIDAY_NAME]);
    await putPolicyBack();
    await restore();
  });

  test("apply: holidays skipped, live summary, max stretch, then cancel", async ({ page }) => {
    // The dates are worked out from next month's calendar so the test never expires: Fri → Tue over a weekend and a test holiday on the
    // Monday (2 working days), a Mon–Fri week with no holiday (5 days: over the 3-day limit of casual leave), and two days in a row to apply for.
    const monthStart = nextMonthStart();
    const monthEnd = addDays(new Date(Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)), 1)).toISOString().slice(0, 10), -1);
    const existing = new Set((await sql<{ date: string }>(`SELECT to_char(date, 'YYYY-MM-DD') AS date FROM holidays WHERE date >= $1 AND date <= $2`, [monthStart, monthEnd])).map((row) => row.date));
    const isFree = (first: string, count: number) => Array.from({ length: count }, (_, i) => addDays(first, i)).every((day) => !existing.has(day));
    const weeks = (weekday: number) => {
      const found: string[] = [];
      for (let day = monthStart; day <= monthEnd; day = addDays(day, 1)) if (weekdayOf(day) === weekday && addDays(day, 4) <= monthEnd) found.push(day);
      return found;
    };
    const friday = weeks(5).find((candidate) => isFree(candidate, 5));
    expect(friday, "a Friday with a free week after it next month").toBeDefined();
    const holidayRange = { first: friday!, holiday: addDays(friday!, 3), last: addDays(friday!, 4) };
    const week = weeks(1).find((monday) => isFree(monday, 5) && (addDays(monday, 4) < holidayRange.first || monday > holidayRange.last));
    expect(week, "a free Monday–Friday week next month").toBeDefined();
    const twoDays = { first: addDays(week!, 1), last: addDays(week!, 2) };
    await sql(`DELETE FROM holidays WHERE name = $1`, [TEST_HOLIDAY_NAME]);
    await sql(`INSERT INTO holidays (id, date, name, region, business_id) SELECT gen_random_uuid(), $1::date, $2, 'ALL', e.business_id FROM employees e WHERE e.code = 'JC072'`, [holidayRange.holiday, TEST_HOLIDAY_NAME]);

    await login(page, "JC072");
    await expectLanded(page, "/home");
    await page.goto("/leave?apply=1");
    const dialog = page.getByRole("dialog", { name: "Apply for leave" });
    await expect(dialog).toBeVisible();
    // Friday → Tuesday: Sat/Sun skipped, the Monday is a holiday → 2 working days
    await pickRangeNextMonth(page, holidayRange.first, holidayRange.last);
    await expect(dialog.locator(".summary div").first()).toContainText("2");
    await expect(dialog.getByText(new RegExp(`Holidays skipped: ${TEST_HOLIDAY_NAME}`))).toBeVisible();
    // casual leave is max 3 days at a stretch
    await clickDay(page, week!);
    await clickDay(page, addDays(week!, 4));
    await expect(dialog.getByText("Casual leave can be taken for at most 3 days at a stretch.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Apply leave" })).toBeDisabled();
    await clickDay(page, twoDays.first);
    await clickDay(page, twoDays.last);
    await dialog.getByLabel(/Reason/).fill("E2E family visit");
    await dialog.getByRole("button", { name: "Apply leave" }).click();
    await expect(toast(page)).toContainText(`Casual leave for 2 days (${shortDate(twoDays.first)} – ${shortDate(twoDays.last)}) sent to HR`);
    const row = page.locator("tbody tr", { hasText: "E2E family visit" });
    await expect(row.locator(".chip")).toHaveText("Pending");
    await row.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Cancel request" }).click();
    await expect(toast(page)).toContainText("cancelled");
    await expect(row.locator(".chip")).toHaveText("Cancelled");
  });

  test("short balance turns the rest into loss of pay", async ({ page }) => {
    // 0.77 days left after the pending request: half-day steps pay 0.5 of the two days, so 1.5 are unpaid (whatever month it is today)
    await setAvailableCasualLeave("JC074", 0.77);
    await login(page, "JC074");
    await expectLanded(page, "/home");
    await page.goto("/leave?apply=1");
    const dialog = page.getByRole("dialog", { name: "Apply for leave" });
    await pickTwoWorkingDaysNextMonth(page);
    await expect(dialog.getByText(/You don't have enough casual leave — 1\.5 day\(s\) will be unpaid/)).toBeVisible();
  });

  test("HR approves leave: ledger, notification and email; nobody decides their own", async ({ page }) => {
    // once October has been locked by the monthly job its days are frozen and a later approval cannot show; open 21–22 Oct again (put back in afterAll)
    frozenDays = await sql<{ id: string }>(`SELECT d.employee_id AS id FROM attendance_days d JOIN employees e ON e.id = d.employee_id
      WHERE e.code = 'JC049' AND d.work_date IN ('2026-10-21', '2026-10-22') AND d.locked`);
    await sql(`UPDATE attendance_days SET locked = false WHERE work_date IN ('2026-10-21', '2026-10-22') AND employee_id IN (SELECT id FROM employees WHERE code = 'JC049')`);
    const before = await ledger("JC049", "CL");
    await login(page, "JC015"); // HR Executive
    await expectLanded(page, "/home");
    await page.goto("/approvals?tab=leave");
    const card = page.locator("article.req", { hasText: "Naman Tyagi" });
    await expect(card).toContainText("21 Oct – 22 Oct · 2 days");
    await expect(card).toContainText(/Balance [\d.]+ → [\d.]+/);
    await card.getByRole("button", { name: /Approve/ }).click();
    await expect(toast(page)).toContainText("Approved Naman Tyagi’s casual leave");
    await expect(page.getByText("Decided · last 30 days")).toBeVisible();
    expect(await ledger("JC049", "CL")).toBeCloseTo(before - 2, 2);
    const mail = await sql(`SELECT 1 FROM email_outbox WHERE "to" = 'naman.tyagi@jurislpo.com' AND subject LIKE 'Casual leave%approved' AND created_at >= $1`, [TEST_START_TIME]);
    expect(mail.length).toBe(1);

    await page.context().clearCookies();
    await login(page, "JC049");
    await expectLanded(page, "/home");
    await page.getByRole("button", { name: /Notifications/ }).click();
    await expect(page.locator(".notif")).toContainText("Casual leave (21 Oct – 22 Oct) approved by Pooja Nair");
    await page.goto("/attendance?view=calendar&month=2026-10&date=2026-10-21");
    await expect(page.locator(".chip", { hasText: "Casual leave" }).first()).toBeVisible();
  });

  test("regularization: HR approves a missed check-out; the first decision wins (Admin is second)", async ({ page, browser }) => {
    await login(page, "JC012"); // HR Manager
    await expectLanded(page, "/home");
    await page.goto("/approvals?tab=regularizations");
    const card = page.locator("article.req", { hasText: "Siddharth Krishna" });
    await expect(card).toContainText("asks to set check-out to 4:36 AM");

    // Admin has the same request open in another browser
    const adminPage = await browser.newPage();
    await login(adminPage, OWNER);
    await expectLanded(adminPage, "/overview");
    await adminPage.goto("/approvals?tab=regularizations");
    const adminCard = adminPage.locator("article.req", { hasText: "Siddharth Krishna" });
    await expect(adminCard).toBeVisible();

    await card.getByRole("button", { name: /Approve/ }).click();
    await expect(toast(page)).toContainText("Approved Siddharth Krishna");
    const punches = await sql(`SELECT 1 FROM punches WHERE source = 'REGULARIZATION' AND created_at >= $1`, [TEST_START_TIME]);
    expect(punches.length).toBe(1);

    await adminCard.getByRole("button", { name: "Decline" }).click();
    const dialog = adminPage.getByRole("dialog");
    await dialog.getByLabel(/Note to the employee/).fill("Too late");
    await dialog.getByRole("button", { name: "Decline" }).click();
    await expect(adminPage.locator(".toast").last()).toContainText("decided");
    await adminPage.close();
    const [regularization] = await sql<{ status: string; decided_role: string }>(`SELECT status, decided_role FROM regularization_requests WHERE kind = 'MISSED_CHECKOUT' AND work_date = '2026-10-01'`);
    expect(regularization).toEqual({ status: "APPROVED", decided_role: "HR Manager" });
  });

  test("holiday work earns a comp-off; Admin can approve too", async ({ page }) => {
    const before = await ledger("JC049", "CO");
    await login(page, OWNER);
    await expectLanded(page, "/overview");
    await page.goto("/approvals?tab=regularizations");
    const card = page.locator("article.req", { hasText: "Holiday work" });
    await expect(card).toContainText("Worked 8h 40m on Gandhi Jayanti");
    await card.getByRole("button", { name: /Approve/ }).click();
    await expect(toast(page)).toContainText("1 comp-off credited");
    expect(await ledger("JC049", "CO")).toBe(before + 1);
  });

  test("approvals are permission-gated", async ({ page }) => {
    await login(page, "JC074");
    await expectLanded(page, "/home");
    await page.goto("/approvals");
    await expectLanded(page, "/home");
  });
});
