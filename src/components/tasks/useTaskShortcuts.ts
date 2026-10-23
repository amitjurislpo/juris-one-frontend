import { useEffect, useRef } from "react";

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return !!element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
};

/** Page shortcuts when focus is not in a field and no dialog is open: `n` = new task, `/` = focus the search box. */
export function useTaskShortcuts(onNewTask: (() => void) | null) {
  const handler = useRef(onNewTask);
  useEffect(() => { handler.current = onNewTask; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      if (e.key === "n" && handler.current) { e.preventDefault(); handler.current(); }
      else if (e.key === "/") {
        const search = document.querySelector<HTMLInputElement>("main .tsearch input");
        if (search) { e.preventDefault(); search.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
