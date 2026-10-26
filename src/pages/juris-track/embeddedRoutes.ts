import { trackRoutes, type TrackRoute } from "@/track";

/**
 * The JurisTrack pages that exist inside JurisOne: the personal time-tracking section for everybody, and the Team pages of a
 * manager (the roster included). The owner's administration (employees, shifts, settings, audit) and the platform pages stay
 * in standalone JurisTrack: JurisOne has its own for those.
 */
const EMBEDDED_ROSTER = "admin/roster";
export const EMBEDDED_ROUTES: TrackRoute[] = trackRoutes.filter(
  (route) => !route.path.startsWith("admin") && !route.path.startsWith("platform") || route.path === EMBEDDED_ROSTER,
);

/** The tabs of the module, in order: a tab shows when the user's JurisTrack role may open its page. `label` is a translation key. */
export const SUB_NAV: { path: string; label: string }[] = [
  { path: "dashboard", label: "Dashboard" },
  { path: "my-time", label: "My Time" },
  { path: "my-schedule", label: "My Schedule" },
  { path: "my-history", label: "My History" },
  { path: "profile", label: "Profile" },
  { path: "team", label: "Team" },
  { path: "admin/roster", label: "Roster" },
  { path: "team/reports", label: "Reports" },
];
