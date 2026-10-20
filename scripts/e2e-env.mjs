// The end-to-end test environment for the SPA. The API and its database are the backend repo's job:
//   node <BACKEND_REPO>/scripts/e2e-env.mjs backend   → database "<db>_e2e" reset + demo seed, API on :8081
// This script serves the built SPA:
//   node scripts/e2e-env.mjs frontend                 → `vite build` into dist-e2e (rebuilt when src/ changed), served on :3006
//                                                       with /api proxied to :8081
// Playwright starts both (playwright.config.ts). BACKEND_REPO defaults to ../JurisOne (a checkout next to this one).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const win = process.platform === "win32";
export const E2E = { api: 8081, web: 3006 };

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
  const p = path.join(dir, e.name);
  return Math.max(m, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
}, 0);

function frontend() {
  const dist = "dist-e2e";
  const env = { ...process.env, BACKEND_URL: `http://127.0.0.1:${E2E.api}`, WEB_PORT: String(E2E.web), BUILD_DIR: dist, VITE_DEV_OTP_CODE: "000000" };
  const built = path.join(root, dist, "index.html");
  const sources = Math.max(newest(path.join(root, "src")), statSync(path.join(root, "index.html")).mtimeMs, statSync(path.join(root, "vite.config.ts")).mtimeMs);
  if (!existsSync(built) || statSync(built).mtimeMs < sources || process.env.E2E_BUILD === "1") run("npx", ["vite", "build"], { cwd: root, env });
  const web = spawn("npx", ["vite", "preview", "--port", String(E2E.web), "--strictPort"], { cwd: root, env, stdio: "inherit", shell: win });
  web.on("exit", (code) => process.exit(code ?? 0));
}

if (process.argv[2] === "frontend") frontend();
else {
  console.error("usage: node scripts/e2e-env.mjs frontend   (the API side lives in the backend repo)");
  process.exit(2);
}
