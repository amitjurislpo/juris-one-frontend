
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// Company policies run in the Spring Boot API (/api/v1/policies).
const enc = encodeURIComponent;
const PAGES = ["/policies", "/my-policies", "/acknowledge"];

export interface PolicyInput { title: string; body: string; requiresAcknowledgement: boolean }

export async function createPolicy(i: PolicyInput): Promise<ActionResult<{ id: string }>> {
  return apiAction("POST", "/api/v1/policies", i, PAGES);
}

export async function updatePolicy(id: string, i: PolicyInput): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/policies/${enc(id)}`, i, [...PAGES, `/policies/${id}`]);
}

export async function deletePolicy(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/policies/${enc(id)}`, undefined, PAGES);
}

export async function setPolicyStatus(id: string, status: "PUBLISHED" | "ARCHIVED"): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/policies/${enc(id)}/status`, { status }, [...PAGES, `/policies/${id}`]);
}

export async function removePolicyFile(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/policies/${enc(id)}/file`, undefined, [`/policies/${id}`]);
}

export async function remindPolicy(id: string): Promise<ActionResult<{ count: number }>> {
  return apiAction("POST", `/api/v1/policies/${enc(id)}/reminders`, {}, [`/policies/${id}`]);
}

/** "I have read and accept" the given version. */
export async function acknowledgePolicy(id: string, version: number): Promise<ActionResult> {
  return apiAction("POST", `/api/v1/policies/${enc(id)}/acknowledgements`, { version }, [...PAGES, "/", "/home", "/overview"]);
}
