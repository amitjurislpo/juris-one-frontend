import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/client";

/** Full-page overlay with a cloud icon and "Saving..." while a step is being saved. */
export function SavingOverlay() {
  const t = useT();
  return createPortal(
    <div className="saving-overlay" role="alert" aria-live="assertive" aria-busy="true">
      <div className="saving-box">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4 4 0 0 1 0 8z" /></svg>
        <b>{t("Saving...")}</b>
      </div>
    </div>,
    document.body,
  );
}
