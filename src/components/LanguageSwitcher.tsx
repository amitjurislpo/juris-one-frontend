
import { LANGUAGES } from "@/lib/i18n/config";
import { useLang, useSetLang, useT } from "@/lib/i18n/client";
import { isLang } from "@/lib/i18n/config";

/** Language picker: stores the choice in a cookie and re-renders the page in that language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const setLang = useSetLang();
  return (
    <select
      className={`lang-switch ${className}`.trim()}
      value={lang}
      aria-label={t("Language")}
      onChange={(e) => { if (isLang(e.target.value)) setLang(e.target.value); }}
    >
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
