import type { SubscriptionCurrent } from "./api-types";
import { formatDayMonthYear } from "./format";

/** Chip class and text for a business's subscription today. */
export function subscriptionChip(subscription: SubscriptionCurrent | null): { className: string; text: string } {
  if (!subscription || subscription.state === "NONE") return { className: "neutral", text: "No plan" };
  if (subscription.state === "UPCOMING") return { className: "info", text: `Starts ${formatDayMonthYear(subscription.startsOn!)}` };
  if (subscription.state === "EXPIRED") return { className: "bad", text: `Ended ${formatDayMonthYear(subscription.endsOn!)}` };
  if (subscription.daysLeft !== null && subscription.daysLeft <= 7) return { className: "warn", text: subscription.daysLeft === 0 ? "Ends today" : `${subscription.daysLeft} day${subscription.daysLeft === 1 ? "" : "s"} left` };
  return { className: "ok", text: `Until ${formatDayMonthYear(subscription.endsOn!)}` };
}

/** Human names for plan modules. */
export const MODULE_LABELS: Record<string, string> = { JURIS_TRACK: "Juris Track" };
