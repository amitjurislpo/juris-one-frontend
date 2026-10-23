import { lazy, type ComponentType } from "react";
import type { NavId } from "@/lib/nav";

/**
 * Every page of the app. `nav` is the access check (the nav entry whose permission opens the page; see RequirePage), absent
 * for pages that only need a signed-in user. Pages are code-split: each is its own chunk, loaded on first visit.
 */
export interface RouteDef {
  path: string;
  title: string;
  nav?: NavId;
  /** Needs a signed-in user but is outside the nav (acknowledge, paused). */
  user?: boolean;
  Page: ComponentType;
}

const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load);

export const APP_ROUTES: RouteDef[] = [
  { path: "home", title: "Home", nav: "home", Page: page(() => import("@/pages/home/page")) },
  { path: "overview", title: "Overview", nav: "overview", Page: page(() => import("@/pages/overview/page")) },
  { path: "attendance", title: "My attendance", nav: "attendance", Page: page(() => import("@/pages/attendance/page")) },
  { path: "leave", title: "Leave & holidays", nav: "leave", Page: page(() => import("@/pages/leave/page")) },
  { path: "payslips", title: "Payslips", nav: "payslips", Page: page(() => import("@/pages/payslips/page")) },
  { path: "declare", title: "Tax declarations", nav: "declare", Page: page(() => import("@/pages/declare/page")) },
  { path: "directory", title: "Directory", nav: "directory", Page: page(() => import("@/pages/directory/page")) },
  { path: "team", title: "My team", nav: "team", Page: page(() => import("@/pages/team/page")) },
  { path: "register", title: "Attendance register", nav: "register", Page: page(() => import("@/pages/register/page")) },
  { path: "approvals", title: "Approvals", nav: "approvals", Page: page(() => import("@/pages/approvals/page")) },
  { path: "employees", title: "Employees", nav: "employees", Page: page(() => import("@/pages/employees/page")) },
  { path: "onboarding", title: "Onboarding", nav: "onboarding", Page: page(() => import("@/pages/onboarding/page")) },
  { path: "onboarding/:id", title: "Onboarding", nav: "onboarding", Page: page(() => import("@/pages/onboarding/[id]/page")) },
  { path: "departments", title: "Departments", nav: "departments", Page: page(() => import("@/pages/departments/page")) },
  { path: "holidays", title: "Holiday calendar", nav: "holidays", Page: page(() => import("@/pages/holidays/page")) },
  { path: "payroll", title: "Payroll", nav: "payroll", Page: page(() => import("@/pages/payroll/page")) },
  { path: "structures", title: "Salary structures", nav: "structures", Page: page(() => import("@/pages/structures/page")) },
  { path: "tax", title: "Tax & TDS", nav: "tax", Page: page(() => import("@/pages/tax/page")) },
  { path: "proofs", title: "Investment proofs", nav: "proofs", Page: page(() => import("@/pages/proofs/page")) },
  { path: "roles", title: "Roles & permissions", nav: "roles", Page: page(() => import("@/pages/roles/page")) },
  { path: "policies", title: "Company policies", nav: "policies", Page: page(() => import("@/pages/policies/page")) },
  { path: "policies/:id", title: "Policy", nav: "policies", Page: page(() => import("@/pages/policies/[id]/page")) },
  { path: "my-policies", title: "My policies", nav: "my-policies", Page: page(() => import("@/pages/my-policies/page")) },
  { path: "settings", title: "Settings", nav: "settings", Page: page(() => import("@/pages/settings/page")) },
  { path: "audit", title: "Audit log", nav: "audit", Page: page(() => import("@/pages/audit/page")) },
  { path: "subscription", title: "Subscription", nav: "subscription", Page: page(() => import("@/pages/subscription/page")) },
  { path: "platform", title: "Businesses", nav: "platform", Page: page(() => import("@/pages/platform/page")) },
  { path: "platform/audit", title: "Audit log", nav: "platform-audit", Page: page(() => import("@/pages/platform-audit/page")) },
  { path: "platform/roles", title: "Role templates", nav: "plans", Page: page(() => import("@/pages/role-templates/page")) },
  { path: "platform/:id", title: "Business", nav: "platform", Page: page(() => import("@/pages/platform/[id]/page")) },
  { path: "plans", title: "Plans", nav: "plans", Page: page(() => import("@/pages/plans/page")) },
  { path: "juris-track", title: "Juris Track", nav: "juris-track", Page: page(() => import("@/pages/juris-track/page")) },
  { path: "notifications", title: "Notifications", nav: "notifications", Page: page(() => import("@/pages/notifications/page")) },
  { path: "profile", title: "My profile", nav: "profile", Page: page(() => import("@/pages/profile/page")) },
  { path: "my-assets", title: "My assets", nav: "my-assets", Page: page(() => import("@/pages/my-assets/page")) },
  { path: "assets", title: "Assets", nav: "assets", Page: page(() => import("@/pages/assets/page")) },
  { path: "announcements", title: "Announcements", nav: "announcements", Page: page(() => import("@/pages/announcements/page")) },
  { path: "manage-announcements", title: "Post announcements", nav: "manage-announcements", Page: page(() => import("@/pages/manage-announcements/page")) },
  { path: "my-letters", title: "My letters", nav: "my-letters", Page: page(() => import("@/pages/my-letters/page")) },
  { path: "letters", title: "HR letters", nav: "letters", Page: page(() => import("@/pages/letters/page")) },
  { path: "my-tasks", title: "My tasks", nav: "my-tasks", Page: page(() => import("@/pages/my-tasks/page")) },
  { path: "team-tasks", title: "Team tasks", nav: "team-tasks", Page: page(() => import("@/pages/team-tasks/page")) },
  { path: "projects", title: "Projects", nav: "projects", Page: page(() => import("@/pages/projects/page")) },
  { path: "projects/:id", title: "Project", nav: "projects", Page: page(() => import("@/pages/projects/[id]/page")) },
  { path: "projects/:id/settings", title: "Project settings", nav: "projects", Page: page(() => import("@/pages/projects/[id]/settings/page")) },
  { path: "tasks/:ref", title: "Task", nav: "my-tasks", Page: page(() => import("@/pages/tasks/[ref]/page")) },
  { path: "task-settings", title: "Task settings", nav: "task-settings", Page: page(() => import("@/pages/task-settings/page")) },
  { path: "acknowledge", title: "Accept company policies", user: true, Page: page(() => import("@/pages/acknowledge/page")) },
  { path: "paused", title: "Subscription ended", user: true, Page: page(() => import("@/pages/paused/page")) },
];

/** Public pages (no session): sign-in and the candidate's onboarding. */
export const PUBLIC_ROUTES: { path: string; title: string; Page: ComponentType }[] = [
  { path: "login", title: "Sign in", Page: page(() => import("@/pages/auth/login/page")) },
  { path: "onboard/:token", title: "Your onboarding", Page: page(() => import("@/pages/auth/onboard/[token]/page")) },
];
