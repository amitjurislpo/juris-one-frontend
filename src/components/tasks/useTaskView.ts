import { useCallback } from "react";
import { useQuery } from "@/components/table/useQuery";

export type TaskView = "list" | "board";

const read = (storageKey: string): TaskView | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === "list" || stored === "board" ? stored : null;
  } catch {
    return null;
  }
};

/**
 * List or board: the URL's `view=` wins, else the person's last choice on this page (kept in this browser only), else
 * the page's default (List for My tasks, Board for a project).
 */
export function useTaskView(storageKey: string, defaultView: TaskView) {
  const { get, set } = useQuery();
  const fromUrl = get("view");
  const view: TaskView = fromUrl === "list" || fromUrl === "board" ? fromUrl : read(storageKey) ?? defaultView;
  const setView = useCallback((next: TaskView) => {
    try { localStorage.setItem(storageKey, next); } catch { /* private window: the URL still carries it */ }
    set({ view: next });
  }, [set, storageKey]);
  return { view, setView };
}
