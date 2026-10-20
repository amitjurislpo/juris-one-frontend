import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against their own environment: the backend repo resets and seeds the database "<db>_e2e" and runs
 * the API on :8081 (`scripts/e2e-env.mjs backend` there); this repo builds the SPA and serves it on :3006 with /api
 * proxied to the API (`scripts/e2e-env.mjs frontend`). Development data is never touched. `E2E_BUILD=1` rebuilds the
 * backend jar and the SPA first. BACKEND_REPO points at the backend checkout (default: ../JurisOne).
 */
const backendRepo = path.resolve(process.env.BACKEND_REPO || path.join(import.meta.dirname, "..", "JurisOne"));

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3006", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: `node "${path.join(backendRepo, "scripts", "e2e-env.mjs")}" backend`, cwd: backendRepo, url: "http://127.0.0.1:8081/actuator/health", reuseExistingServer: false, timeout: 600_000 },
    { command: "node scripts/e2e-env.mjs frontend", url: "http://localhost:3006/login", reuseExistingServer: false, timeout: 600_000 },
  ],
});
