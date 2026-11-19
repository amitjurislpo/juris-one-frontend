
import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";
import type { BusinessPunchMode } from "@/lib/punch-mode";

export interface AttendancePolicyInput {
  fullDayHours: number;
  halfDayHours: number;
  graceMinutes: number;
  lateMarksPerHalfDayLop: number;
  weeklyOffs: number[];
  absenceJobBufferMinutes: number;
  lockDayOfNextMonth: number;
  lockTime: string;
  trackingStartDate: string;
  /** How attendance is recorded: web check-in/out, a punch machine, or chosen per employee. */
  punchMode: BusinessPunchMode;
}

/** Attendance policy (REQUIREMENTS §5.4 "configurable in Policies") — saved by the API. Locked months keep their frozen values. */
export async function updateAttendancePolicy(input: AttendancePolicyInput): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/settings/attendance", input, ["/settings", "/home", "/attendance", "/register", "/team"]);
}

export type CodeSeriesMode = "AUTO" | "MANUAL";

/** How new employees get their code: Auto (the next number) or Manual (HR types it). */
export async function updateEmployeeCodeSeries(mode: CodeSeriesMode): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/settings/employee-code-series", { mode }, ["/settings", "/employees"]);
}
