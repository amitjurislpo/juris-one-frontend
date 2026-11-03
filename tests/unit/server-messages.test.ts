import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hindiMessages } from "@/lib/i18n/messages/hi";
import { hindiApiMessages } from "@/lib/i18n/messages/hi-api";
import { translate } from "@/lib/i18n/translate";
import { trackHindiMessages } from "@/track/messages/hi";
import { trackHindiApiMessages } from "@/track/messages/hi-api";

/**
 * Ratchet: every English text the backend can send to a person (the message of a UserException, ForbiddenException or
 * ApiException, the message of a successful ApiResult, and the sentence constants those use) must have Hindi.
 * Texts built from several pieces ("Keep the " + field + " under " + max + " characters.") are checked as templates:
 * the dictionary key is the same sentence with {placeholders}, and `translate` matches it (see translate.ts).
 *
 * The backend checkout is found through BACKEND_REPO, or as a sibling folder (juris-one-backend, JurisOne). Without it
 * the check is skipped.
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const BACKEND_CANDIDATES = [process.env.BACKEND_REPO, path.resolve(REPO_ROOT, "../juris-one-backend"), path.resolve(REPO_ROOT, "../JurisOne")];
const BACKEND_SOURCES = BACKEND_CANDIDATES.filter((candidate): candidate is string => !!candidate)
  .map((candidate) => path.join(candidate, "backend/src/main/java/com/jurislpo/jurisone"))
  .find((candidate) => existsSync(candidate));

/**
 * Backend texts that deliberately stay English (the ratchet: this list only ever gets shorter).
 * - input-check texts in the Zod style ("Invalid input: expected string", "Too big: expected number to be <=31"): they
 *   describe a malformed request that the screens never send, so no person reads them.
 * - sentences in files that are not a message on screen: demo data (SeedService, TaskSeedService), emails (MailTemplates) and PDFs.
 * - programmer errors (IllegalStateException and the like) are skipped by the scan itself.
 */
const ENGLISH_ONLY_PATTERN = /^(Invalid (input|option|string|number|UUID)|Too (big|small):)/;
const NOT_ON_SCREEN_FILES = new Set(["SeedService.java", "TaskSeedService.java", "MailTemplates.java", "LetterPdf.java", "PayslipPdf.java"]);
const ENGLISH_ONLY: Record<string, string> = {};

function javaFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? javaFiles(path.join(directory, entry.name)) : entry.name.endsWith(".java") ? [path.join(directory, entry.name)] : []));
}

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'", "\\": "\\" };
const unescapeJava = (body: string) => body.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_match, code: string) => (code.length === 5 ? String.fromCharCode(parseInt(code.slice(1), 16)) : (ESCAPES[code] ?? code)));
const STRING_LITERAL = /"((?:[^"\\]|\\.)*)"/g;

/** The pieces of `text` split at `separator` where the separator is outside strings, parentheses, brackets and braces. */
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (inString) {
      current += character;
      if (character === "\\") current += text[++i] ?? "";
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if ("([{".includes(character)) depth++;
    else if (")]}".includes(character)) depth--;
    else if (character === separator && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current.trim());
  return parts;
}

/** The index of the `?` and `:` of a top-level conditional expression, or null. */
function findTernary(text: string): [number, number] | null {
  let depth = 0;
  let inString = false;
  let questionAt = -1;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (inString) {
      if (character === "\\") i++;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if ("([{".includes(character)) depth++;
    else if (")]}".includes(character)) depth--;
    else if (depth === 0 && character === "?" && questionAt < 0) questionAt = i;
    else if (depth === 0 && character === ":" && questionAt >= 0) return [questionAt, i];
  }
  return null;
}

/** Every text an expression can produce, each dynamic piece written as "{}". */
function expand(expression: string, constants: Map<string, string>): string[] {
  let text = expression.trim();
  while (text.startsWith("(") && text.endsWith(")") && splitTopLevel(text.slice(1, -1), "+").length > 0 && isWrapped(text)) text = text.slice(1, -1).trim();
  const ternary = findTernary(text);
  if (ternary) return [...expand(text.slice(ternary[0] + 1, ternary[1]), constants), ...expand(text.slice(ternary[1] + 1), constants)];
  let results = [""];
  for (const operand of splitTopLevel(text, "+")) {
    const literal = /^"((?:[^"\\]|\\.)*)"$/.exec(operand);
    let options: string[];
    if (literal) options = [unescapeJava(literal[1])];
    else if (/^[A-Za-z_][\w.]*$/.test(operand) && constants.has(operand.split(".").pop()!)) options = [constants.get(operand.split(".").pop()!)!];
    else if (operand.startsWith("(") && isWrapped(operand)) options = expand(operand, constants);
    else options = ["{}"];
    results = results.flatMap((prefix) => options.map((option) => prefix + option));
  }
  return results;
}

/** True when the first "(" of `text` closes at its very end. */
function isWrapped(text: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (inString) {
      if (character === "\\") i++;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === "(") depth++;
    else if (character === ")" && --depth === 0) return i === text.length - 1;
  }
  return false;
}

