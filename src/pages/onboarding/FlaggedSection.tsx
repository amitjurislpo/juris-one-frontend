import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

/** A whole step that HR flagged: a red outline and HR's comment on top. Without a comment (not flagged) it renders its children as they are. */
export function FlaggedSection({ comment, children }: { comment: string | undefined; children: ReactNode }) {
  const t = useT();
  if (comment === undefined) return <>{children}</>;
  return (
    <div className="flagged-section">
      <p className="review-flag-comment" role="note"><b>{t("HR comment")}:</b> {comment || t("Please correct this section.")}</p>
      {children}
    </div>
  );
}
