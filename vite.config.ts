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
    server: { port, strictPort: true, proxy, fs: { allow: [process.cwd(), trackFolder] } },
    preview: { port, strictPort: true, proxy },
    build: { outDir: env.BUILD_DIR || "dist", sourcemap: false },
  };
});
