import { useIsFetching } from "@tanstack/react-query";
import { startTransition, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * URL-backed table state. Changing any filter resets to page 1; the page's `useData(...)` refetches with the new
 * search params (search, filters, sorting and paging all run in SQL). `pending` is true while data is loading.
 */
export function useQuery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pending = useIsFetching() > 0;

  const get = useCallback((parameterName: string, dflt = "") => searchParams.get(parameterName) ?? dflt, [searchParams]);

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      // build from the browser's URL, not the router state: during a transition the state lags a change that was just made
      const next = new URLSearchParams(window.location.search);
      for (const [parameterName, parameterValue] of Object.entries(patch)) {
        if (parameterValue === null || parameterValue === "") next.delete(parameterName);
        else next.set(parameterName, parameterValue);
      }
      if (!("page" in patch)) next.delete("page");
      const queryString = next.toString();
      // a transition keeps the current rows on screen until the new ones are loaded
      const path = window.location.pathname;
      startTransition(() => { navigate(queryString ? `${path}?${queryString}` : path, { replace: true, preventScrollReset: true }); });
    },
    [navigate],
  );

  return { get, set, pending, params: searchParams };
}
