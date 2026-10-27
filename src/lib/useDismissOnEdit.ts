import { useEffect, useRef } from "react";

/** True when the watched values differ (by identity) from the previous render's. */
export function haveWatchedValuesChanged(previous: unknown[], current: unknown[]): boolean {
  return previous.length !== current.length || current.some((value, index) => !Object.is(value, previous[index]));
}

/**
 * Calls `dismiss` as soon as any watched value changes while a message is showing, so a form's error goes the moment the user edits
 * (not on the next Save). Watch the form state; the message itself is never a dependency, so showing it does not dismiss it.
 */
export function useDismissOnEdit(message: string | null | undefined, dismiss: () => void, ...watched: unknown[]): void {
  const previous = useRef(watched);
  useEffect(() => {
    const hasChanged = haveWatchedValuesChanged(previous.current, watched);
    previous.current = watched;
    if (hasChanged && message) dismiss();
  });
}
