
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// The super admin's console runs in the Spring Boot API (/api/platform).
const enc = encodeURIComponent;
const PAGES = ["/platform", "/plans"];

export interface BusinessInput {
  name: string;
  legalName?: string;
  code?: string;
  employeePrefix?: string;
  timeZone?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  gstin?: string;
}
export interface OwnerInput { name: string; email: string }
export interface SubscriptionInput { planId: string; startsOn?: string; endsOn?: string; price?: number | null; notes?: string }
export interface PlanInput { name: string; description?: string; price: number; periodMonths: number; maxEmployees: number | null; modules: string[]; active: boolean }

export async function createBusiness(i: { business: BusinessInput; subscription?: SubscriptionInput; owner?: OwnerInput; roles?: string[] }): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/platform/businesses", i, PAGES);
}

export async function updateBusiness(id: string, i: BusinessInput): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/businesses/${enc(id)}`, i, [...PAGES, `/platform/${id}`]);
}

export async function setBusinessStatus(id: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/businesses/${enc(id)}/status`, { status }, [...PAGES, `/platform/${id}`]);
}

export async function addOwner(id: string, i: OwnerInput): Promise<ActionResult<{ id: string; code: string }>> {
  return apiAction("POST", `/api/platform/businesses/${enc(id)}/owners`, i, [...PAGES, `/platform/${id}`]);
}

export async function setOwnerAccess(id: string, ownerId: string, enabled: boolean): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/businesses/${enc(id)}/owners/${enc(ownerId)}/access`, { enabled }, [`/platform/${id}`]);
}

export async function addSubscription(id: string, i: SubscriptionInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/platform/businesses/${enc(id)}/subscriptions`, i, [...PAGES, `/platform/${id}`]);
}

export async function cancelSubscription(businessId: string, subscriptionId: string): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/subscriptions/${enc(subscriptionId)}`, { status: "CANCELLED" }, [...PAGES, `/platform/${businessId}`]);
}

export async function createPlan(i: PlanInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/platform/plans", i, PAGES);
}

export async function updatePlan(id: string, i: PlanInput): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/plans/${enc(id)}`, i, PAGES);
}

export interface GrantInput { source: "COMPLIMENTARY" | "PAID"; price?: number | null; startsOn?: string; endsOn?: string; notes?: string }

export async function grantModule(businessId: string, i: GrantInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/platform/businesses/${enc(businessId)}/modules`, { module: "JURIS_TRACK", ...i }, [...PAGES, `/platform/${businessId}`]);
}

export async function revokeModule(businessId: string, grantId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/platform/modules/${enc(grantId)}`, undefined, [...PAGES, `/platform/${businessId}`]);
}

export interface RoleTemplateInput { name: string; permissions: string[]; assignable: string[]; active?: boolean }

const TEMPLATE_PAGES = ["/platform/roles", ...PAGES];

export async function createRoleTemplate(i: RoleTemplateInput): Promise<ActionResult<{ key: string }>> {
  return apiAction("POST", "/api/platform/role-templates", i, TEMPLATE_PAGES);
}

export async function updateRoleTemplate(key: string, i: RoleTemplateInput): Promise<ActionResult> {
  return apiAction("PUT", `/api/platform/role-templates/${enc(key)}`, i, TEMPLATE_PAGES);
}

export async function deleteRoleTemplate(key: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/platform/role-templates/${enc(key)}`, undefined, TEMPLATE_PAGES);
}

export async function addBusinessRole(businessId: string, templateKey: string): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", `/api/platform/businesses/${enc(businessId)}/roles`, { templateKey }, [`/platform/${businessId}`]);
}

export async function removeBusinessRole(businessId: string, roleId: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/platform/businesses/${enc(businessId)}/roles/${enc(roleId)}`, undefined, [`/platform/${businessId}`]);
}

export async function syncBusinessRole(businessId: string, roleId: string): Promise<ActionResult> {
  return apiAction("POST", `/api/platform/businesses/${enc(businessId)}/roles/${enc(roleId)}/template-syncs`, undefined, [`/platform/${businessId}`]);
}
