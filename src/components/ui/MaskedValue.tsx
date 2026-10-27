import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";

/**
 * A value shown masked ("XXXXXXXX1234") with an eye button that reveals it. The full value comes from `revealedText`, or, when only `reveal` is given,
 * from that call (made on the first click). With neither, the value cannot be revealed and no eye is shown.
 */
export function MaskedValue({ maskedText, revealedText, reveal }: { maskedText: string; revealedText?: string; reveal?: () => Promise<string> }) {
  const t = useT();
  const [isRevealed, setIsRevealed] = useState(false);
  const [loadedText, setLoadedText] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fullText = revealedText ?? loadedText;
  const canReveal = !!reveal || revealedText !== undefined;

  async function toggle() {
    if (isRevealed) { setIsRevealed(false); return; }
    if (fullText === null && reveal) {
      setIsBusy(true);
      try { setLoadedText(await reveal()); } catch { setIsBusy(false); return; }
      setIsBusy(false);
    }
    setIsRevealed(true);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="num">{isRevealed && fullText !== null ? fullText : maskedText}</span>
      {canReveal && (
        <button type="button" className="icon-btn" disabled={isBusy} onClick={toggle} aria-pressed={isRevealed} aria-label={isRevealed ? t("Hide value") : t("Show value")}>
          <Icon name={isRevealed ? "eyeoff" : "eye"} size={16} />
        </button>
      )}
    </span>
  );
}
