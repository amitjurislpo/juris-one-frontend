import { useEffect, useState } from "react";
import { SLUG_CHECK_DELAY_MS } from "@/lib/businessSlug";
import { useT } from "@/lib/i18n/client";
import { checkBusinessSlug, type SlugAvailability } from "./actions";

export type SlugCheckState = "idle" | "checking" | "available" | "unavailable" | "failed";

/** Asks the API, after a pause in typing, whether the short name is free. A stale answer is ignored; the state is "checking" from the first keystroke. */
function useSlugAvailability(slug: string): { state: SlugCheckState; availability: SlugAvailability | null } {
  const [answer, setAnswer] = useState<{ asked: string; availability: SlugAvailability | null } | null>(null);
  const trimmed = slug.trim();
  useEffect(() => {
    if (!trimmed) return;
    let isStale = false;
    const timer = setTimeout(() => {
      checkBusinessSlug(trimmed).then(
        (availability) => { if (!isStale) setAnswer({ asked: trimmed, availability }); },
        () => { if (!isStale) setAnswer({ asked: trimmed, availability: null }); },
      );
    }, SLUG_CHECK_DELAY_MS);
    return () => { isStale = true; clearTimeout(timer); };
  }, [trimmed]);
  if (!trimmed) return { state: "idle", availability: null };
  if (answer?.asked !== trimmed) return { state: "checking", availability: null };
  if (!answer.availability) return { state: "failed", availability: null };
  return { state: answer.availability.available ? "available" : "unavailable", availability: answer.availability };
}

export function ShortNameField({ value, onChange, onStateChange }: { value: string; onChange: (slug: string) => void; onStateChange: (state: SlugCheckState) => void }) {
  const t = useT();
  const { state, availability } = useSlugAvailability(value);
  useEffect(() => { onStateChange(state); }, [state, onStateChange]);
  const reasons: Record<string, string> = {
    INVALID: t("Not available: use 3 to 40 lowercase letters, numbers and dashes."),
    RESERVED: t("Not available: this name is reserved."),
    TAKEN: t("Not available: another business already uses it."),
    RETIRED: t("Not available: it was used before and can never be used again."),
  };
  return (
    <div className="field">
      <label htmlFor="new-business-short-name">{t("Short name")} <span className="hint">{t("its web address; you can edit it")}</span></label>
      <input id="new-business-short-name" value={value} onChange={(e) => onChange(e.target.value)} maxLength={40} placeholder="acme-advisors" autoCapitalize="none" spellCheck={false}
        aria-invalid={state === "unavailable" ? true : undefined} aria-describedby="new-business-short-name-status" />
      <div id="new-business-short-name-status" className="slug-status" role="status" aria-live="polite">
        {state === "checking" && <small className="muted">{t("Checking…")}</small>}
        {state === "available" && <small className="slug-ok">{t("Available")}</small>}
        {state === "failed" && <small className="muted">{t("Could not check now; it is checked again when you create.")}</small>}
        {state === "unavailable" && availability && (
          <>
            <small className="err">{reasons[availability.reason ?? ""] ?? t("Not available")}</small>
            {availability.suggestions.length > 0 && (
              <span className="slug-suggestions">
                <small className="muted">{t("Try")}</small>
                {availability.suggestions.map((suggestion) => <button type="button" key={suggestion} className="chip neutral nodot" onClick={() => onChange(suggestion)}>{suggestion}</button>)}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
