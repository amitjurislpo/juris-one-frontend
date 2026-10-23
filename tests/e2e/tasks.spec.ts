import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectLanded, login, OWNER, sql } from "./helpers";

/**
 * Task management (T1): the Tasks menu, projects and their visibility, the board (mouse drag and the keyboard Move
 * menu), both assignees and their rights, comments with mentions and the bell, Team tasks, attachments, read-only after
 * the subscription ends, the phone layout and Hindi.
 *
 * The flow builds its own private project "E2E Ops" (the Owner creates it; Nazneen JC-035 owns it with him, Siddharth
 * JC-072 — one of her reports — and Riya JC-012 are members). Checks that need the demo task seed (backend plan §16:
 * People operations PEO, Website relaunch WEB, Payroll October PAY) run only when that seed is there. Rows this file
 * creates carry "E2E" in their title, name or key and are removed afterwards.
 */
const TEST_START_TIME = new Date().toISOString();
const RUN = String(Date.now() % 100000);
const TASK_TITLE = `E2E task ${RUN} fix the login page`;
const SECOND_TITLE = `E2E task ${RUN} second card`;
const PROJECT_NAME = `E2E Ops ${RUN}`;
const PROJECT_KEY = "E2EO";
const PNG = Buffer.from("89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C63F8FFFF3F0005FE02FEA7D6A4E30000000049454E44AE426082", "hex");

const toast = (page: Page) => page.locator(".toast").last();
const menu = (page: Page) => page.getByRole("complementary", { name: "Main menu" });
const dateIn = (offsetDays: number, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offsetDays * 86_400_000));

let taskKey = "";

async function hasDemoTaskSeed() {
  return (await sql("SELECT 1 FROM projects WHERE key IN ('PEO', 'PAY') AND deleted_at IS NULL")).length === 2;
}

async function cleanup() {
  const ids = "SELECT id FROM tasks WHERE title LIKE 'E2E task %'";
  const projectIds = `SELECT id FROM projects WHERE key = '${PROJECT_KEY}' OR name LIKE 'E2E Ops %'`;
  await sql(`DELETE FROM task_activity WHERE task_id IN (${ids}) OR project_id IN (${projectIds})`);
  await sql(`DELETE FROM tasks WHERE parent_task_id IN (${ids})`);
  await sql(`DELETE FROM tasks WHERE title LIKE 'E2E task %' OR project_id IN (${projectIds})`);
  await sql(`DELETE FROM task_labels WHERE project_id IN (${projectIds})`);
  await sql(`DELETE FROM task_statuses WHERE project_id IN (${projectIds})`);
  await sql(`DELETE FROM project_members WHERE project_id IN (${projectIds})`);
  await sql(`DELETE FROM projects WHERE id IN (${projectIds})`);
  await sql("DELETE FROM notifications WHERE created_at >= $1", [TEST_START_TIME]);
}

/** A board column's card list ("To do (3)"). */
const column = (page: Page, name: string) => page.getByRole("list", { name: new RegExp(`^${name} \\(\\d+\\)$`) });
const card = (scope: Page | Locator, text: string) => scope.getByRole("listitem").filter({ hasText: text });

