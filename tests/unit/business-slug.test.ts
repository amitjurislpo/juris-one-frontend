import { describe, expect, it } from "vitest";
import { MAX_SLUG_LENGTH, suggestSlugFromName } from "@/lib/businessSlug";

describe("suggestSlugFromName", () => {
  it("makes lowercase words joined by single dashes", () => {
    expect(suggestSlugFromName("Juris Consultants")).toBe("juris-consultants");
    expect(suggestSlugFromName("  Acme & Sons (P) Ltd. ")).toBe("acme-sons-p-ltd");
  });

  it("returns nothing for a name without usable characters", () => {
    expect(suggestSlugFromName("")).toBe("");
    expect(suggestSlugFromName("!!!")).toBe("");
    expect(suggestSlugFromName("हिन्दी")).toBe("");
  });

  it("cuts at the longest allowed length without a trailing dash", () => {
    expect(suggestSlugFromName("a".repeat(300))).toHaveLength(MAX_SLUG_LENGTH);
    expect(suggestSlugFromName(`${"a".repeat(39)} bcd`)).toBe("a".repeat(39));
  });
});
