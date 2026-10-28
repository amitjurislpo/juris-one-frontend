# JurisOne — frontend

The JurisOne web app: a React single-page app (Vite + TypeScript + React Router + TanStack Query). It has no server of
its own; every number on screen comes from the Spring Boot API in the backend repo (`JurisOne`, `backend/`).

## Stack

- React 19, TypeScript, Vite
- React Router (pages, code-split per page), TanStack Query (cached API reads; every successful write refetches)
- English and Hindi (`src/lib/i18n`: the English text is the key; a missing translation shows the English text)
- Plain CSS (`src/globals.css`, the design prototype verbatim, plus a "JurisOne additions" block at the end)

## Run it (development)

1. Run the API (backend repo): `docker compose up -d db`, then `./mvnw spring-boot:run` in `backend/` → http://localhost:8080
2. `npm install`
3. `npm run dev` → http://localhost:3005

Optional settings (read from the environment or a `.env.dev` file next to `package.json`): `WEB_PORT` (default 3005) and `BACKEND_URL` (default `http://127.0.0.1:8080`).

The dev server and `vite preview` proxy `/api/*` to `BACKEND_URL`. The browser therefore only ever talks to its own
origin, which is what the API's `SameSite=Lax` session cookies and its Origin check (CSRF) expect. The backend's
`APP_URL` / `FRONTEND_ORIGIN` must be this app's public URL (`http://localhost:3005` in development).

To see the fixed sign-in code on the login page in development, set `VITE_DEV_OTP_CODE` to the backend's `OTP_FIXED_CODE`
at build time (leave it unset everywhere else; it is only a hint on the sign-in page).

## Production web server

`dist/` is static files. The web server in front must overwrite `X-Forwarded-For` with the address it saw (the API trusts the
last hop only), proxy `/api/*` to the API, and send on every response: `Content-Security-Policy` (the value in `vite.config.ts`),
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and, over https,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`. Never build production with `VITE_DEV_OTP_CODE` set.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on `WEB_PORT` (3005) |
| `npm run build` | Typecheck, then build static files into `dist/` |
| `npm run preview` | Serve `dist/` locally (with the `/api` proxy) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |
| `npm test` | Unit tests (pure rules: attendance, leave, payroll, tax, nav, i18n) |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |

## Deploying

`npm run build` produces static files. Serve them from any web server **on the same origin as the API** and send
`/api/*` to the Spring Boot service; unknown paths must fall back to `index.html` (client-side routing). Example (nginx):

```nginx
server {
  listen 443 ssl;
  server_name app.example.com;
  root /srv/jurisone-frontend/dist;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;                 # the API compares Origin with Host / X-Forwarded-Host
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
  location / { try_files $uri /index.html; }
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy same-origin always;
}
```

## How a page works

- `src/routes.tsx` lists every page (path, tab title, the nav entry that grants access). `RequirePage` (`src/lib/page.tsx`)
  is the route guard: nav permission, paused subscription, pending policy acceptance.
- A page reads `const { u, t, sp, params } = usePage()` (user, translator, search params, route params) and its data with
  `useData<T>("/api/...")`. Writes are plain functions in each page folder's `actions.ts` that call `apiAction(...)`.
- Authorization is enforced by the API on every request; hiding a page or button here is only convenience.
- A 401 triggers one silent session refresh and a retry, then sends the user to `/login?next=…`.

## End-to-end tests

The tests drive a real browser against a real API and database, so they need the backend repo next to this one
(`../JurisOne`, or set `BACKEND_REPO`). `scripts/e2e-env.mjs` builds the API jar with the backend's Maven Wrapper (when missing),
starts it on :8081 with a throw-away database `<db>_e2e` (reset and seeded with the demo business; uploaded files go to the temp
folder), builds the SPA into `dist-e2e/` and serves it on :3006. Development data is never touched. The database address and logins
come from the backend's `application-dev.properties`; Docker (Postgres) must be running. `E2E_BUILD=1 npm run test:e2e` rebuilds
the API jar and the SPA.
