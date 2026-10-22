/**
 * Who may do what to an employee record (REQUIREMENTS §3.3). Pure functions — the server
 * actions call these after loading actor + target from the database.
 */

export interface Actor {
  id: string;
  roleKey: string;
  perms: ReadonlySet<string>;
  /** Role ids this actor's role may assign (role_assignable_roles). */
  assignable: ReadonlySet<string>;
  departmentId: string | null;
  /** Role id of the built-in Employee role — decides the department lock. */
  employeeRoleId: string;
}

export interface Target {
  id: string;
  roleId: string;
  roleKey: string;
  status: "ONBOARDING" | "PROBATION" | "ACTIVE" | "EXITED";
  isSuperAdmin: boolean;
}

const isAdmin = (actor: Pick<Actor, "roleKey">) => actor.roleKey === "owner" || actor.roleKey === "super_admin"; // the business owner (sub admin), or the super admin in the platform company

/** People ops can add employees only if their role can assign at least one role. */
export const canAddEmployees = (a: Actor) => a.perms.has("people.add") && (isAdmin(a) || a.assignable.size > 0);

/** Edit needs people.add and the target's role in the actor's assignable list. Admin edits anyone. Nobody edits themselves. */
export function canEditEmployee(actor: Actor, target: Target): boolean {
  if (!actor.perms.has("people.add") || actor.id === target.id || target.isSuperAdmin) return false;
  return isAdmin(actor) || actor.assignable.has(target.roleId);
}

/** access.toggle; never yourself; never the super admin; only Admin toggles an Admin; exited people stay off. */
export function canToggleAccess(actor: Actor, target: Target): boolean {
  if (!actor.perms.has("access.toggle") || actor.id === target.id || target.isSuperAdmin || target.status === "EXITED") return false;
  return isAdmin(actor) || target.roleKey !== "owner";
}

/** May the actor give `roleId` to someone? Keeping a person's current role is always allowed for an editor. */
export function canAssignRole(actor: Actor, roleId: string, currentRoleId?: string): boolean {
  if (currentRoleId && roleId === currentRoleId) return true;
  return actor.assignable.has(roleId);
}

/**
 * Managers who can't hire plain Employees (e.g. Finance Manager → Finance Executive) add people
 * into their own department only. Admin and HR choose freely.
 */
export function lockedDepartment(actor: Actor): string | null {
  if (isAdmin(actor) || actor.assignable.has(actor.employeeRoleId)) return null;
  return actor.departmentId;
}

/** Status for a new hire: Onboarding until the joining date, then Probation. */
export function initialStatus(dojIso: string, todayIso: string): "ONBOARDING" | "PROBATION" {
  return dojIso > todayIso ? "ONBOARDING" : "PROBATION";
}

/** Status as time passes (daily job): Onboarding → Probation on DOJ → Active after N months. */
export function derivedStatus(current: Target["status"], dojIso: string, todayIso: string, probationMonths: number): Target["status"] {
  if (current === "EXITED") return current;
  if (dojIso > todayIso) return "ONBOARDING";
  const [year, month, day] = dojIso.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1 + probationMonths, day)).toISOString().slice(0, 10);
  if (todayIso >= end) return current === "ONBOARDING" || current === "PROBATION" ? "ACTIVE" : current;
  return current === "ONBOARDING" ? "PROBATION" : current;
}

/** Would setting `managerId` as the manager of `employeeId` create a reporting loop? */
export function createsCycle(employeeId: string, managerId: string, managerOf: ReadonlyMap<string, string | null>): boolean {
  let cur: string | null | undefined = managerId;
  for (let i = 0; cur && i < 10_000; i++) {
    if (cur === employeeId) return true;
    cur = managerOf.get(cur);
  }
  return false;
}

// ─── locations ───
export const LOCATIONS = [
  { value: "IN_IST", label: "India · IST", timeZone: "Asia/Kolkata", region: "IN" },
  { value: "US_ET", label: "US East · ET", timeZone: "America/New_York", region: "US" },
  { value: "US_CT", label: "US Central · CT", timeZone: "America/Chicago", region: "US" },
  { value: "US_PT", label: "US West · PT", timeZone: "America/Los_Angeles", region: "US" },
] as const;

// ─── identity validation ───
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const digits = (s: string) => s.replace(/\D/g, "");
export const validAadhaar = (s: string) => digits(s).length === 12;
export const validUan = (s: string) => digits(s).length === 12;
