import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

// the e2e database and the demo logins come from the backend repo's application-dev.properties (BACKEND_REPO, default ../JurisOne)
const { devSettings } = (await import(pathToFileURL(path.join(import.meta.dirname, "..", "..", "scripts", "backend-config.mjs")).href)) as {
  devSettings: () => { databaseUrl: string; superAdminEmail: string };
};
const dev = devSettings();

/** JC-002 owns the demo business (its sub admin): the business admin. */
export const OWNER = "JC-002";
/** The platform super admin (no business). */
export const ADMIN_EMAIL = dev.superAdminEmail;

/** The e2e database (never the development one): same server, database "<db>_e2e". */
function e2eDatabaseUrl() {
  const url = new URL(dev.databaseUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}_e2e`;
  url.search = "";
  return url.toString();
}

/** Direct DB access for test setup/teardown (unlock accounts, flip access, read the email outbox). */
export async function sql<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query(query, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Sign-in is by email: a demo employee code (e.g. JC-072) is looked up. */
export async function emailOf(codeOrEmail: string) {
  if (codeOrEmail.includes("@")) return codeOrEmail;
  const [employee] = await sql<{ email: string }>("SELECT email FROM employees WHERE upper(code) = upper($1) AND business_id IS NOT NULL", [codeOrEmail]);
  if (!employee) throw new Error(`No employee ${codeOrEmail}`);
  return employee.email;
}

/** In the e2e environment every emailed sign-in code is this fixed value (OTP_FIXED_CODE, see scripts/e2e-env.mjs). */
export const OTP = "000000";

/** Asks for a sign-in code for this employee and types it. Filling the first box with all six digits submits the form. */
export async function loginWithCode(page: Page, id: string, code: string) {
  const email = await emailOf(id);
  // wait for hydration — a click can otherwise beat React to the form
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByLabel("Digit 1 of 6").fill(code);
}

/** Signs in with the emailed code (sign-in is by code only). */
export async function login(page: Page, id: string) {
  await loginWithCode(page, id, OTP);
}

export async function expectLanded(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 15_000 });
}
