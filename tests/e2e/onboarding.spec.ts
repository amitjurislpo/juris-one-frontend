import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { expectLanded, login, sql } from "./helpers";

const NEW_EMAIL = "e2e.onboarding.hire@jurislpo.com";
const BEHALF_EMAIL = "e2e.onboarding.behalf@jurislpo.com";
const HR_COMMENT = "Please recheck the address proof and the bank details.";
const ADDRESS_COMMENT = "Pin code does not match the proof.";
const ACCOUNTS_COMMENT = "Bank name is missing.";
/** Set ONBOARDING_SHOTS to a folder to save full-page screenshots of every step (layout review). */
const SHOTS_DIRECTORY = process.env.ONBOARDING_SHOTS ?? "";
/** The e2e API stores uploads here (JURISONE_STORAGE_DIR in scripts/e2e-env.mjs). */
const STORAGE_DIRECTORY = path.join(os.tmpdir(), "jurisone-e2e", "files");

async function cleanup() {
  await sql(`DELETE FROM email_outbox WHERE "to" LIKE 'e2e.onboarding.%'`);
  await sql(`DELETE FROM employees WHERE email LIKE 'e2e.onboarding.%'`);
}

const toast = (page: Page) => page.locator(".toast").last();

// ---- small real files ----
const FILES_DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), "onboarding-files-"));
const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const PNG_BYTES = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
function sampleFile(name: string, bytes: Buffer) {
  const filePath = path.join(FILES_DIRECTORY, name);
  fs.writeFileSync(filePath, bytes);
  return filePath;
}

// ---- helpers ----
/** Browser writes carry this header; the API refuses writes from other origins. */
const SAME_ORIGIN = { origin: "http://localhost:3006" };
/** A label that is exactly this text (the red star of a mandatory field is part of the label text). */
const exactLabel = (text: string) => new RegExp(String.raw`^${text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}( \*)?$`);
const nextButton = (page: Page) => page.getByRole("button", { name: "Save & Next" });
const heading = (page: Page, name: string) => page.getByRole("heading", { name: new RegExp(`^${name}`) }); // the Nominations heading carries an (i) with its own label
const block = (page: Page, title: string) => page.getByRole("region", { name: title, exact: true });
/** The field grid that follows a sub-heading ("Permanent Address", "Emergency Contact/Address"). */
const gridAfter = (page: Page, title: string) => page.locator("h3.wizard-subheading", { hasText: title }).locator("xpath=following-sibling::div[contains(@class,'form-grid')][1]");

async function openSection(page: Page, title: string) {
  const header = page.locator(".accordion-h").filter({ has: page.locator(".accordion-title", { hasText: new RegExp(`^${title}$`) }) });
  if ((await header.count()) === 0) return; // read-only views show every section open
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
}

async function saveAndNext(page: Page, nextHeading?: string) {
  await nextButton(page).click();
  if (nextHeading) await expect(heading(page, nextHeading)).toBeVisible({ timeout: 15_000 });
}

async function fillAddress(grid: Locator, address: { line1: string; line2: string; line3: string; city: string; district: string; state: string; pin: string; phone: string }) {
  await grid.getByLabel(exactLabel("Address")).fill(address.line1);
  await grid.getByLabel("Address Line 2").fill(address.line2);
  await grid.getByLabel("Address Line 3").fill(address.line3);
  await grid.getByLabel("City").fill(address.city);
  await grid.getByLabel("District").fill(address.district);
  await grid.getByLabel("State").selectOption(address.state);
  await grid.getByLabel("Pin").fill(address.pin);
  await grid.getByLabel("Phone Number").fill(address.phone);
}

/** The attachment slot with this heading on step 6. */
const slot = (page: Page, title: string) => page.locator("b", { hasText: title }).first().locator("xpath=../..");

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click(); // the locked shell has no account menu
  await expect(page).toHaveURL(/\/login\?signedout=1/);
}

function currentMonthFolder() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function listFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? listFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
}

let context: BrowserContext;
let hire: Page;
let employeeCode = "";
let hireId = "";
/** The first hire's saved wizard data (before the Summary); the on-behalf test reuses it. */
let savedView: Record<string, unknown> = {};