async function openProject(page: Page, name: string) {
  await page.goto("/projects");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function openBoard(page: Page, name: string) {
  await openProject(page, name);
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await expect(column(page, "To do")).toBeVisible();
}

/** Picks a person in a PersonPicker (its button is named after the field). */
async function pickPerson(scope: Page | Locator, field: RegExp, search: string, option: RegExp) {
  await scope.getByRole("button", { name: field }).click();
  await scope.getByRole("combobox", { name: /Search people for/ }).fill(search);
  await scope.getByRole("option", { name: option }).click();
}

async function addMember(page: Page, search: string, option: RegExp, role: "OWNER" | "MEMBER" | "VIEWER") {
  await pickPerson(page, /^Person to add/, search, option);
  await page.locator(".member-add").getByLabel("Role").selectOption(role);
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await expect(page.getByRole("row", { name: option })).toBeVisible();
}

test.describe.serial("task management", () => {
  test.beforeAll(cleanup);
  test.afterAll(cleanup);

  test("1. the owner sees the Tasks menu and every project, creates a private project, adds members and a step", async ({ page }) => {
    await login(page, OWNER);
    await expectLanded(page, "/overview");
    for (const item of ["My tasks", "Projects", "Task settings"]) await expect(menu(page).getByRole("link", { name: new RegExp(`^${item}`) })).toBeVisible();
    await expect(menu(page).getByText("Tasks", { exact: true })).toBeVisible();

    if (await hasDemoTaskSeed()) {
      // the private Payroll project is visible to the Owner, and opening it is recorded
      await openProject(page, "Payroll October");
      await expect.poll(async () => (await sql("SELECT 1 FROM audit_log WHERE action = 'project.private_access' AND at >= $1", [TEST_START_TIME])).length).toBeGreaterThan(0);
    }

    await page.goto("/projects");
    await page.getByRole("button", { name: "New project" }).click();
    const form = page.getByRole("dialog", { name: "New project" });
    await form.getByLabel("Name *").fill(PROJECT_NAME);
    await expect(form.getByLabel(/^Key \*/)).toHaveValue("E2E");
    await form.getByLabel(/^Key \*/).fill(PROJECT_KEY);
    await form.getByRole("radio", { name: /Private/ }).check();
    await form.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: PROJECT_NAME })).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await addMember(page, "Riya", /Riya Malhotra/, "MEMBER");
    await addMember(page, "Nazneen", /Nazneen/, "OWNER");
    await addMember(page, "Siddharth", /Siddharth/, "MEMBER");

    await page.getByLabel("Name of the new step").fill("Blocked");
    await page.getByRole("button", { name: "Add status" }).click();
    await expect(page.getByLabel("Name of step Blocked")).toBeVisible();
  });

  test("2. a manager creates a task with both assignees and a past due time; it shows on the board and in her My tasks", async ({ page }) => {
    const [assignee] = await sql<{ time_zone: string }>("SELECT time_zone FROM employees WHERE code = 'JC-072' AND business_id IS NOT NULL");
    await login(page, "JC-035");
    await expectLanded(page, "/home");
    await openBoard(page, PROJECT_NAME);
    await page.getByRole("button", { name: "New task" }).click();
    const form = page.getByRole("dialog", { name: "New task" });
    await form.getByLabel("Title *").fill(TASK_TITLE);
    await pickPerson(form, /^Assignee/, "Siddharth", /Siddharth/);
    await pickPerson(form, /^Accountable/, "Nazneen", /Nazneen/);
    await form.getByLabel("Due date").fill(dateIn(-1, assignee.time_zone));
    await form.getByLabel("Due time").fill("10:00");
    await form.getByRole("button", { name: "Create task" }).click();
    await expect(toast(page)).toContainText(/Task E2EO-\d+ created/);
    taskKey = /E2EO-\d+/.exec((await toast(page).textContent()) ?? "")![0];

    // the new task opens in the side panel; the board shows the card with both people in To do
    await expect(page.getByRole("dialog", { name: `Task ${taskKey}` })).toBeVisible();
    await page.keyboard.press("Escape");
    const todo = column(page, "To do");
    await expect(card(todo, TASK_TITLE)).toBeVisible();
    await expect(card(todo, TASK_TITLE).locator(".avatar")).toHaveCount(2);
    await expect(card(todo, TASK_TITLE).locator(".task-overdue")).toBeVisible();

    // a second card through "+ Add a task" under the To do column
    await page.locator(".board-col", { has: todo }).getByRole("button", { name: "Add a task" }).click();
    await page.getByLabel("Task title (Enter to save)").fill(SECOND_TITLE);
    await page.getByLabel("Task title (Enter to save)").press("Enter");
    await expect(card(todo, SECOND_TITLE)).toBeVisible();

    await page.goto("/my-tasks?relation=INDIRECT");
    const row = page.locator(".task-row", { hasText: TASK_TITLE });
    await expect(row).toBeVisible();
    await expect(row.getByText("Accountable", { exact: true })).toBeVisible();
  });

  test("3. the assignee sees it overdue, moves it with the keyboard, drags another card, comments with a mention, ticks a checklist item", async ({ page }) => {
    await login(page, "JC-072");
    await expectLanded(page, "/home");
    const myTasks = menu(page).getByRole("link", { name: /^My tasks/ });
    await expect(myTasks.locator(".badge")).toBeVisible();
    expect(Number(await myTasks.locator(".badge").textContent())).toBeGreaterThanOrEqual(1);
    await myTasks.click();
    await expect(page.getByRole("region", { name: /Overdue/ }).getByText(TASK_TITLE)).toBeVisible();

    await openBoard(page, PROJECT_NAME);
    // keyboard path: the Move menu
    await page.getByRole("button", { name: `Move ${taskKey}` }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitemradio", { name: "In progress" }).focus();
    await page.keyboard.press("Enter");
    await expect(card(column(page, "In progress"), TASK_TITLE)).toBeVisible();
    await expect(page.getByText(`${taskKey} moved to In progress`)).toBeAttached();

    // mouse path: drag the other card to In review
    // several pointer moves, as a hand makes them: the browser only fires dragover after the drag has started
    const from = (await card(column(page, "To do"), SECOND_TITLE).boundingBox())!;
    const to = (await column(page, "In review").boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 20, { steps: 10 });
    await page.mouse.move(to.x + to.width / 2, to.y + 24, { steps: 3 });
    await page.mouse.up();
    await expect(card(column(page, "In review"), SECOND_TITLE)).toBeVisible();

    // the panel: comment with a mention, add and tick a checklist item
    await card(column(page, "In progress"), TASK_TITLE).getByRole("link", { name: TASK_TITLE }).click();
    const panel = page.getByRole("dialog", { name: `Task ${taskKey}` });
    await expect(panel.getByRole("button", { name: "Edit title" })).toHaveText(TASK_TITLE);
    await panel.getByRole("combobox", { name: "Write a comment" }).fill("Looks like the click handler. Please check @Nazn");
    await panel.getByRole("option", { name: /Nazneen/ }).click();
    await panel.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(panel.locator(".task-comment .mention", { hasText: "@Nazneen" })).toBeVisible();

    await panel.getByRole("button", { name: "Item", exact: true }).click();
    await panel.getByLabel("New checklist item").fill("Check Safari 17");
    await panel.getByRole("button", { name: "Add", exact: true }).click();
    await panel.getByRole("checkbox", { name: "Check Safari 17" }).click();
    await expect(panel.getByRole("checkbox", { name: "Check Safari 17" })).toBeChecked();
    await expect(panel.getByText("1/1 done")).toBeVisible();
  });

  test("4. the manager gets the mention in the bell and sees the task in Team tasks; the depth switch is in the URL", async ({ page }) => {
    await login(page, "JC-035");
    await expectLanded(page, "/home");
    await page.getByRole("button", { name: /^Notifications \(/ }).click();
    await expect(page.locator(".menu.notif").getByText(new RegExp(`mentioned you on ${taskKey}`))).toBeVisible();
    await page.keyboard.press("Escape");
    await menu(page).getByRole("link", { name: "Team tasks" }).click();
    await expectLanded(page, "/team-tasks");
    const row = page.getByRole("row", { name: new RegExp(TASK_TITLE) });
    await expect(row).toContainText("In progress");
    await page.getByRole("switch", { name: "Include indirect reports" }).click();
    await expect(page).toHaveURL(/depth=2/);
  });

  test("5. someone outside a private project gets Not found and does not see it listed", async ({ page }) => {
    await login(page, "JC-058");
    await expectLanded(page, "/home");
    await page.goto(`/tasks/${taskKey}`);
    await expect(page.getByText("Not found", { exact: true })).toBeVisible();
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(PROJECT_NAME) })).toHaveCount(0);
    if (await hasDemoTaskSeed()) await expect(page.getByRole("link", { name: /Payroll October/ })).toHaveCount(0);
  });

  test("6. HR has no special view; a non-member reads and comments on a company-wide project without moving cards", async ({ page, browser }) => {
    test.skip(!(await hasDemoTaskSeed()), "needs the demo task seed (backend T1b)");
    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: /People operations/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Payroll October/ })).toHaveCount(0);

    const context = await browser.newContext();
    const employee = await context.newPage();
    await login(employee, "JC-072"); // not a member of People operations
    await expectLanded(employee, "/home");
    await openBoard(employee, "People operations");
    const firstCard = employee.locator(".board").getByRole("listitem").first();
    await expect(firstCard).toBeVisible();
    await expect(employee.getByRole("button", { name: /^Move PEO-/ })).toHaveCount(0);
    await expect(employee.getByRole("button", { name: "New task" })).toHaveCount(0);
    await firstCard.locator(".task-card-title").click();
    await expect(employee.getByRole("combobox", { name: "Write a comment" })).toBeVisible();
    await context.close();
  });

  test("7. the accountable person (not a member) changes status and priority and can reassign, but not edit the title or delete", async ({ page }) => {
    test.skip(!(await hasDemoTaskSeed()), "needs the demo task seed (backend T1b)");
    await login(page, "JC-004");
    await expectLanded(page, "/home");
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);
    await page.goto("/my-tasks?relation=INDIRECT");
    const row = page.locator(".task-row", { hasText: "PEO-" }).first();
    await expect(row.getByText("Accountable", { exact: true })).toBeVisible();
    await row.click();
    const panel = page.getByRole("dialog", { name: /^Task PEO-/ });
    await expect(panel.getByLabel("Status")).toBeEnabled();
    await panel.getByLabel("Priority").selectOption("HIGH");
    await expect(panel.getByLabel("Priority")).toHaveValue("HIGH");
    await expect(panel.getByRole("button", { name: /^Assignee/ })).toBeEnabled();
    await expect(panel.getByRole("button", { name: "Edit title" })).toHaveCount(0);
    await panel.getByRole("button", { name: "More actions" }).click();
    await expect(panel.getByRole("menuitem", { name: "Copy link" })).toBeVisible();
    await expect(panel.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  });

  test("8. after the subscription ends task pages open but nothing can be changed", async ({ page }) => {
    const business = "(SELECT business_id FROM employees WHERE code = 'JC-072' AND business_id IS NOT NULL)";
    const saved = await sql<{ id: string; starts_on: string; ends_on: string }>(`SELECT id::text, starts_on::text, ends_on::text FROM business_subscriptions WHERE business_id = ${business}`);
    await sql(`UPDATE business_subscriptions SET starts_on = current_date - 400, ends_on = current_date - 10 WHERE business_id = ${business}`);
    try {
      await login(page, "JC-072");
      await expectLanded(page, "/home");
      await page.goto("/my-tasks");
      await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
      await expect(page.getByRole("button", { name: "New task" })).toHaveCount(0);
      await expect(page.getByLabel("Add a task… (Enter to save)")).toHaveCount(0);
      await page.goto(`/tasks/${taskKey}`);
      await expect(page.getByRole("heading", { name: TASK_TITLE })).toBeVisible();
      await expect(page.getByRole("button", { name: "Follow" })).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: "Write a comment" })).toHaveCount(0);
      await expect(page.getByLabel("Status")).toHaveCount(0);
    } finally {
      for (const row of saved) await sql("UPDATE business_subscriptions SET starts_on = $2::date, ends_on = $3::date WHERE id = $1::uuid", [row.id, row.starts_on, row.ends_on]);
    }
  });

  test("9. on a phone My tasks and the board fit the screen; the board shows one step at a time", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "JC-072");
    await expectLanded(page, "/home");
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.goto("/my-tasks");
    await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("/projects");
    await page.getByRole("link", { name: new RegExp(PROJECT_NAME) }).click();
    await page.getByRole("button", { name: "Board", exact: true }).click();
    const stepPicker = page.getByLabel("Step");
    await expect(stepPicker).toBeVisible();
    await expect(page.locator(".board-col:visible")).toHaveCount(1);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await stepPicker.selectOption({ index: 1 });
    await expect(page.locator(".board-col:visible")).toHaveCount(1);
    await expect(card(page.locator(".board-col:visible"), TASK_TITLE)).toBeVisible();
  });

  test("10. the assignee attaches a picture; a file of another kind is refused", async ({ page }) => {
    await login(page, "JC-072");
    await expectLanded(page, "/home");
    await page.goto(`/tasks/${taskKey}`);
    await expect(page.getByRole("button", { name: "Edit title" })).toHaveText(TASK_TITLE);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "screenshot.png", mimeType: "image/png", buffer: PNG });
    await expect(toast(page)).toContainText("File attached");
    const link = page.getByRole("link", { name: "screenshot.png" });
    await expect(link).toBeVisible();
    const download = page.waitForEvent("download");
    await link.click();
    expect((await download).suggestedFilename()).toBe("screenshot.png");

    // refused here (by its name) and by the API (by its content)
    await fileInput.setInputFiles({ name: "setup.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ fake") });
    await expect(toast(page)).toContainText("Upload a PDF, image, Word, Excel, PowerPoint, text or CSV file.");
    await fileInput.setInputFiles({ name: "setup.png", mimeType: "image/png", buffer: Buffer.from("MZ not a picture") });
    await expect(toast(page)).toContainText(/Upload a PDF, image/);
    await expect(page.getByRole("link", { name: "setup.png" })).toHaveCount(0);
  });

  test("11. in Hindi the Tasks menu and My tasks are translated", async ({ page }) => {
    await login(page, "JC-072");
    await expectLanded(page, "/home");
    await page.getByLabel("Language").selectOption({ label: "हिन्दी" });
    const sidebar = page.getByRole("complementary");
    await expect(sidebar.getByRole("link", { name: /मेरे कार्य/ })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "प्रोजेक्ट", exact: true })).toBeVisible();
    await sidebar.getByRole("link", { name: /मेरे कार्य/ }).click();
    await expect(page.getByRole("heading", { name: "मेरे कार्य" })).toBeVisible();
    await expect(page.getByRole("button", { name: "नया कार्य" })).toBeVisible();
    await page.getByLabel("भाषा").selectOption({ label: "English" });
    await expect(sidebar.getByRole("link", { name: /My tasks/ })).toBeVisible();
  });

  test("12. the extra reminder is set next to the due date, kept after a reload, shown in Hindi, and needs a due date", async ({ page }) => {
    const [assignee] = await sql<{ time_zone: string }>("SELECT time_zone FROM employees WHERE code = 'JC-072' AND business_id IS NOT NULL");
    await login(page, "JC-035");
    await expectLanded(page, "/home");
    await openBoard(page, PROJECT_NAME);

    // the new-task form: the select waits for a due date and says why
    await page.getByRole("button", { name: "New task" }).click();
    const form = page.getByRole("dialog", { name: "New task" });
    await expect(form.getByLabel("Remind me")).toBeDisabled();
    await expect(form.getByText(/Choose a due date to set a reminder/)).toBeVisible();
    await form.getByLabel("Due date").fill(dateIn(1, assignee.time_zone));
    await expect(form.getByLabel("Remind me")).toBeEnabled();
    await expect(form.getByLabel("Remind me").locator("option")).toHaveText(["No extra reminder", "15 minutes before", "1 hour before", "4 hours before", "1 day before"]);
    await form.getByRole("button", { name: "Cancel" }).click();

    // the task panel: due tomorrow 18:00 and "1 hour before"
    await card(column(page, "In progress"), TASK_TITLE).getByRole("link", { name: TASK_TITLE }).click();
    const panel = page.getByRole("dialog", { name: `Task ${taskKey}` });
    await expect(panel.getByLabel("Remind me")).toHaveValue("");
    await panel.getByLabel("Due date").fill(dateIn(1, assignee.time_zone));
    await panel.getByLabel("Due time").fill("18:00");
    await panel.getByLabel("Remind me").selectOption("1 hour before");
    await expect.poll(async () => (await sql<{ reminder_before_minutes: number | null }>("SELECT reminder_before_minutes FROM tasks WHERE title = $1", [TASK_TITLE]))[0]?.reminder_before_minutes).toBe(60);
    await page.reload();
    await expect(page.getByRole("dialog", { name: `Task ${taskKey}` }).getByLabel("Remind me")).toHaveValue("60");

    // Hindi
    await page.getByLabel("Language").selectOption({ label: "हिन्दी" });
    await expect(page.getByLabel("मुझे याद दिलाएँ")).toHaveValue("60");
    await expect(page.getByLabel("मुझे याद दिलाएँ").locator("option").first()).toHaveText("कोई अतिरिक्त अनुस्मारक नहीं");
    await page.getByLabel("भाषा").selectOption({ label: "English" });

    // clearing the due date takes the reminder with it
    const englishPanel = page.getByRole("dialog", { name: `Task ${taskKey}` });
    await expect(englishPanel).toBeVisible();
    await englishPanel.getByLabel("Due date").fill("");
    await englishPanel.getByLabel("Due date").blur();
    await expect(englishPanel.getByLabel("Remind me")).toBeDisabled();
    await expect.poll(async () => (await sql<{ reminder_before_minutes: number | null }>("SELECT reminder_before_minutes FROM tasks WHERE title = $1", [TASK_TITLE]))[0]?.reminder_before_minutes).toBeNull();
  });
});
