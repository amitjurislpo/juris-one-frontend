import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/nav";
import { isLang, LANGUAGES } from "@/lib/i18n/config";
import { hindiMessages } from "@/lib/i18n/messages/hi";
import { hindiApiMessages } from "@/lib/i18n/messages/hi-api";
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

describe("translate server sentences with values", () => {
  it("matches a {placeholder} entry and puts the values into the Hindi", () => {
    expect(translate("hi", "The key HR is already used by another project.")).toBe("कुंजी HR पहले से किसी दूसरे प्रोजेक्ट में इस्तेमाल हो रही है।");
    expect(translate("hi", "Too many failed sign-in attempts. Try again in 7 minute(s).")).toContain("7 मिनट");
    expect(translate("hi", "EMP042 is already used by another employee.")).toBe("EMP042 पहले से किसी दूसरे कर्मचारी के लिए इस्तेमाल हो चुका है।");
  });

  it("translates a value that is itself in the dictionary, and a month with its year", () => {
    expect(translate("hi", "It is already published.")).toBe("यह पहले से प्रकाशित है।");
    expect(translate("hi", "Keep the phone under 30 characters.")).toBe("फ़ोन 30 अक्षरों से कम रखें।");
    expect(translate("hi", "October 2026 payroll is closed. Corrections go into the next month as arrears.")).toBe(`${hindiMessages["October"]} 2026 का पेरोल बंद है। सुधार अगले माह में बकाया के रूप में जाते हैं।`);
  });

  it("prefers the exact entry, then the most specific template", () => {
    expect(translate("hi", "Keep the reason under 80 characters.")).toBe("कारण 80 अक्षरों से कम रखें।");
    expect(translate("hi", "Returned AST-1 — marked in repair")).toBe("AST-1 वापस लिया गया — मरम्मत में चिह्नित किया गया");
  });

  it("leaves unknown sentences and short UI templates alone", () => {
    expect(translate("hi", "Something nobody wrote: really")).toBe("Something nobody wrote: really");
    expect(translate("hi", "Edit anything")).toBe("Edit anything");
    expect(translate("en", "Keep the phone under 30 characters.")).toBe("Keep the phone under 30 characters.");
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

  it("keeps every {placeholder} in the server-message entries too", () => {
    for (const [key, translation] of Object.entries(hindiApiMessages)) {
      expect(translation.trim(), key).not.toBe("");
      expect((translation.match(/\{\w+\}/g) ?? []).sort(), key).toEqual((key.match(/\{\w+\}/g) ?? []).sort());
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