/** The "Onboard employee" dialog on /onboarding/hires. */
async function onboardHire(page: Page, newHire: { firstName: string; lastName: string; email: string; phone: string }) {
  await page.getByRole("button", { name: "Onboard employee" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name *").fill(newHire.firstName);
  await dialog.getByLabel("Last name *").fill(newHire.lastName);
  await dialog.getByLabel("Work email *").fill(newHire.email);
  await dialog.getByLabel(exactLabel("Phone number")).fill(newHire.phone);
  await dialog.getByLabel("Designation *").fill("Associate");
  await dialog.getByLabel("Department *").selectOption({ label: "Technology" });
  await dialog.getByLabel(/Reporting manager/).selectOption({ index: 1 });
  await dialog.getByRole("button", { name: "Send invitation" }).click();
}

const withoutIds = <T extends object>(value: T): T => JSON.parse(JSON.stringify(value, (key, item) => (key === "id" ? null : item)));

/** Saves steps 1 to 6 and uploads the mandatory files for a person, as HR, with the first hire's data. */
async function fillBehalfByApi(page: Page, id: string) {
  const base = `/api/v1/people/${id}/onboarding`;
  const saved = async (step: number, data: unknown) => {
    const response = await page.request.put(`${base}/steps/${step}`, { headers: SAME_ORIGIN, data });
    expect(response.status(), `step ${step}`).toBe(200);
    const body = await response.json();
    return body.data ?? body;
  };
  const source = savedView as Record<string, never>;
  await saved(1, withoutIds({ personal: source.personal, permanentAddress: source.permanentAddress, presentAddress: source.presentAddress, emergencyContact: source.emergencyContact, education: source.education, courses: source.courses }));
  await saved(2, withoutIds({ employments: source.employments }));
  await saved(3, {
    bank: { country: "India", bankAccountNumber: "123456789012", ifsc: "ICIC0000571", bankName: "", branch: "", branchAddress: "", nameAsPerBank: "Behalf Hire", accountType: "Saving" },
    statutory: { previousPfNumber: "", uan: "", pan: "ABCPB1234K", namePerPan: "BEHALF HIRE", aadhaar: "234567891222", namePerAadhaar: "Behalf Hire", passportNumber: "", namePerPassport: "", passportExpiry: "" },
  });
  const afterFamily = await saved(4, { familyMembers: [{ id: null, name: "Anju Devi", relationship: "Mother", dateOfBirth: "1965-03-01", gender: "Female", bloodGroup: "O +ve", nationality: "Indian", isMinor: false, hasMentalIllness: false, guardian: null }] });
  const memberId = afterFamily.familyMembers[0].id as string;
  const afterNominations = await saved(5, { nominations: { epf: [{ familyMemberId: memberId, percentage: "100" }], eps: { familyMemberId: memberId }, esi: { familyMemberId: memberId }, gratuity: [{ familyMemberId: memberId, percentage: "100" }] } });
  for (const eachSlot of afterNominations.attachmentSlots as { slotKey: string; isMandatory: boolean }[]) {
    if (!eachSlot.isMandatory) continue;
    const upload = await page.request.post(`${base}/attachments`, { headers: SAME_ORIGIN, multipart: { slotKey: eachSlot.slotKey, file: { name: "proof.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } } });
    expect(upload.status(), eachSlot.slotKey).toBe(201);
  }
  await saved(6, {});
}
const uploadedFileIds: string[] = [];

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 15_000 });

test.describe("employee onboarding wizard", () => {
  test.beforeAll(async ({ browser }) => {
    await cleanup();
    // uploads of earlier runs (the database is reset on every run, the temp storage folder is not)
    fs.rmSync(path.join(STORAGE_DIRECTORY, "onboarding-forms"), { recursive: true, force: true });
    context = await browser.newContext();
    hire = await context.newPage();
  });
  test.afterAll(async () => {
    await context?.close();
    await cleanup();
  });

  test("HR onboards a hire; the hire is locked into the wizard without a menu; the whole form is filled, uploaded and submitted", async ({ page, browser }) => {
    test.setTimeout(420_000);

    // ---------- HR onboards the employee from the new menu item ----------
    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.getByRole("link", { name: "Onboard employee" }).click(); // needs the backend nav item "onboard-employee"
    await expect(page).toHaveURL(/\/onboarding\/hires$/);
    await onboardHire(page, { firstName: "Onboarding", lastName: "Hire", email: NEW_EMAIL, phone: "9876511111" });
    await expect(toast(page)).toContainText(`Invitation sent to ${NEW_EMAIL}`);
    await expect(page).toHaveURL(/\/onboarding\/hires\/[0-9a-f-]{36}$/, { timeout: 15_000 });
    const [created] = await sql<{ id: string; code: string }>("SELECT id::text AS id, code FROM employees WHERE email = $1", [NEW_EMAIL]);
    employeeCode = created.code;
    hireId = created.id;
    expect(page.url()).toContain(hireId);
    expect((await sql(`SELECT 1 FROM email_outbox WHERE "to" = $1`, [NEW_EMAIL])).length).toBeGreaterThan(0); // the invitation
    await expect(page.getByRole("complementary", { name: "HR review" }).locator(".chip")).toHaveText("Not started");

    // ---------- the hire signs in and lands on the wizard ----------
    await login(hire, NEW_EMAIL);
    await expect(hire).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await expect(hire.getByRole("heading", { name: "Hi, ONBOARDING HIRE" })).toBeVisible();
    await expect(hire.getByRole("navigation", { name: "Onboarding steps" })).toBeVisible();
    await expect(hire.getByText(employeeCode).first()).toBeVisible();
    await expect(hire.locator(".nav-item")).toHaveCount(0); // locked: no menu at all
    await expect(hire.getByPlaceholder(/Search/)).toHaveCount(0);
    await hire.goto("/leave");
    await expect(hire).toHaveURL(/\/onboarding$/); // no way around it

    // ---------- step 1 starts blank; Save & Next shows what is missing ----------
    await expect(hire.getByLabel("Personal Email")).toHaveValue("");
    await nextButton(hire).click();
    await expect(hire.getByText("Some information is missing or invalid").first()).toBeVisible();
    await expect(hire.getByText("This field is mandatory").first()).toBeVisible();

    // a message goes the moment its own field is right (not on the next Save): Qualifications
    const mandatory = "This field is mandatory";
    const qualificationsBlock = block(hire, "Education 1");
    await openSection(hire, "Qualifications");
    for (const label of ["Qualification", "From Year", "To Year", "Institute", "Grade/Percentage"]) {
      await expect(qualificationsBlock.getByLabel(exactLabel(label))).toHaveAttribute("aria-invalid", "true");
    }
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(5);
    await qualificationsBlock.getByLabel(exactLabel("Qualification")).selectOption("B.Tech");
    await expect(qualificationsBlock.getByLabel(exactLabel("Qualification"))).not.toHaveAttribute("aria-invalid", "true");
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(4); // only its own message went
    await expect(qualificationsBlock.getByLabel("Institute")).toHaveAttribute("aria-invalid", "true");
    await expect(hire.getByText("Some information is missing or invalid").first()).toBeVisible(); // other sections still have problems
    await qualificationsBlock.getByLabel("From Year").selectOption("2008");
    await qualificationsBlock.getByLabel("To Year").selectOption("2012");
    await qualificationsBlock.getByLabel("Institute").fill("MDU, Rohtak");
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(1);
    await qualificationsBlock.getByLabel("Grade/Percentage").fill("8.1 CGPA");
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(0);
    // a typed-then-cleared field comes back, and goes again when typed
    await qualificationsBlock.getByLabel("Institute").fill("");
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(1);
    await qualificationsBlock.getByLabel("Institute").fill("MDU, Rohtak");
    await expect(qualificationsBlock.getByText(mandatory)).toHaveCount(0);

    // conditional fields
    await expect(hire.getByLabel("Marriage Date")).toBeDisabled();
    await expect(hire.getByLabel("Spouse Name")).toBeDisabled();
    await hire.getByLabel("Marital Status").selectOption("Married");
    await expect(hire.getByLabel("Marriage Date")).toBeEnabled();
    await expect(hire.getByLabel("Spouse Name")).toBeEnabled();
    await expect(hire.getByLabel("Disability Type")).toBeDisabled();
    await hire.getByLabel("Physically Challenged").selectOption("yes");
    await expect(hire.getByLabel("Disability Type")).toBeEnabled();

    // ---------- step 1: fill every section ----------
    await hire.getByLabel("Blood Group").selectOption("B +ve");
    await hire.getByLabel("Personal Email").fill("onboarding.personal@example.com");
    await hire.getByLabel("Father name").fill("Some Father");
    await hire.getByLabel("Marriage Date").fill("2018-02-14");
    await hire.getByLabel("Spouse Name").fill("Some Spouse");
    await hire.getByLabel("Country Of Origin").selectOption("India");
    await hire.getByLabel(exactLabel("Nationality")).selectOption("Indian");
    await hire.getByLabel("International Employee").selectOption("no");
    await hire.getByLabel("Disability Type").selectOption("Visual");
    await hire.getByLabel("Gender").selectOption("Male");
    await hire.getByLabel("Date of Birth").fill("1990-05-10");
    await hire.getByLabel("Height (cm)").fill("172");
    await hire.getByLabel("Weight (kg)").fill("68");
    await hire.getByLabel("Identification Mark").fill("Mole on left hand");
    await hire.getByLabel("Religion").selectOption("Hindu");
    await hire.getByLabel("Caste").fill("General");
    await hire.getByLabel("Hobby").fill("Chess");

    await openSection(hire, "Address");
    const permanent = { line1: "12 Park Street", line2: "Sector 4", line3: "Near Metro", city: "Gurugram", district: "Gurugram District", state: "Haryana", pin: "122001", phone: "9876500000" };
    await fillAddress(gridAfter(hire, "Permanent Address"), permanent);
    const presentGrid = gridAfter(hire, "Present Address");
    await expect(presentGrid.getByLabel("City")).toBeEnabled();
    await hire.getByLabel("Same as above").check();
    await expect(presentGrid.getByLabel("City")).toBeDisabled();
    await expect(presentGrid.getByLabel("District")).toHaveValue("Gurugram District"); // the greytHR glitch: District must be copied
    await expect(presentGrid.getByLabel(exactLabel("Address"))).toHaveValue("12 Park Street");
    await expect(presentGrid.getByLabel("State")).toHaveValue("Haryana");
    // stays in sync while ticked
    await gridAfter(hire, "Permanent Address").getByLabel("City").fill("Gurgaon");
    await expect(presentGrid.getByLabel("City")).toHaveValue("Gurgaon");
    const emergency = gridAfter(hire, "Emergency Contact/Address");
    await emergency.getByLabel("Name").fill("Emergency Person");
    await emergency.getByLabel("Mobile Number").fill("9876522222");
    await emergency.getByLabel("Relationship").selectOption("Brother");

    await openSection(hire, "Qualifications");
    const education1 = block(hire, "Education 1");
    await education1.getByLabel(exactLabel("Qualification")).selectOption("B.Tech");
    await education1.getByLabel("From Year").selectOption("2008");
    await education1.getByLabel("To Year").selectOption("2012");
    await education1.getByLabel("Institute").fill("MDU, Rohtak");
    await education1.getByLabel("Grade/Percentage").fill("8.1 CGPA");
    await hire.getByRole("button", { name: "+ Add another education" }).click();
    const education2 = block(hire, "Education 2");
    await education2.getByLabel(exactLabel("Qualification")).selectOption("MBA");
    await education2.getByLabel("From Year").selectOption("2013");
    await education2.getByLabel("To Year").selectOption("2015");
    await education2.getByLabel("Institute").fill("IIM Rohtak");
    await education2.getByLabel("Grade/Percentage").fill("72%");
    await hire.getByRole("button", { name: "+ Add another course" }).click();
    const course1 = block(hire, "Course 1");
    await course1.getByLabel("Course Name").fill("Cyber Law");
    await course1.getByLabel("Institute").fill("NLU Delhi");
    await course1.getByLabel("From Year").selectOption("2016");
    await course1.getByLabel("To Year").selectOption("2016");

    // every field of the step is right now: no message and no banner is left
    await expect(hire.getByText(mandatory)).toHaveCount(0);
    await expect(hire.getByText("Some information is missing or invalid")).toHaveCount(0);
    await saveAndNext(hire, "Previous Employment");

    // ---------- step 2: one employment ----------
    if (await block(hire, "Employment 1").count() === 0) await hire.getByRole("button", { name: "+ Add another Employment" }).click();
    const employment1 = block(hire, "Employment 1");
    await employment1.getByLabel("Company Name").fill("Acme Legal LLP");
    await employment1.getByLabel("Designation").fill("Associate");
    await employment1.getByLabel("Last Drawn Salary").fill("45000");
    await employment1.getByLabel("From Date").fill("2015-07-01");
    await employment1.getByLabel("To Date").fill("2020-12-31");
    await employment1.getByLabel("Reason for Leaving").fill("Better role");
    await employment1.getByLabel("Company Address").fill("1 Court Road, New Delhi");
    await saveAndNext(hire, "Identifications");

    // ---------- stop midway: sign out, sign in, resume at step 3 with data intact ----------
    await signOut(hire);
    await login(hire, NEW_EMAIL);
    await expect(hire).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await expect(heading(hire, "Identifications")).toBeVisible({ timeout: 15_000 });
    await hire.getByRole("button", { name: /Personal Information/ }).first().click();
    await expect(hire.getByLabel("Personal Email")).toHaveValue("onboarding.personal@example.com");
    await expect(hire.getByLabel("Marital Status")).toHaveValue("Married");
    await expect(hire.getByLabel("Disability Type")).toHaveValue("Visual");
    await hire.getByRole("button", { name: /Previous Employment/ }).first().click();
    await expect(block(hire, "Employment 1").getByLabel("Company Name")).toHaveValue("Acme Legal LLP");
    await hire.getByRole("button", { name: /Accounts & Statutory/ }).first().click();
    await expect(heading(hire, "Identifications")).toBeVisible();

    // ---------- step 3: bank, PAN, Aadhaar, passport ----------
    await hire.getByLabel(exactLabel("Country")).selectOption("India");
    await hire.getByLabel(exactLabel("Bank Account Number")).fill("123456789012");
    await hire.getByLabel("Confirm Bank Account Number").fill("123456789013");
    await hire.getByLabel("Bank Code").fill("ICIC0000571");
    await hire.getByLabel("Name as per Bank Account").fill("Onboarding Hire");
    await hire.getByLabel("Account Type").selectOption("Saving");
    await hire.getByLabel("PAN Number").fill("abcpo1234k");
    await expect(hire.getByLabel("PAN Number")).toHaveValue("ABCPO1234K"); // auto-uppercase
    await hire.getByLabel("Name in PAN").fill("ONBOARDING HIRE");
    await hire.getByLabel("Aadhaar Number").fill("234567891111");
    await hire.getByLabel("Name in Aadhaar").fill("Onboarding Hire");
    await nextButton(hire).click();
    await expect(hire.getByText("Account numbers do not match")).toBeVisible();
    await expect(hire.getByLabel("Confirm Bank Account Number")).toHaveAttribute("aria-invalid", "true");
    await hire.getByLabel("Confirm Bank Account Number").fill("123456789012");

    // passport number needs an expiry date, and then a Passport attachment slot appears
    await hire.getByLabel("Passport Number").fill("p1234567");
    await expect(hire.getByLabel("Passport Number")).toHaveValue("P1234567");
    await hire.getByLabel("Name in Passport").fill("Onboarding Hire");
    await nextButton(hire).click();
    await expect(hire.getByLabel("Expiry Date")).toHaveAttribute("aria-invalid", "true");
    await expect(hire.getByText("Some information is missing or invalid").first()).toBeVisible();
    await hire.getByLabel("Expiry Date").fill("2035-01-31");
    await saveAndNext(hire, "Family Details");

    // ---------- step 4: two family members, one a minor with a guardian ----------
    if (await block(hire, "Member 1").count() === 0) await hire.getByRole("button", { name: /Add another member/ }).click();
    const member1 = block(hire, "Member 1");
    await member1.getByLabel(exactLabel("Name")).fill("Anju Devi");
    await member1.getByLabel("Relationship").selectOption("Mother");
    await member1.getByLabel("DOB").fill("1965-03-01");
    await member1.getByLabel("Gender").selectOption("Female");
    await member1.getByLabel("Blood Group").selectOption("O +ve");
    await member1.getByLabel("Nationality").selectOption("Indian");
    await hire.getByRole("button", { name: /Add another member/ }).click();
    const member2 = block(hire, "Member 2");
    await member2.getByLabel(exactLabel("Name")).fill("Kid Hire");
    await member2.getByLabel("Relationship").selectOption("Son");
    await member2.getByLabel("DOB").fill(`${new Date().getFullYear() - 8}-06-01`);
    await expect(member2.getByRole("checkbox", { name: "Minor" })).toBeChecked(); // auto-ticked: under 18
    await member2.getByLabel("Gender").selectOption("Male");
    await member2.getByLabel("Blood Group").selectOption("B +ve");
    await member2.getByLabel("Nationality").selectOption("Indian");
    await nextButton(hire).click(); // guardian missing
    await expect(hire.getByText("Some information is missing or invalid").first()).toBeVisible();
    await member2.getByLabel("Guardian Name").fill("Onboarding Hire");
    await member2.getByLabel("Relationship").nth(1).fill("Father");
    await member2.getByLabel(exactLabel("Mobile")).fill("9876511111");
    await saveAndNext(hire, "Nominations");

    // ---------- step 5: nominations ----------
    const epf = block(hire, "EPF Nomination");
    if ((await epf.getByRole("region", { name: "Nominee 1" }).count()) === 0) await epf.getByRole("button", { name: /Add another member/ }).click();
    await epf.getByLabel("Name").first().selectOption({ label: "Anju Devi (Mother)" });
    await epf.getByLabel("Nomination %").first().fill("60");
    await nextButton(hire).click(); // single nominee that is not 100
    await expect(hire.getByText("Nomination % must be 100 in case of single nominee.")).toBeVisible();
    await epf.getByRole("button", { name: /Add another member/ }).click();
    const epfNominee2 = epf.getByRole("region", { name: "Nominee 2" });
    await epfNominee2.getByLabel("Name").selectOption({ label: "Kid Hire (Son)" });
    await epfNominee2.getByLabel("Nomination %").fill("40");
    await block(hire, "EPS Nomination").getByLabel("Name").selectOption({ label: "Anju Devi (Mother)" });
    await block(hire, "ESI Nomination").getByLabel("Name").selectOption({ label: "Anju Devi (Mother)" });
    const gratuity = block(hire, "Gratuity Nomination");
    if ((await gratuity.getByRole("region", { name: "Nominee 1" }).count()) === 0) await gratuity.getByRole("button", { name: /Add another member/ }).click();
    await gratuity.getByLabel("Name").selectOption({ label: "Kid Hire (Son)" });
    await gratuity.getByLabel("Nomination %").fill("100");
    await saveAndNext(hire);

    // ---------- step 6: attachments ----------
    await expect(hire.getByText("Add Attachment").first()).toBeVisible();
    await expect(nextButton(hire)).toBeDisabled();
    await expect(hire.getByText("Complete mandatory information")).toBeVisible();
    await expect(slot(hire, "Passport")).toBeVisible(); // the conditional slot is there
    const permanentSlot = slot(hire, "Address : Permanent Address");
    // a wrong type and an over-size file are rejected in the browser
    await permanentSlot.locator("input[type=file]").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(permanentSlot.getByRole("alert")).toContainText("Only pdf, doc, docx, jpg & png files are allowed.");
    await permanentSlot.locator("input[type=file]").setInputFiles({ name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1) });
    await expect(permanentSlot.getByRole("alert")).toContainText("The file is larger than 10MB.");
    await expect(nextButton(hire)).toBeDisabled();

    const uploads: [string, string, Buffer][] = [
      ["Address : Permanent Address", "permanent-proof.pdf", PDF_BYTES],
      ["Address : Present Address", "present-proof.png", PNG_BYTES],
      ["Qualification: B.Tech", "btech-certificate.pdf", PDF_BYTES],
      ["Qualification: MBA", "mba-certificate.pdf", PDF_BYTES],
      ["Bank Account Details", "passbook.pdf", PDF_BYTES],
      ["Permanent Account Number (PAN)", "pan-card.png", PNG_BYTES],
      ["Aadhaar", "aadhaar-card.pdf", PDF_BYTES],
      ["Passport", "passport.pdf", PDF_BYTES],
      ["Previous Employment: Acme Legal LLP", "relieving-letter.pdf", PDF_BYTES],
    ];
    for (const [title, fileName, bytes] of uploads) {
      const target = slot(hire, title);
      await target.locator("input[type=file]").setInputFiles(sampleFile(fileName, bytes));
      await expect(target.getByText(fileName)).toBeVisible({ timeout: 15_000 });
    }
    // a second file in the same slot; then remove it again
    await slot(hire, "Aadhaar").locator("input[type=file]").setInputFiles(sampleFile("aadhaar-back.png", PNG_BYTES));
    await expect(slot(hire, "Aadhaar").getByText("aadhaar-back.png")).toBeVisible();
    await slot(hire, "Aadhaar").getByRole("button", { name: "Remove aadhaar-back.png" }).click();
    await expect(slot(hire, "Aadhaar").getByText("aadhaar-back.png")).toHaveCount(0);
    await expect(slot(hire, "Aadhaar").getByText("aadhaar-card.pdf")).toBeVisible();

    await expect(nextButton(hire)).toBeEnabled();
    await expect(hire.getByText("Complete mandatory information")).toHaveCount(0);

    // ---------- the files are on disk, under onboarding-forms/<YYYY-MM>/<employeeCode>/..., and the API refuses them to others ----------
    const monthFolder = path.join(STORAGE_DIRECTORY, "onboarding-forms", currentMonthFolder());
    const onDisk = listFiles(path.join(monthFolder, employeeCode));
    expect(onDisk.length).toBe(9);
    for (const file of onDisk) expect(path.basename(file)).toMatch(/^[0-9a-f-]{36}-.+\.(pdf|png)$/);
    expect(onDisk.some((file) => file.includes("address_permanent"))).toBe(true);

    // the server also refuses a wrong type and an over-size file sent straight to the API (the browser check bypassed)
    const oversized = await hire.request.post("/api/v1/onboarding/mine/attachments", { headers: SAME_ORIGIN, multipart: { slotKey: "bank", file: { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, 1) } } });
    expect([400, 413]).toContain(oversized.status());
    const wrongType = await hire.request.post("/api/v1/onboarding/mine/attachments", { headers: SAME_ORIGIN, multipart: { slotKey: "bank", file: { name: "run.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") } } });
    expect([400, 415, 422]).toContain(wrongType.status());
    expect(listFiles(path.join(monthFolder, employeeCode)).length).toBe(9);

    const mine = await (await hire.request.get("/api/v1/onboarding/mine")).json();
    const view = mine.data ?? mine;
    savedView = view;
    for (const eachSlot of view.attachmentSlots as { files: { id: string }[] }[]) for (const file of eachSlot.files) uploadedFileIds.push(file.id);
    expect(uploadedFileIds.length).toBe(9);
    expect((await hire.request.get(`/api/v1/onboarding/mine/attachments/${uploadedFileIds[0]}/file?download=false`)).status()).toBe(200);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await login(otherPage, "JC-049"); // an ordinary employee (not HR)
    await expectLanded(otherPage, "/home");
    for (const url of [`/api/v1/onboarding/mine/attachments/${uploadedFileIds[0]}/file?download=false`, `/api/v1/people/${hireId}/onboarding/attachments/${uploadedFileIds[0]}/file?download=false`, `/api/v1/people/${hireId}/onboarding`]) {
      expect([403, 404], url).toContain((await otherPage.request.get(url)).status());
    }
    expect([403, 404]).toContain((await otherPage.request.delete(`/api/v1/onboarding/mine/attachments/${uploadedFileIds[0]}`, { headers: SAME_ORIGIN })).status());
    await other.close();

    // ---------- Summary ----------
    await nextButton(hire).click();
    await expect(hire).toHaveURL(/\/onboarding\/summary$/, { timeout: 15_000 });
    await expect(hire.getByRole("heading", { name: "Information Summary", exact: true })).toBeVisible();
    await expect(hire.getByText("Anju Devi").first()).toBeVisible();
    await expect(hire.getByText("10 May 1990")).toBeVisible();
    await expect(hire.getByText("14 Feb 2018")).toBeVisible();
    await expect(hire.getByText("MDU, Rohtak")).toBeVisible();
    await expect(hire.getByText("Acme Legal LLP").first()).toBeVisible();
    await expect(hire.getByText("Same as permanent address")).toBeVisible();
    await expect(hire.getByText("Gurugram District").first()).toBeVisible();
    for (const fileName of ["permanent-proof.pdf", "present-proof.png", "btech-certificate.pdf", "mba-certificate.pdf", "passbook.pdf", "pan-card.png", "aadhaar-card.pdf", "passport.pdf", "relieving-letter.pdf"]) {
      await expect(hire.getByText(fileName, { exact: true })).toBeVisible();
    }
    // masked values with an eye reveal
    await expect(hire.getByText("123456789012")).toHaveCount(0);
    await expect(hire.getByText("234567891111")).toHaveCount(0);
    await hire.getByRole("button", { name: "Show value" }).first().click(); // bank account
    await expect(hire.getByText("123456789012")).toBeVisible();
    await hire.getByRole("button", { name: "Show value" }).first().click(); // PAN
    await expect(hire.getByText("ABCPO1234K").first()).toBeVisible();
    await hire.getByRole("button", { name: "Show value" }).first().click(); // Aadhaar
    await expect(hire.getByText("234567891111")).toBeVisible();
    await hire.getByRole("button", { name: "Hide value" }).last().click();
    await expect(hire.getByText("234567891111")).toHaveCount(0);

    // a file opens (the eye link serves the bytes)
    const viewLink = hire.getByRole("link", { name: "View passbook.pdf" });
    const opened = await hire.request.get((await viewLink.getAttribute("href"))!);
    expect(opened.status()).toBe(200);
    expect(Buffer.compare(await opened.body(), PDF_BYTES)).toBe(0);

    // the edit icon opens the right step
    await hire.getByRole("button", { name: "Edit Family Details" }).click();
    await expect(hire).toHaveURL(/\/onboarding$/);
    await expect(heading(hire, "Family Details")).toBeVisible({ timeout: 15_000 });
    await expect(block(hire, "Member 2").getByLabel(exactLabel("Name"))).toHaveValue("Kid Hire");
    // data persists after a reload
    await hire.goto("/onboarding/summary");
    await hire.reload();
    await expect(hire.getByText("Kid Hire").first()).toBeVisible();
    await expect(hire.getByText("passbook.pdf")).toBeVisible();
    await hire.getByRole("button", { name: "Edit Personal Information" }).click();
    await expect(hire.getByLabel("Personal Email")).toHaveValue("onboarding.personal@example.com");
    await openSection(hire, "Address");
    await expect(hire.getByLabel("Same as above")).toBeChecked();
    await expect(gridAfter(hire, "Present Address").getByLabel("District")).toHaveValue("Gurugram District");

    // ---------- submit: No, then Yes ----------
    await hire.goto("/onboarding/summary");
    await hire.getByRole("button", { name: "Submit Onboarding" }).click();
    const submitModal = hire.getByRole("dialog");
    await expect(submitModal).toContainText("Are you sure you want to submit your onboarding information ?");
    await submitModal.getByRole("button", { name: "No" }).click();
    await expect(submitModal).toHaveCount(0);
    await expect(hire).toHaveURL(/\/onboarding\/summary$/);
    await hire.getByRole("button", { name: "Submit Onboarding" }).click();
    await hire.getByRole("dialog").getByRole("button", { name: "Yes" }).click();
    await expect(hire).toHaveURL(/\/onboarding\/success$/, { timeout: 20_000 });
    await expect(hire.getByRole("heading", { name: "Well Done ONBOARDING" })).toBeVisible();
    await expect(hire.getByText(/HR will review your details/)).toBeVisible();
    await expect(hire.locator(".nav-item")).toHaveCount(0);
    await hire.goto("/leave");
    await expect(hire).toHaveURL(/\/onboarding$/); // still locked while HR reviews
    // the API refuses a write while it waits for HR
    const writeAfterSubmit = await hire.request.put("/api/v1/onboarding/mine/steps/4", { headers: SAME_ORIGIN, data: { familyMembers: [] } });
    expect(writeAfterSubmit.status()).toBe(409);
    const uploadAfterSubmit = await hire.request.post("/api/v1/onboarding/mine/attachments", { headers: SAME_ORIGIN, multipart: { slotKey: "bank", file: { name: "late.pdf", mimeType: "application/pdf", buffer: PDF_BYTES } } });
    expect(uploadAfterSubmit.status()).toBe(409);
    expect((await hire.request.get("/api/v1/leave/requests/mine")).status()).toBe(403); // the hard lock is on the server too
  });

  test("HR reads the submitted form and its files, and asks for changes with flagged sections and a comment", async ({ page }) => {
    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.goto("/onboarding/hires");
    await page.getByPlaceholder(/Search/).first().fill("Onboarding Hire");
    const row = page.locator("tr", { hasText: "Onboarding Hire" });
    await expect(row.locator(".chip", { hasText: "Submitted - needs review" })).toBeVisible();
    await row.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(new RegExp(`/onboarding/hires/${hireId}$`));
    const panel = page.getByRole("complementary", { name: "HR review" });
    await expect(panel.locator(".chip")).toHaveText("Submitted - needs review");

    // the Summary, read-only, masked, with the files
    await panel.getByRole("button", { name: "Open Summary" }).click();
    const summary = page.getByRole("dialog");
    // HR can approve straight from the Summary window after reading it
    await expect(summary.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(summary.getByText("Anju Devi").first()).toBeVisible();
    await expect(summary.getByText("passbook.pdf")).toBeVisible();
    await expect(summary.getByText("123456789012")).toHaveCount(0);
    const served = await page.request.get((await summary.getByRole("link", { name: "View passbook.pdf" }).getAttribute("href"))!);
    expect(served.status()).toBe(200);
    expect(Buffer.compare(await served.body(), PDF_BYTES)).toBe(0);
    const downloaded = await page.request.get((await summary.getByRole("link", { name: "Download passbook.pdf" }).getAttribute("href"))!);
    expect(downloaded.headers()["content-disposition"] ?? "").toContain("attachment");
    await page.keyboard.press("Escape");

    // "Request changes" needs a comment and at least one flagged section with its own comment
    await panel.getByRole("button", { name: "Request changes" }).click();
    await expect(panel.getByText("Write a comment for the employee")).toBeVisible();
    await expect(panel.getByText("Mark at least one section as incorrect")).toBeVisible();
    await panel.getByLabel("Mark Address as incorrect").check();
    await panel.getByLabel("Comment for the employee").fill(HR_COMMENT);
    await panel.getByRole("button", { name: "Request changes" }).click();
    await expect(panel.getByText("Write what is wrong in this section")).toBeVisible();
    await panel.getByLabel("Comment for Address").fill(ADDRESS_COMMENT);
    await panel.getByLabel("Mark Accounts & Statutory as incorrect").check();
    await panel.getByLabel("Comment for Accounts & Statutory").fill(ACCOUNTS_COMMENT);
    await expect(panel.locator(".review-section.flagged")).toHaveCount(2);
    await panel.getByRole("button", { name: "Request changes" }).click();
    await expect(toast(page)).toBeVisible();
    await expect(panel.locator(".chip")).toHaveText("Changes requested", { timeout: 15_000 });
    await expect(panel.getByRole("button", { name: "Approve" })).toHaveCount(0); // nothing to decide until the employee resubmits
    await expect(panel.getByRole("button", { name: "Submit for review" })).toBeVisible(); // HR may correct the marked sections itself and submit again
    await expect(panel.getByText(/Waiting for .* to correct the marked sections/)).toBeVisible();

    // the hire is still locked, now back on the wizard with the review in red
    await hire.goto("/leave");
    await expect(hire).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await expect(hire.locator(".review-banner")).toContainText(HR_COMMENT);
    await expect(hire.locator(".review-banner")).toContainText(ADDRESS_COMMENT);
    await expect(hire.locator(".review-banner")).toContainText(ACCOUNTS_COMMENT);
    await expect(hire.locator(".step.flagged")).toHaveCount(2); // step 1 (Address) and step 3 (Accounts)
    await expect(hire.getByRole("button", { name: "Save & Next" })).toBeVisible();
    await expect(hire.locator(".nav-item")).toHaveCount(0);
    await hire.goto("/onboarding?step=1");
    await expect(hire.getByLabel("Personal Email")).toBeEnabled();
    await expect(hire.getByLabel("Personal Email")).toHaveValue("onboarding.personal@example.com");
  });

  test("the hire fixes the flagged steps and resubmits; the flags are gone and HR is asked again", async ({ page }) => {
    test.setTimeout(120_000);
    await hire.goto("/onboarding?step=1");
    await expect(hire.locator(".review-flag-comment").first()).toContainText(ADDRESS_COMMENT);
    await hire.getByLabel("Personal Email").fill("onboarding.fixed@example.com");
    await nextButton(hire).click();
    await expect(heading(hire, "Previous Employment")).toBeVisible({ timeout: 15_000 });
    await hire.goto("/onboarding/summary");
    await expect(hire.getByText("onboarding.fixed@example.com")).toBeVisible();
    await hire.getByRole("button", { name: "Submit Onboarding" }).click();
    await hire.getByRole("dialog").getByRole("button", { name: "Yes" }).click();
    await expect(hire).toHaveURL(/\/onboarding\/success$/, { timeout: 20_000 });

    // locked again, no red left
    await hire.goto("/onboarding");
    await expect(hire.locator(".review-banner")).toHaveCount(0);
    await expect(hire.locator(".step.flagged")).toHaveCount(0);
    await hire.goto("/leave");
    await expect(hire).toHaveURL(/\/onboarding$/);

    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.goto(`/onboarding/hires/${hireId}`);
    await expect(page.getByRole("complementary", { name: "HR review" }).locator(".chip")).toHaveText("Submitted - needs review", { timeout: 15_000 });
  });

  test("every step and the summary fit the screen at 1280, 768, 390 and 320 px", async () => {
    test.setTimeout(240_000);
    const sizes = [{ width: 1280, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 640 }];
    if (SHOTS_DIRECTORY) fs.mkdirSync(SHOTS_DIRECTORY, { recursive: true });
    for (const size of sizes) {
      await hire.setViewportSize(size);
      const pages: [string, string][] = [1, 2, 3, 4, 5, 6].map((step) => [`step${step}`, `/onboarding?step=${step}`]);
      pages.push(["summary", "/onboarding/summary"]);
      for (const [name, url] of pages) {
        await hire.goto(url);
        await expect(hire.getByRole("navigation", { name: "Onboarding steps" }).or(hire.getByRole("heading", { name: "Information Summary", exact: true }))).toBeVisible({ timeout: 15_000 });
        if (name === "step1") {
          await openSection(hire, "Address");
          await openSection(hire, "Qualifications");
        }
        if (name === "summary") await expect(hire.getByText("Anju Devi").first()).toBeVisible();
        await hire.waitForTimeout(250);
        const overflow = await hire.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
        expect(overflow.scrollWidth, `${name} at ${size.width}px scrolls sideways`).toBeLessThanOrEqual(overflow.innerWidth);
        if (SHOTS_DIRECTORY) await hire.screenshot({ path: path.join(SHOTS_DIRECTORY, `${name}-${size.width}.png`), fullPage: true });
      }
    }
    await hire.setViewportSize({ width: 1280, height: 720 });
  });

  test("HR approves; the hire gets the normal menu and /leave opens", async ({ page }) => {
    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.goto(`/onboarding/hires/${hireId}`);
    const panel = page.getByRole("complementary", { name: "HR review" });
    await expect(panel.locator(".chip")).toHaveText("Submitted - needs review", { timeout: 15_000 });
    await panel.getByRole("button", { name: "Approve" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("will get full access to the portal.");
    await confirm.getByRole("button", { name: "Approve" }).click();
    // after approving HR lands on the employee list, where the hire now shows as Approved
    await expect(page).toHaveURL(/\/employees$/, { timeout: 15_000 });
    await page.goto(`/onboarding/hires/${hireId}`);
    await expect(panel.locator(".chip")).toHaveText("Approved", { timeout: 15_000 });
    await expect(panel).toContainText("Approved on");
    await expect(panel.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Request changes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save & Next" })).toHaveCount(0); // approved: read-only for HR too

    await page.goto("/onboarding/hires");
    await page.getByPlaceholder(/Search/).first().fill("Onboarding Hire");
    await expect(page.locator("tr", { hasText: "Onboarding Hire" }).locator(".chip", { hasText: "Approved" })).toBeVisible();
    await page.goto("/employees");
    await page.getByPlaceholder(/Search/).first().fill("Onboarding Hire");
    await expect(page.locator("tr", { hasText: "Onboarding Hire" }).locator(".chip", { hasText: "Approved" })).toBeVisible();

    await hire.goto("/leave");
    await expect(hire).toHaveURL(/\/leave$/, { timeout: 15_000 });
    await expect(hire.locator(".nav-item").first()).toBeVisible();
    await expect(hire.locator(".nav-item", { hasText: "Leave & holidays" })).toBeVisible();
  });

  test("HR fills an onboarding on the employee's behalf, submits it and approves it", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, "JC-012");
    await expectLanded(page, "/home");
    await page.goto("/onboarding/hires");
    await onboardHire(page, { firstName: "Behalf", lastName: "Hire", email: BEHALF_EMAIL, phone: "9876522333" });
    await expect(toast(page)).toContainText(`Invitation sent to ${BEHALF_EMAIL}`);
    await expect(page).toHaveURL(/\/onboarding\/hires\/[0-9a-f-]{36}$/, { timeout: 15_000 });
    const id = page.url().split("/").pop()!;
    const panel = page.getByRole("complementary", { name: "HR review" });
    await expect(panel.locator(".chip")).toHaveText("Not started");
    await expect(page.getByRole("button", { name: "Save & Next" })).toBeVisible(); // HR can fill it in
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0); // nothing to approve before it is submitted

    // submitting an empty form is refused with what is missing
    await panel.getByRole("button", { name: "Submit for review" }).click();
    await expect(panel.getByRole("alert")).toBeVisible();

    // the wizard's own API, called as HR (the same endpoints the Save & Next buttons use)
    await fillBehalfByApi(page, id);
    await page.reload();
    await expect(panel.locator(".chip")).toHaveText("In progress", { timeout: 15_000 });
    await panel.getByRole("button", { name: "Submit for review" }).click();
    await expect(panel.locator(".chip")).toHaveText("Submitted - needs review", { timeout: 15_000 });
    await panel.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
    await expect(page).toHaveURL(/\/employees$/, { timeout: 15_000 }); // approving leads to the employee list
    const finished = await (await page.request.get(`/api/v1/people/${id}/onboarding`)).json();
    expect((finished.data ?? finished).status).toBe("APPROVED");
  });
});
