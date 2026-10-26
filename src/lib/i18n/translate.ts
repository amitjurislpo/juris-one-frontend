import { DEFAULT_LANG, type Lang } from "./config";
import { trackHindiMessages } from "@/track/messages/hi";
import { trackHindiApiMessages } from "@/track/messages/hi-api";
import { hindiMessages } from "./messages/hi";
import { hindiApiMessages } from "./messages/hi-api";

// the JurisTrack pages bring their own Hindi; JurisOne's wins where both have the same text
const DICTIONARIES: Record<Lang, Record<string, string>> = {
  en: {},
  hi: { ...trackHindiApiMessages, ...trackHindiMessages, ...hindiApiMessages, ...hindiMessages },
};

export type Vars = Record<string, string | number>;

/**
 * The English text is the key: a missing translation simply shows the English text, so strings can be wrapped
 * one page at a time. `{name}` placeholders are filled from `vars`.
 */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = (lang !== DEFAULT_LANG && DICTIONARIES[lang]?.[text]) || text;
  return vars ? out.replace(/\{(\w+)\}/g, (match, placeholderName: string) => (placeholderName in vars ? String(vars[placeholderName]) : match)) : out;
}

export type T = (text: string, vars?: Vars) => string;

export const translator = (lang: Lang): T => (text, vars) => translate(lang, text, vars);
