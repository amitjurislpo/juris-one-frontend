import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/track(?=\/|$)/, replacement: path.resolve(import.meta.dirname, "../juris-track-frontend/src/track") },
      { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
    ],
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
