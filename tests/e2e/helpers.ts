import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

// the e2e database and the demo logins come from the backend repo's application-dev.properties (BACKEND_REPO, default ../JurisOne)
const { devSettings } = (await import(pathToFileURL(path.join(import.meta.dirname, "..", "..", "scripts", "backend-config.mjs")).href)) as {
  devSettings: () => { databaseUrl: string; superAdminEmail: string };
};
const dev = devSettings();
const { businessOrigin, DEMO_BUSINESS_CODE } = (await import(pathToFileURL(path.join(import.meta.dirname, "..", "..", "scripts", "e2e-hosts.mjs")).href)) as {
  businessOrigin: (businessCode: string) => string;
  DEMO_BUSINESS_CODE: string;
};
/** The platform console (super admin) is the address with the label "admin" below the base domain; the bare address when per-business addresses are off. */
const adminOrigin = businessOrigin("admin");

/**
 * The address the API is reached at for the demo business (a browser write carries it as its Origin). With E2E_TENANT_HOST=1 it is
 * http://juris-consultants.localhost:<port>, otherwise http://localhost:<port>.
 */
export const WEB_ORIGIN = businessOrigin(DEMO_BUSINESS_CODE);
/** Same rule as scripts/e2e-slot.mjs: slot 0 is "_e2e", slot N is "_e2eN". */
const e2eDatabaseSuffix = Number(process.env.E2E_SLOT ?? 0) === 0 ? "_e2e" : `_e2e${Number(process.env.E2E_SLOT)}`;

/** JC002 owns the demo business (its sub admin): the business admin. */
export const OWNER = "JC002";
/** The platform super admin (no business). */
export const ADMIN_EMAIL = dev.superAdminEmail;

/** The e2e database (never the development one): same server, database "<db>_e2e". */
function e2eDatabaseUrl() {
  const url = new URL(dev.databaseUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}${e2eDatabaseSuffix}`;
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

/** Sign-in is by email: a demo employee code (e.g. JC072) is looked up. */
export async function emailOf(codeOrEmail: string) {
  if (codeOrEmail.includes("@")) return codeOrEmail;
  const [employee] = await sql<{ email: string }>("SELECT email FROM employees WHERE upper(code) = upper($1) AND business_id IS NOT NULL", [codeOrEmail]);
  if (!employee) throw new Error(`No employee ${codeOrEmail}`);
  return employee.email;
}

const signedInAt = new WeakMap<Page, string>();

/** The address this page signed in at (the demo business's address until it signs in): use it for API calls made with `page.request`. */
export function originOfPage(page: Page) {
  return signedInAt.get(page) ?? WEB_ORIGIN;
}

/** The address a person signs in at: the platform console for the super admin, else the address of their business (the same one without per-business addresses). */
async function originOf(email: string) {
  if (email === ADMIN_EMAIL) return adminOrigin;
  const [business] = await sql<{ code: string }>("SELECT b.code FROM employees e JOIN businesses b ON b.id = e.business_id WHERE e.email = $1", [email]);
  return businessOrigin(business?.code ?? DEMO_BUSINESS_CODE);
}

/** In the e2e environment every emailed sign-in code is this fixed value (OTP_FIXED_CODE, see scripts/e2e-env.mjs). */
export const OTP = "000000";

/** Asks for a sign-in code for this employee and types it. Filling the first box with all six digits submits the form. */
export async function loginWithCode(page: Page, id: string, code: string) {
  const email = await emailOf(id);
  const origin = await originOf(email);
  // a later page.goto("/…") of this page stays on the address it signed in at (each address has its own cookies)
  signedInAt.set(page, origin);
  const goto = page.goto.bind(page);
  page.goto = (url, options) => goto(url.startsWith("/") ? origin + url : url, options);
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
