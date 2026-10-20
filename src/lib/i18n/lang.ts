import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./config";

/** The language chosen on this browser (cookie), outside React — the API client uses it to translate API messages. */
export function readLang(): Lang {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
    const v = m ? decodeURIComponent(m[1]) : undefined;
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Remembers the chosen language for a year. */
export function writeLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.lang = lang;
}
