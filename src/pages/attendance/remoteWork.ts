import { daysBetween } from "@/lib/format";

/** Shapes and small rules of the Remote Work Requests tab (the API is /api/v1/attendance/remote-work-requests…). */

export interface RemoteWorkItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  fromDate: string;
  toDate: string;
  /** Calendar days, both ends included. */
  days: number;
  reason: string;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface RemoteWorkList { scope: "mine" | "team"; canDecide: boolean; items: RemoteWorkItem[]; total: number; page: number; pageSize: number }

/** The limits the server enforces (the form shows the same, so a request is rarely refused). */
export const REMOTE_WORK_MAX_DAYS = 31;
export const REMOTE_WORK_MAX_REASON = 500;
export const REMOTE_WORK_MAX_NOTE = 300;

/** Calendar days of a request, both ends included: 12 Nov to 14 Nov is 3. */
export const remoteWorkDays = (fromDate: string, toDate: string) => daysBetween(fromDate, toDate) + 1;

/** The first reason a request can not be sent yet (the English text is the translation key), or null when it can. */
export function remoteWorkProblem(fromDate: string, toDate: string, reason: string): string | null {
  if (!fromDate || !toDate) return "Choose the first and the last day.";
  if (toDate < fromDate) return "The last day can't be before the first day.";
  if (remoteWorkDays(fromDate, toDate) > REMOTE_WORK_MAX_DAYS) return "A request can cover at most {days} days.";
  if (!reason.trim()) return "Enter the reason for working remotely.";
  if (reason.trim().length > REMOTE_WORK_MAX_REASON) return "Keep the reason under 500 characters.";
  return null;
}

/** Who may decide a row: an approver, on a pending request that is not their own. */
export const canDecideRemoteWork = (item: RemoteWorkItem, canDecide: boolean, userId: string) => canDecide && item.status === "PENDING" && item.employeeId !== userId;
