/** The requests that can be raised from the Attendance summary's Request menu, and which of them the menu offers. */

export type RequestKind = "regularization" | "on-duty" | "remote-work";

/** English labels (the key of the Hindi translation). */
export const REQUEST_LABEL: Record<RequestKind, string> = { regularization: "Regularization", "on-duty": "On Duty", "remote-work": "Remote Work" };

/**
 * What the menu offers: On Duty and Remote Work always, Regularization only when the viewed month is open (a locked month takes no
 * regularization). Nothing at all in the read-only mode of an ended subscription.
 */
export function requestMenuKinds({ isReadOnly, isMonthLocked }: { isReadOnly: boolean; isMonthLocked: boolean }): RequestKind[] {
  if (isReadOnly) return [];
  return isMonthLocked ? ["on-duty", "remote-work"] : ["regularization", "on-duty", "remote-work"];
}

/** A pending request can be changed by the person who raised it (the server checks the same). */
export const canEditRequest = (item: { status: string; createdBy: string | null }, userId: string, isReadOnly: boolean) => !isReadOnly && item.status === "PENDING" && item.createdBy === userId;

/** The request body for a chosen employee: nothing is sent when the request is for the signed-in user (the server then uses the session). */
export function onBehalfOf(employeeId: string | undefined): { employeeId?: string } {
  return employeeId ? { employeeId } : {};
}
