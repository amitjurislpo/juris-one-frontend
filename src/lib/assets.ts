/** Labels for the asset register and announcements (plain English; shared by server and client). */
export const ASSET_TYPES: Record<string, string> = {
  LAPTOP: "Laptop", DESKTOP: "Desktop", PHONE: "Phone", TABLET: "Tablet", MONITOR: "Monitor", ACCESSORY: "Accessory", OTHER: "Other",
};
export const ASSET_STATUS: Record<string, { className: string; text: string }> = {
  AVAILABLE: { className: "ok", text: "Available" }, ASSIGNED: { className: "info", text: "Assigned" }, IN_REPAIR: { className: "warn", text: "In repair" }, RETIRED: { className: "neutral", text: "Retired" },
};
export const CONDITIONS: Record<string, string> = { GOOD: "Good", FAIR: "Fair", DAMAGED: "Damaged (send to repair)", LOST: "Lost (retire)" };
export const AUDIENCES: Record<string, string> = { ALL: "Everyone", IN: "India", US: "US" };
