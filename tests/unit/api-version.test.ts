import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((fileName) => {
    const filePath = path.join(dir, fileName);
    return statSync(filePath).isDirectory() ? sources(filePath) : /\.tsx?$/.test(fileName) ? [filePath] : [];
  });
}

// A string literal (single, double or backtick quoted) that starts with /api/ but not /api/v1/.
const UNVERSIONED_API_LITERAL = /["'`]\/api\/(?!v1\/)/;

describe("API version", () => {
  it("every API path in the app and the e2e tests is under /api/v1/", () => {
    const offenders = ["src", "tests"].flatMap((folder) => sources(folder)).flatMap((filePath) =>
      readFileSync(filePath, "utf8")
        .split("\n")
        .map((line, index) => ({ line: line.trim(), where: `${filePath}:${index + 1}` }))
        .filter(({ line }) => !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"))
        .filter(({ line }) => UNVERSIONED_API_LITERAL.test(line))
        .map(({ where, line }) => `${where}  ${line}`),
    );
    expect(offenders).toEqual([]);
  });
});
