/** Permission catalogue (REQUIREMENTS §3.1). Shared by server and client — contains no data. */
export const PERMISSIONS = [
  ["self", "Own attendance, leave, payslips & tax declarations"],
  ["dir", "Employee directory"],
  ["att.all", "View everyone’s attendance (with time zones)"],
  ["appr.leave", "Approve leave"],
  ["appr.reg", "Approve attendance regularization"],
  ["people.view", "View employee records"],
  ["people.add", "Add & edit employees"],
  ["access.toggle", "Enable / disable portal access"],
  ["dept.manage", "Create departments"],
  ["holidays.manage", "Manage holiday calendar"],
  ["letters.manage", "Issue HR letters & edit letter templates"],
  ["pay.view", "View & edit payroll"],
  ["pay.close", "Close payroll & publish payslips"],
  ["struct.manage", "Salary structures"],
  ["tax.view", "Tax & TDS"],
  ["proofs.verify", "Verify investment proofs"],
  ["policies.manage", "Publish company policies & see acknowledgements"],
  ["assets.manage", "Manage the asset register & assign assets"],
  ["announcements.manage", "Post announcements"],
  ["roles.manage", "Roles, permissions & policies"],
  ["tasks.manage", "Task settings & every project and task"],
  ["projects.create", "Create task projects"],
] as const;

export type Permission = (typeof PERMISSIONS)[number][0];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p[0]) as Permission[];
export const PERMISSION_LABEL = Object.fromEntries(PERMISSIONS) as Record<Permission, string>;

export const PERMISSION_GROUPS: [string, Permission[]][] = [
  ["Self-service", ["self", "dir"]],
  ["People operations", ["att.all", "appr.leave", "appr.reg", "people.view", "people.add", "access.toggle", "dept.manage", "holidays.manage", "letters.manage"]],
  ["Finance", ["pay.view", "pay.close", "struct.manage", "tax.view", "proofs.verify"]],
  ["Administration", ["policies.manage", "assets.manage", "announcements.manage", "roles.manage"]],
  ["Tasks", ["tasks.manage", "projects.create"]],
];

/** Permissions that expose salary / tax figures. HR roles must never hold these. */
export const SALARY_PERMISSIONS: Permission[] = ["pay.view", "pay.close", "struct.manage", "tax.view", "proofs.verify"];

/** Permissions that are not in the role editor's catalogue (they belong to the Owner and the platform team) but can still be listed on a role. */
const SYSTEM_PERMISSION_LABEL: Record<string, string> = {
  "business.manage": "Manage the business, its owners and its subscription",
  "platform.manage": "Run the JurisOne platform (businesses, plans, role templates)",
};

/** A readable name for a permission key wherever one is listed; an unknown key is shown as it is. */
export const permissionLabel = (permissionKey: string, catalogue?: ReadonlyMap<string, string>): string =>
  catalogue?.get(permissionKey) ?? (PERMISSION_LABEL as Record<string, string | undefined>)[permissionKey] ?? SYSTEM_PERMISSION_LABEL[permissionKey] ?? permissionKey;
