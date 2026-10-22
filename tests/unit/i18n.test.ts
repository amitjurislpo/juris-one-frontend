import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/nav";
import { isLang, LANGUAGES } from "@/lib/i18n/config";
import { hindiMessages } from "@/lib/i18n/messages/hi";
import { translate, translator } from "@/lib/i18n/translate";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((fileName) => {
    const filePath = path.join(dir, fileName);
    return statSync(filePath).isDirectory() ? sources(filePath) : /\.tsx?$/.test(fileName) ? [filePath] : [];
  });
}

describe("translate", () => {
  it("returns the English text for English and for unknown keys", () => {
    expect(translate("en", "Home")).toBe("Home");
    expect(translate("hi", "A sentence nobody translated")).toBe("A sentence nobody translated");
  });

  it("translates to Hindi", () => {
    expect(translate("hi", "Home")).toBe(hindiMessages["Home"]);
    expect(translate("hi", "Sign out")).toBe("साइन आउट");
  });

  it("fills {placeholders} in both languages and leaves unknown ones alone", () => {
    expect(translate("en", "Welcome, {name}", { name: "Amit" })).toBe("Welcome, Amit");
    expect(translate("hi", "Welcome, {name}", { name: "Amit" })).toContain("Amit");
    expect(translate("en", "Hi {who}", { other: 1 })).toBe("Hi {who}");
    expect(translate("en", "{n} items", { n: 3 })).toBe("3 items");
  });

  it("translator() binds a language", () => {
    expect(translator("hi")("Search")).toBe(hindiMessages["Search"]);
  });
});

describe("languages", () => {
  it("recognises only the supported codes", () => {
    for (const language of LANGUAGES) expect(isLang(language.code)).toBe(true);
    expect(isLang("fr")).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe("Hindi dictionary", () => {
  it("has no empty translations and keeps every {placeholder} of its key", () => {
    for (const [key, translation] of Object.entries(hindiMessages)) {
      expect(translation.trim(), key).not.toBe("");
      const want = (key.match(/\{\w+\}/g) ?? []).sort();
      const got = (translation.match(/\{\w+\}/g) ?? []).sort();
      expect(got, key).toEqual(want);
    }
  });

  it("translates every sidebar label", () => {
    for (const navItem of NAV) expect(hindiMessages[navItem.label], `nav label "${navItem.label}"`).toBeTruthy();
  });

  it("translates every string passed to t(\"…\") in the source", () => {
    const missing = new Set<string>();
    for (const file of sources(path.resolve(import.meta.dirname, "../../src"))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) {
        const key = match[1].replaceAll("\\'", "'");
        if (!hindiMessages[key]) missing.add(`${path.basename(file)}: ${key}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
