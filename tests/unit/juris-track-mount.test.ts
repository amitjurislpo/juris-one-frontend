import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// JurisTrack opens at /juris-track/ under the business's own address (<business code>.<base domain>): the page is a route of this app and talks to
// JurisTrack only through this app's API, so no address of any host may be written into it.
const pageFolder = path.join(import.meta.dirname, "..", "..", "src", "pages", "juris-track");

describe("JurisTrack under the business address", () => {
  it("is the route juris-track/* of this app", () => {
    const routes = readFileSync(path.join(import.meta.dirname, "..", "..", "src", "routes.tsx"), "utf8");
    expect(routes).toContain('path: "juris-track/*"');
  });

  it("holds no absolute address and no host name", () => {
    for (const fileName of readdirSync(pageFolder)) {
      const source = readFileSync(path.join(pageFolder, fileName), "utf8");
      expect(source, fileName).not.toMatch(/https?:\/\//);
      expect(source, fileName).not.toMatch(/localhost/i);
    }
  });
});
