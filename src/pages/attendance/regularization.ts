/** Shapes and small helpers shared by the attendance regularization screens (the API is /api/v1/attendance/regularizations…). */

export type RegularizationKind = "ABSENT" | "LATE_CHECKIN" | "MISSED_CHECKOUT" | "HOLIDAY_WORK";

/** English label of each request type (the key of the Hindi translation). */
export const KIND_LABEL: Record<string, string> = { ABSENT: "Absent", LATE_CHECKIN: "Late check-in", MISSED_CHECKOUT: "Missed check-out", HOLIDAY_WORK: "Holiday work (comp-off)" };

/** The stored status DECLINED is shown as "Rejected". */
export const STATUS_LABEL: Record<string, string> = { PENDING: "Waiting for approval", APPROVED: "Approved", DECLINED: "Rejected", CANCELLED: "Cancelled" };
export const STATUS_CHIP: Record<string, string> = { PENDING: "warn", APPROVED: "ok", DECLINED: "bad", CANCELLED: "neutral" };

/** English label of each day status in the Old / New columns. */
export const DAY_STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present", HALF_DAY: "Half day", ABSENT: "Absent", LEAVE: "Leave", HOLIDAY: "Holiday", WEEKLY_OFF: "Weekly off", PENDING: "In progress",
  BEFORE_JOINING: "Before joining", AFTER_EXIT: "After exit", NOT_TRACKED: "Not tracked",
};

export interface RegularizationItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  date: string;
  kind: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  oldCheckIn: string | null;
  oldCheckOut: string | null;
  oldMinutes: number | null;
  newMinutes: number | null;
  oldStatus: string | null;
  newStatus: string | null;
  reasonId: string | null;
  reason: string | null;
  description: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  hasAttachment: boolean;
  attachmentName: string | null;
  createdAt: string;
}

export interface RegularizationList { scope: "mine" | "all"; items: RegularizationItem[]; total: number; page: number; pageSize: number }

interface RegularizationReason { id: string; label: string; requiresDescription: boolean; active: boolean; sortOrder: number }

export interface RegularizationRules {
  backDateLimitDays: number;
  monthlyLimit: number;
  attachmentMandatory: boolean;
  autoApprove: boolean;
  maxAttachmentMb: number;
  month: string;
  usedThisMonth: number;
  remainingThisMonth: number;
  reasons: RegularizationReason[];
}

export interface DayPreview {
  date: string;
  status: string;
  label: string;
  checkInLocal: string | null;
  checkOutLocal: string | null;
  workedMinutes: number;
  eligibleKinds: RegularizationKind[];
}

/** 570 → "9:30". */
export const formatMinutes = (minutes: number | null) => (minutes === null ? "—" : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`);

/** Minutes between two `yyyy-MM-ddTHH:mm` values of the same zone; null while either is missing or the order is wrong. */
export function minutesBetweenLocal(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null;
  const minutes = Math.round((Date.parse(`${checkOut}:00Z`) - Date.parse(`${checkIn}:00Z`)) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

/**
 * What a form field shows once the day's preview arrives from the server: the server's value, unless the user has already typed in the
 * field since the day changed (then their value stays, so a slow preview never wipes it).
 */
export function prefillUnlessTouched<Value>(typed: Value, fromServer: Value, isTouched: boolean): Value {
  return isTouched ? typed : fromServer;
}
