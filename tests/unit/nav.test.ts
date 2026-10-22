import { describe, expect, it } from "vitest";
import { landingFor, NAV, navAllowed } from "@/lib/nav";
import { PERMISSION_KEYS, SALARY_PERMISSIONS } from "@/lib/permissions";

const set = (...p: string[]) => new Set(p);
const visible = (perms: Set<string>, reports = false) => NAV.filter((item) => navAllowed(item, perms, reports)).map((item) => item.id);

const ADMIN = set(...PERMISSION_KEYS.filter((p) => p !== "self"));
const HR_MANAGER = set("self", "dir", "att.all", "appr.leave", "appr.reg", "people.view", "people.add", "access.toggle", "dept.manage", "holidays.manage");
const FIN_EXEC = set("self", "dir", "appr.reg", "pay.view", "tax.view", "proofs.verify");
const EMPLOYEE = set("self", "dir");

describe("navigation access", () => {
  it("lands Admin on Overview and everyone with self on Home", () => {
    expect(landingFor(ADMIN)).toBe("/overview");
    expect(landingFor(EMPLOYEE)).toBe("/home");
    expect(landingFor(HR_MANAGER)).toBe("/home");
  });

  it("gives Admin no self-service pages", () => {
    const visibleIds = visible(ADMIN);
    for (const id of ["home", "attendance", "leave", "payslips", "declare"]) expect(visibleIds).not.toContain(id);
    expect(visibleIds).toContain("roles");
  });

  it("never shows finance pages to HR", () => {
    const visibleIds = visible(HR_MANAGER);
    for (const id of ["payroll", "structures", "tax", "proofs"]) expect(visibleIds).not.toContain(id);
    for (const permission of SALARY_PERMISSIONS) expect(HR_MANAGER.has(permission)).toBe(false);
  });

  it("shows My team only with active direct reports", () => {
    expect(visible(EMPLOYEE, false)).not.toContain("team");
    expect(visible(EMPLOYEE, true)).toContain("team");
  });

  it("lets Finance Executive approve regularizations but not leave", () => {
    const visibleIds = visible(FIN_EXEC);
    expect(visibleIds).toContain("approvals");
    expect(visibleIds).toContain("payroll");
    expect(visibleIds).not.toContain("register");
  });

  it("shows My letters to everyone with self; HR letters only to those who manage them", () => {
    expect(visible(EMPLOYEE)).toContain("my-letters");
    expect(visible(EMPLOYEE)).not.toContain("letters");
    expect(visible(set(...HR_MANAGER, "letters.manage"))).toContain("letters");
    expect(visible(ADMIN)).toContain("letters");
  });
});
