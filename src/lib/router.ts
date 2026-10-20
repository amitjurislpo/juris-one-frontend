import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router";
import { refreshData } from "./query";

/**
 * The few `next/navigation` hooks the components use, on top of React Router, so component code reads the same:
 * `const router = useRouter(); router.push("/x"); router.refresh()`.
 */
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (to: string) => navigate(to),
      replace: (to: string, _opts?: { scroll?: boolean }) => navigate(to, { replace: true }),
      back: () => navigate(-1),
      /** Refetch the data on screen. */
      refresh: () => { void refreshData(); },
    }),
    [navigate],
  );
}

export const usePathname = () => useLocation().pathname;

export function useSearchParams() {
  const [sp] = useRouterSearchParams();
  return sp;
}

/** Search params as a plain object (first value of each), like the old `searchParams` prop of a page. */
export function useSearchRecord(): Record<string, string> {
  const sp = useSearchParams();
  const s = sp.toString();
  return useMemo(() => Object.fromEntries(new URLSearchParams(s).entries()), [s]);
}
