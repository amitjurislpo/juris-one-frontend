import { useId, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";

/**
 * A numbered, collapsible section. `hasProblem` shows "Some information is missing or invalid" with a warning icon in the header.
 * `flagComment` (HR asked for a correction) gives the section a red outline and shows the comment under the header, open or not.
 */
export function Accordion({ number, title, isOpen, onToggle, hasProblem, flagComment, children }: {
  number?: number; title: string; isOpen: boolean; onToggle: () => void; hasProblem?: boolean; flagComment?: string; children: ReactNode;
}) {
  const t = useT();
  const bodyId = useId();
  return (
    <section className={`accordion${isOpen ? " open" : ""}${hasProblem ? " has-problem" : ""}${flagComment !== undefined ? " is-flagged" : ""}`}>
      <button type="button" className="accordion-h" aria-expanded={isOpen} aria-controls={bodyId} onClick={onToggle}>
        {number !== undefined && <span className="accordion-number">{number}</span>}
        <span className="accordion-title">{title}</span>
        {hasProblem && <span className="accordion-warning"><Icon name="info" size={15} />{t("Some information is missing or invalid")}</span>}
        <Icon name={isOpen ? "chevD" : "chevR"} size={16} />
      </button>
      {flagComment !== undefined && <p className="review-flag-comment" role="note"><b>{t("HR comment")}:</b> {flagComment || t("Please correct this section.")}</p>}
      <div id={bodyId} className="accordion-b" hidden={!isOpen}>{children}</div>
    </section>
  );
}
