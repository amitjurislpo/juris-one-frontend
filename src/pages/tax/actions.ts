
import type { ActionResult } from "@/lib/action";
import { apiAction, apiCall } from "@/lib/api";
import type { TaxProjection } from "@/lib/api-types";

// Tax & TDS runs in the Spring Boot API (/api/v1/tax).
const PAGES = ["/tax", "/payroll", "/declare", "/proofs"];
const enc = encodeURIComponent;

export async function taxDetail(employeeId: string): Promise<ActionResult<{ month: string; tax: TaxProjection; name: string; code: string; title: string }>> {
  return (await apiCall<{ month: string; tax: TaxProjection; name: string; code: string; title: string }>("GET", `/api/v1/tax/${enc(employeeId)}`)).body;
}

/** Finance overrides an employee's regime (REQUIREMENTS §5.9). */
export async function overrideRegime(employeeId: string, regime: "NEW" | "OLD"): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/tax/${enc(employeeId)}/regime`, { regime }, PAGES);
}

/** Previous employer income and TDS this FY (Form 12B), in rupees. */
export async function setPreviousEmployer(i: { employeeId: string; income: number; tds: number }): Promise<ActionResult> {
  return apiAction("PUT", `/api/v1/tax/${enc(i.employeeId)}/previous-employer`, { income: i.income, tds: i.tds }, PAGES);
}
