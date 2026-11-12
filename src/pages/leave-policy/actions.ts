import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";

export type YearEndAction = "COLLAPSE" | "CARRY_ALL" | "CARRY_CAPPED";

/** The month and day the leave year starts on (default 1 January). Admin and HR. */
export async function updateLeaveYear(startMonth: number, startDay: number): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/settings/leave-policy/year", { startMonth, startDay }, ["/leave-policy", "/settings", "/leave"]);
}

/** What happens to one leave type's balance when a leave year ends. `carryForwardCap` is sent only with CARRY_CAPPED. */
export async function updateLeaveTypeYearEnd(code: string, yearEndAction: YearEndAction, carryForwardCap: number | null): Promise<ActionResult> {
  return apiAction("PATCH", `/api/v1/settings/leave-policy/types/${encodeURIComponent(code)}`, { yearEndAction, carryForwardCap: yearEndAction === "CARRY_CAPPED" ? carryForwardCap : null }, ["/leave-policy", "/settings"]);
}
