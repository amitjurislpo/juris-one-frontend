import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

/**
 * The JurisTrack pages (`src/track` of the `juris-track-frontend` repo) are compiled into this app: the two repos sit next to
 * each other and that folder is imported as `@/track/…` (the name the JurisTrack code uses for itself). Not a setting on purpose.
 */
const TRACK_SOURCE = path.resolve(import.meta.dirname, "../juris-track-frontend/src/track");

/**
 * Headers on every page the dev and preview servers send; a production web server must send the same ones (see README).
 * No framing, no sniffing; the preview (and production) also allows scripts and connections from this origin only. The dev
 * server cannot take the policy: Vite's hot reload injects inline scripts.
 */
const SECURITY_HEADERS = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" };
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

/**
 * The browser only ever talks to this origin: `/api/*` is proxied to the Spring Boot API. Keeping it same-origin is what
 * lets the API's SameSite=Lax session cookies and its Origin check work without CORS (the Host header is kept as is).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = (env.BACKEND_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
  const port = Number(env.WEB_PORT || 3005);
  const proxy = { "/api": { target: backend, changeOrigin: false, xfwd: true } };
  const trackFolder = fs.existsSync(TRACK_SOURCE) ? fs.realpathSync(TRACK_SOURCE) : TRACK_SOURCE;
  return {
    plugins: [react()],
    resolve: {
      alias: [
        { find: /^@\/track(?=\/|$)/, replacement: trackFolder },
        { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
      ],
      // the JurisTrack code lives outside this folder: it must use this app's copy of these packages, never its own
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    server: { port, strictPort: true, proxy, headers: SECURITY_HEADERS, fs: { allow: [process.cwd(), trackFolder] } },
    preview: { port, strictPort: true, proxy, headers: { ...SECURITY_HEADERS, "Content-Security-Policy": CONTENT_SECURITY_POLICY } },
    build: { outDir: env.BUILD_DIR || "dist", sourcemap: false },
  };
});