/** The comma-separated arguments of the call whose "(" is just before `start`. */
function callArguments(source: string, start: number): string[] {
  let depth = 0;
  let inString = false;
  for (let i = start; i < source.length; i++) {
    const character = source[i];
    if (inString) {
      if (character === "\\") i++;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if ("([{".includes(character)) depth++;
    else if (")]}".includes(character)) {
      if (depth === 0) return splitTopLevel(source.slice(start, i), ",");
      depth--;
    }
  }
  return [];
}

const MESSAGE_CALL = /new (UserException|ForbiddenException|ApiException)\(|ApiResult\.(message|success|fail)\(/g;
// a sentence-like literal that reaches the person through a variable (validators return it, a constant holds it)
const SENTENCE = /^[A-Z][^"{}]* [^"{}]*[.!?]$/;
// `return "Assigned " + tag;` and `return read ? "Marked as read" : "Marked as unread";`: the success text a service hands back to its controller
const RETURNED_TEXT = /\breturn\s+([^;\n]*"[^;\n]*);/g;
const PROGRAMMER_ERROR = /new (IllegalStateException|IllegalArgumentException|IOException)\(|\blog\.|\bassert\b/;
const NOT_A_MESSAGE = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ORDER BY)\b|^(Bearer|Basic) |^[A-Z]+ [A-Z]+$/;

/** Every English backend text as a template, with the files it comes from. */
function backendTexts(sourcesRoot: string): Map<string, Set<string>> {
  const files = javaFiles(sourcesRoot).filter((file) => /[\\/](service|controller|engine|security|exception|common)[\\/]/.test(file));
  const constants = new Map<string, string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(/static final String (\w+)\s*=\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);/g)) {
      constants.set(match[1], [...match[2].matchAll(STRING_LITERAL)].map((literal) => unescapeJava(literal[1])).join(""));
    }
  }
  const texts = new Map<string, Set<string>>();
  const add = (text: string, file: string) => {
    if (!/[A-Za-z]{3}/.test(text.replaceAll("{}", ""))) return;
    if (!texts.has(text)) texts.set(text, new Set());
    texts.get(text)!.add(path.basename(file));
  };
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (NOT_ON_SCREEN_FILES.has(path.basename(file))) continue;
    for (const match of source.matchAll(MESSAGE_CALL)) {
      const callArgs = callArguments(source, match.index + match[0].length);
      const kind = match[1] ?? `ApiResult.${match[2]}`;
      let messageArgument: string | undefined;
      if (kind === "ApiResult.success") messageArgument = callArgs.length === 2 && callArgs[0].startsWith('"') ? callArgs[0] : undefined;
      else if (kind === "ApiResult.message" || kind === "ApiResult.fail") messageArgument = callArgs[0];
      else messageArgument = callArgs[callArgs.length - 1];
      if (!messageArgument) continue;
      if (!/"/.test(messageArgument) && !/^[A-Z][A-Z_.]*$/.test(messageArgument.split(".").pop()!)) continue; // a variable or method call: its literals are found below
      for (const text of expand(messageArgument, constants)) add(text, file);
    }
    for (const match of source.matchAll(RETURNED_TEXT)) {
      for (const text of expand(match[1], constants)) if (/^[A-Z][a-z]/.test(text) && /[a-z]{3}/.test(text) && !NOT_A_MESSAGE.test(text)) add(text, file);
    }
    for (const literal of source.matchAll(STRING_LITERAL)) {
      const text = unescapeJava(literal[1]);
      const lineStart = source.lastIndexOf("\n", literal.index) + 1;
      const line = source.slice(lineStart, source.indexOf("\n", literal.index));
      if (SENTENCE.test(text) && !NOT_A_MESSAGE.test(text) && !text.includes("{{") && !PROGRAMMER_ERROR.test(line)) add(text, file);
    }
  }
  return texts;
}

const DICTIONARY: Record<string, string> = { ...trackHindiApiMessages, ...trackHindiMessages, ...hindiApiMessages, ...hindiMessages };

/** A sample of the template with every "{}" replaced by an example value, as the server would send it. */
const sampleOf = (template: string) => template.replaceAll("{}", "X7");

describe.skipIf(!BACKEND_SOURCES)("backend texts have Hindi", () => {
  const texts = BACKEND_SOURCES ? backendTexts(BACKEND_SOURCES) : new Map<string, Set<string>>();

  it("finds the backend texts", () => {
    expect(texts.size).toBeGreaterThan(300);
  });

  it("translates every text the backend sends to a person", () => {
    // a fixed sentence needs its own entry (a template with a {placeholder} would only half-translate it); a composed one is matched by translate()
    const isTranslated = (template: string) => (template.includes("{}") ? translate("hi", sampleOf(template)) !== sampleOf(template) : !!DICTIONARY[template]);
    const missing = [...texts].filter(([template]) => !ENGLISH_ONLY_PATTERN.test(template) && !(template in ENGLISH_ONLY) && !isTranslated(template)).map(([template, files]) => `${template}   [${[...files].join(", ")}]`);
    expect(missing).toEqual([]);
  });

  it("keeps the English-only list honest", () => {
    for (const template of Object.keys(ENGLISH_ONLY)) expect(texts.has(template), `"${template}" is no longer sent by the backend: remove it from ENGLISH_ONLY`).toBe(true);
    for (const template of Object.keys(ENGLISH_ONLY)) expect(DICTIONARY[template] ?? translate("hi", sampleOf(template)), `"${template}" has Hindi now: remove it from ENGLISH_ONLY`).toBe(sampleOf(template));
  });
});
