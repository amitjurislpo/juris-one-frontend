import { useCallback } from "react";
import { useLang } from "./i18n/client";
import { DEFAULT_LANG, type Lang } from "./i18n/config";
import { hindiDayParts, hindiMonthAbbreviations, hindiNotificationTemplates } from "./i18n/messages/hi-notifications";
import { translate } from "./i18n/translate";

/**
 * The API stores notification texts in English, with the data already filled in ("WEB-6 moved to In progress by Nazneen Khan").
 * Each template in `hi-notifications.ts` is turned into a pattern here; the text is matched, its parts are picked out, and the Hindi
 * sentence is filled with them. Parts that are data (names, task keys and titles, project names) stay as they are; enumerations (status,
 * leave type, role, regularization kind, month) go through the dictionary. A text no template matches is shown unchanged.
 */

type PartKind = "text" | "enum" | "date" | "month" | "asset";
interface Part { pattern: string; kind: PartKind }

const TEXT: Part = { pattern: ".+?", kind: "text" };
const ENUM: Part = { pattern: ".+?", kind: "enum" };
const DATE: Part = { pattern: "(?:[A-Za-z]{3}, )?\\d{1,2} [A-Za-z]{3}(?: \\d{4})?", kind: "date" };

/** What each `{placeholder}` of a template matches. Anything not listed is plain text. */
const PARTS: Record<string, Part> = {
  date: DATE,
  from: DATE,
  to: DATE,
  due: { pattern: "\\d{1,2} [A-Za-z]{3} \\d{4}(?: \\d{2}:\\d{2})?", kind: "date" },
  time: { pattern: "\\d{2}:\\d{2}", kind: "text" },
  n: { pattern: "\\d+", kind: "text" },
  days: { pattern: "\\d+", kind: "text" },
  month: { pattern: "[A-Za-z]+ \\d{4}", kind: "month" },
  label: { pattern: "Personal task|[^\\s:]+", kind: "enum" },
  kind: { pattern: "Absence regularization|Late check-in regularization|Missed check-out regularization|Comp-off request", kind: "enum" },
  type: ENUM,
  role: ENUM,
  item: ENUM,
  asset: { pattern: ".+?", kind: "asset" },
  status: { pattern: ".+", kind: "enum" }, // greedy: a status may contain " by ", the name after the last " by " is the person
};

const part = (name: string): Part => PARTS[name] ?? TEXT;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface CompiledTemplate { expression: RegExp; names: string[]; hindi: string }

/** "{a} did {b}" becomes /^(.+?) did (.+?)$/s with the names [a, b]. */
function compile(english: string, hindi: string): CompiledTemplate {
  const names: string[] = [];
  const source = english.split(/(\{\w+\})/).map((piece) => {
    const placeholder = /^\{(\w+)\}$/.exec(piece);
    if (!placeholder) return escapeRegex(piece);
    names.push(placeholder[1]);
    return `(${part(placeholder[1]).pattern})`;
  }).join("");
  return { expression: new RegExp(`^${source}$`, "s"), names, hindi };
}

const TEMPLATES: CompiledTemplate[] = Object.entries(hindiNotificationTemplates).map(([english, hindi]) => compile(english, hindi));

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Month, weekday and day-part words of a printed date or time ("7 Oct, 8:49 pm", "Mon, 14 Oct 2026") in Hindi. */
export function localizeDates(lang: Lang, text: string): string {
  if (lang === DEFAULT_LANG) return text;
  return text
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (month) => hindiMonthAbbreviations[month] ?? month)
    .replace(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/g, (day) => translate(lang, day))
    .replace(/\b(am|pm)\b/g, (dayPart) => hindiDayParts[dayPart] ?? dayPart);
}

function convert(lang: Lang, value: string, kind: PartKind): string {
  switch (kind) {
    case "enum": return translate(lang, value);
    case "date": return localizeDates(lang, value);
    case "month": return value.replace(/^[A-Za-z]+/, (monthName) => translate(lang, monthName));
    case "asset": { const translated = translate(lang, capitalised(value)); return translated === capitalised(value) ? value : translated; }
    default: return value;
  }
}

/**
 * A notification text (or a bell line / its small caption) in the chosen language. English and unknown texts come back as they are;
 * this never throws and never returns an empty string for a non-empty text.
 */
export function translateNotificationText(lang: Lang, text: string): string {
  if (lang === DEFAULT_LANG || !text) return text;
  try {
    for (const template of TEMPLATES) {
      const match = template.expression.exec(text);
      if (!match) continue;
      const values = new Map(template.names.map((name, index) => [name, convert(lang, match[index + 1], part(name).kind)]));
      const out = template.hindi.replace(/\{(\w+)\}/g, (placeholder, name: string) => values.get(name) ?? placeholder);
      return out.trim() ? out : text;
    }
    const known = translate(lang, text); // "Approvals", "Finance", "Holiday calendar"
    return known !== text ? known : localizeDates(lang, text);
  } catch {
    return text;
  }
}

/** `const translateNotification = useNotificationText(); translateNotification(notification.text)`. */
export function useNotificationText(): (text: string) => string {
  const lang = useLang();
  return useCallback((text: string) => translateNotificationText(lang, text), [lang]);
}
