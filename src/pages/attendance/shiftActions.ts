import type { ActionResult } from "@/lib/action";
import { apiAction } from "@/lib/api";
import type { RosterShift } from "./shiftRoster";

// The shift roster runs in the Spring Boot API (/api/v1/attendance/shifts, /shift-assignments).

export interface ShiftInput {
  name: string;
  /** "HH:mm". */
  startLocal: string;
  endLocal: string;
  region?: "IN" | "US";
}

export async function createShift(input: ShiftInput): Promise<ActionResult<RosterShift>> {
  return apiAction("POST", "/api/v1/attendance/shifts", input, ["/attendance"]);
}

export async function updateShift(id: string, input: Partial<ShiftInput>): Promise<ActionResult<RosterShift>> {
  return apiAction("PATCH", `/api/v1/attendance/shifts/${encodeURIComponent(id)}`, input, ["/attendance"]);
}

export interface ShiftAssignmentInput {
  employeeIds: string[];
  shiftId: string;
  fromDate: string;
  /** Empty = open ended. */
  toDate?: string;
}

/** Puts the employees on the shift from a date to a date; any overlap with an existing assignment refuses all of them. */
export async function assignShift(input: ShiftAssignmentInput): Promise<ActionResult<string[]>> {
  return apiAction("POST", "/api/v1/attendance/shift-assignments", input, ["/attendance"]);
}

export async function removeShiftAssignment(id: string): Promise<ActionResult> {
  return apiAction("DELETE", `/api/v1/attendance/shift-assignments/${encodeURIComponent(id)}`, undefined, ["/attendance"]);
}
