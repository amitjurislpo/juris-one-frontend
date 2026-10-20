import { useIsFetching } from "@tanstack/react-query";
import { startTransition, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * URL-backed table state. Changing any filter resets to page 1; the page's `useData(...)` refetches with the new
 * search params (search, filters, sorting and paging all run in SQL). `pending` is true while data is loading.
 */
export function useQuery() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const pending = useIsFetching() > 0;

  const get = useCallback((k: string, dflt = "") => sp.get(k) ?? dflt, [sp]);

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      // build from the browser's URL, not the router state: during a transition the state lags a change that was just made
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      // a transition keeps the current rows on screen until the new ones are loaded
      const path = window.location.pathname;
      startTransition(() => { navigate(qs ? `${path}?${qs}` : path, { replace: true, preventScrollReset: true }); });
    },
    [navigate],
  );

  return { get, set, pending, params: sp };
}
