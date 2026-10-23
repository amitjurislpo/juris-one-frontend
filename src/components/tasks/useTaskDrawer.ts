import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";

/**
 * The task side panel lives in the URL (`?task=WEB-12`), so it can be bookmarked and the Back button closes it.
 * Opening pushes a history entry; closing replaces the URL without the parameter. Other parameters (filters, page) stay.
 */
export function useTaskDrawer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskRef = searchParams.get("task");
  const go = useCallback((ref: string | null, replace: boolean) => {
    const next = new URLSearchParams(window.location.search);
    if (ref) next.set("task", ref); else next.delete("task");
    const queryString = next.toString();
    navigate(`${window.location.pathname}${queryString ? `?${queryString}` : ""}`, { replace, preventScrollReset: true });
  }, [navigate]);
  const openTask = useCallback((ref: string) => go(ref, false), [go]);
  const closeTask = useCallback(() => go(null, true), [go]);
  return { taskRef, openTask, closeTask };
}
