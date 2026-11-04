import { describe, expect, it } from "vitest";
import createConfig from "../../vite.config";

// Every business has its own address <business code>.localhost: the dev and preview servers must accept those Host headers.
describe("vite host allow-list", () => {
  const config = createConfig({ mode: "development", command: "serve" });

  it("accepts localhost and its subdomains on the dev and the preview server", () => {
    expect(config).toMatchObject({ server: { allowedHosts: [".localhost"] }, preview: { allowedHosts: [".localhost"] } });
  });

  it("does not accept every host", () => {
    expect(JSON.stringify(config)).not.toContain('"allowedHosts":true');
  });
});
