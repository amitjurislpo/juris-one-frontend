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

/** Dictionary keys with {placeholders} ("Keep the {field} under {max} characters."), compiled once per language into patterns. */
const templateCache: Partial<Record<Lang, { pattern: RegExp; hindi: string; names: string[] }[]>> = {};
const matchCache = new Map<string, string | null>();

/** A template needs this many fixed letters, so short UI labels like "{name}: {reason}" or "Edit {title}" never match a server sentence by accident. */
const MINIMUM_FIXED_LETTERS = 8;
const fixedLetters = (key: string) => key.replace(/\{\w+\}/g, "").replace(/[^A-Za-z]/g, "").length;

function compileTemplates(lang: Lang) {
  // the most specific template (most fixed text) is tried first
  const keys = Object.keys(DICTIONARIES[lang]).filter((key) => /\{\w+\}/.test(key) && fixedLetters(key) >= MINIMUM_FIXED_LETTERS).sort((a, b) => fixedLetters(b) - fixedLetters(a));
  return keys.map((key) => {
    const names: string[] = [];
    const source = key.split(/\{(\w+)\}/).map((piece, i) => (i % 2 === 0 ? piece.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : (names.push(piece), "([\\s\\S]+?)"))).join("");
    return { pattern: new RegExp(`^${source}$`), hindi: DICTIONARIES[lang][key], names };
  });
}

const templatesOf = (lang: Lang) => (templateCache[lang] ??= compileTemplates(lang));

/**
 * A value inside a composed sentence: a lower-case dictionary entry ("published", "in repair") or a month with its year
 * ("October 2026"), else as it is. Names, codes and tags (capitalised) are never translated.
 */
function translateValue(lang: Lang, value: string): string {
  return (/^[a-z]/.test(value) ? DICTIONARIES[lang][value] : undefined) ?? value.replace(/^([A-Za-z]+)( \d{4})$/, (match, word: string, year: string) => (DICTIONARIES[lang][word] ? DICTIONARIES[lang][word] + year : match));
}

/**
 * Translates a text the server composed from a fixed sentence and values ("Keep the name under 80 characters."): the
 * dictionary key is the sentence with {placeholders}, the values found in the text are put into the Hindi. Used when
 * there is no exact entry. Undefined when no template fits.
 */
function translateTemplate(lang: Lang, text: string): string | undefined {
  const cacheKey = `${lang}:${text}`;
  const cached = matchCache.get(cacheKey);
  if (cached !== undefined) return cached ?? undefined;
  let result: string | undefined;
  for (const { pattern, hindi, names } of templatesOf(lang)) {
    const found = pattern.exec(text);
    if (!found) continue;
    const values = Object.fromEntries(names.map((name, i) => [name, translateValue(lang, found[i + 1])]));
    result = hindi.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? values[name] : match));
    break;
  }
  matchCache.set(cacheKey, result ?? null);
  return result;
}

/**
 * The English text is the key: a missing translation simply shows the English text, so strings can be wrapped
 * one page at a time. `{name}` placeholders are filled from `vars`. A text the server built from a sentence and values
 * is matched against the dictionary keys that have {placeholders}.
 */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = lang === DEFAULT_LANG ? text : (DICTIONARIES[lang]?.[text] || translateTemplate(lang, text) || text);
  return vars ? out.replace(/\{(\w+)\}/g, (match, placeholderName: string) => (placeholderName in vars ? String(vars[placeholderName]) : match)) : out;
}

export type T = (text: string, vars?: Vars) => string;

export const translator = (lang: Lang): T => (text, vars) => translate(lang, text, vars);
