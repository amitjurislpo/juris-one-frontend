import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import { NAV, navAllowed } from "./nav";
import type { Permission } from "./permissions";

export interface CurrentUser {
  id: string;
  code: string;
  name: string;
  email: string;
  designation: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  perms: ReadonlySet<Permission>;
  isSuperAdmin: boolean;
  region: "IN" | "US";
  timeZone: string;
  hasReports: boolean;
  sessionId: string;
  /** Whether the user's business may use JurisOne today; null for the super admin. */
  subscriptionActive: boolean | null;
  /** Modules the business can use today (e.g. JURIS_TRACK). */
  modules: string[];
  /** Published policies this user still has to accept (they see only the acknowledgement screen until then). */
  pendingPolicies: number;
}

interface MeResponse {
  user: Omit<CurrentUser, "perms" | "subscriptionActive" | "modules" | "pendingPolicies"> & { perms: Permission[] };
  subscriptionActive: boolean | null;
  modules: string[];
  pendingPolicies: number;
}

export const ME_KEY = ["api", "/api/me"];

export async function fetchMe(): Promise<CurrentUser | null> {
  const me = await apiGet<MeResponse>("/api/me");
  if (!me) return null;
  return { ...me.user, perms: new Set(me.user.perms), subscriptionActive: me.subscriptionActive, modules: me.modules, pendingPolicies: me.pendingPolicies };
}

/**
 * The signed-in user, or null when signed out. The API validates the session on every request (revoked/expired session,
 * disabled access, an exited employee), so this is re-fetched whenever data is invalidated.
 * `loading` is true until the first answer.
 */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const q = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    // keep showing the user while a refetch runs
    placeholderData: (prev) => prev,
  });
  return { user: q.data ?? null, loading: q.isPending };
}

export const can = (u: CurrentUser | null, ...perms: Permission[]) => !!u && perms.some((p) => u.perms.has(p));

export function allowedNav(u: CurrentUser) {
  return NAV.filter((n) => navAllowed(n, u.perms, u.hasReports) && (!n.module || u.modules.includes(n.module)));
}

export function landingPath(u: CurrentUser) {
  if (u.perms.has("self")) return "/home";
  if (u.perms.has("roles.manage")) return "/overview";
  const first = allowedNav(u)[0];
  return first ? `/${first.id}` : "/no-access";
}
