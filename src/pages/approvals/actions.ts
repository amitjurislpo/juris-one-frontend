
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

// Decisions run in the Spring Boot API (PUT …/{id}/decision); the first decision wins there.
const enc = encodeURIComponent;
const PAGES = ["/approvals", "/leave", "/attendance", "/home", "/register", "/team"];

/** HR (`appr.leave`; Admin too). Approving posts the used days to the ledger; any shortfall is LOP. */
export async function decideLeave(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/leave/requests/${enc(input.id)}/decision`, { approve: input.approve, note: input.note }, PAGES);
}

/** Regularization goes to Admin and HR together (`appr.reg`); the first decision is final and a rejection needs remarks. */
export async function decideRegularization(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/attendance/regularizations/${enc(input.id)}/decision`, { approve: input.approve, note: input.note }, PAGES);
}

/** An On Duty request in the Attendance queue (the Admin, or the HR person's reporting manager); the first decision is final and a rejection needs remarks. */
export async function decideOnDuty(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/attendance/on-duty-requests/${enc(input.id)}/decision`, { approve: input.approve, note: input.note }, PAGES);
}

/** A Remote Work request in the Attendance queue; decided like an On Duty request. */
export async function decideRemoteWorkRequest(input: { id: string; approve: boolean; note?: string }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/attendance/remote-work-requests/${enc(input.id)}/decision`, { approve: input.approve, note: input.note }, PAGES);
}
