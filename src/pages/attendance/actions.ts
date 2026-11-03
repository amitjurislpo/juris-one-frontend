import type { ActionResult } from "@/lib/action";
import { apiAction, apiUpload } from "@/lib/api";
import type { RegularizationKind } from "./regularization";

// Regularization runs in the Spring Boot API (/api/v1/attendance/regularizations…).

export interface RegularizationInput {
  date: string;
  /** Last day of a range (one request per day). */
  toDate?: string;
  /** Admin / HR: raise the request for this employee. */
  employeeId?: string;
  kind: RegularizationKind;
  /** Local to the employee: yyyy-MM-ddTHH:mm. */
  checkIn: string;
  checkOut: string;
  reasonId: string;
  description: string;
}

/** A new regularization request (REQUIREMENTS §5.4); with an attachment it goes as a multipart form. Admin and HR approve it. */
export async function requestRegularization(input: RegularizationInput, attachment: File | null): Promise<ActionResult<DayOutcome[]>> {
  if (!attachment) return apiAction("POST", "/api/v1/attendance/regularizations", input, ["/attendance"]);
  const form = new FormData();
  form.append("request", JSON.stringify(input));
  form.append("file", attachment);
  return apiUpload<DayOutcome[]>("/api/v1/attendance/regularizations", form);
}

export async function cancelRegularization(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/attendance/regularizations/${encodeURIComponent(id)}`, undefined, ["/attendance"]);
}

/** One day of a request: made, or why not. */
export interface DayOutcome { date: string; ok: boolean; message: string }

export interface DecisionResult { id: string; ok: boolean; message: string }

/** Approve or reject several requests at once (Admin / HR); a rejection needs remarks. */
export async function decideRegularizations(input: { ids: string[]; approve: boolean; note?: string }): Promise<ActionResult<DecisionResult[]>> {
  return apiAction("POST", "/api/v1/attendance/regularization-decisions", input, ["/attendance"]);
}

export async function saveRegularizationRules(input: { backDateLimitDays: number; monthlyLimit: number; attachmentMandatory: boolean; autoApprove: boolean }): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/attendance/regularization-rules", input, ["/attendance"]);
}

export async function addRegularizationReason(input: { label: string; requiresDescription: boolean }): Promise<ActionResult> {
  return apiAction("POST", "/api/v1/attendance/regularization-reasons", input, ["/attendance"]);
}

export async function updateRegularizationReason(id: string, input: { label?: string; requiresDescription?: boolean; active?: boolean }): Promise<ActionResult> {
  return apiAction("PATCH", `/api/v1/attendance/regularization-reasons/${encodeURIComponent(id)}`, input, ["/attendance"]);
}
