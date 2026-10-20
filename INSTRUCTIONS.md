# Owner's instructions

This file is for the project owner to write requirements and working rules in. It is loaded automatically at the start of
every Claude Code session (through `CLAUDE.md`), so whatever is written here is followed without being repeated.
Add new lines at the bottom of the right section. Hindi, Hinglish or English are all fine. If two lines disagree, the newer one wins.

## How to work with me (git and PRs)

- Create every pull request against the `dev` branch first, never `main`. New feature branches are cut from `dev`.
- Never merge a pull request yourself. Open it, share the link and stop.
- Commit and push only when asked. Do not push on your own.
- Never put `.idea/` (or other IDE folders) in a commit; they are git-ignored.
- Commit messages end with the Claude co-author line given by the harness.

## Communication

- Reply in Hindi/Hinglish (the owner writes in Hindi). Keep answers short: what changed, what was checked, what is left.
- Say plainly when something was not tested or could not be done. Do not claim a check that was not run.
- Ask before deleting things that cannot be recovered (files outside git, local data). Explain what and why.

## Project structure

- Two repositories: this one is the **web app** (React + Vite SPA) and `Juris-one` is the **backend** (Spring Boot API). Frontend code lives only here; backend code only there.
- The browser only talks to its own origin; `/api/*` is proxied to the API (`vite.config.ts`). The API enforces all permissions; hiding things in the UI is cosmetic.
- The e2e tests need the backend repo checked out next to this one (`../JurisOne`, or `BACKEND_REPO`) and Docker running.

## Code and configuration rules

- The repo must stay clean: no unused files, exports or dependencies (check with `npx knip`), no leftover references to removed things (Next.js, `.env` files, exit/F&F, Form 16).
- No env files: the only settings are `WEB_PORT` and `BACKEND_URL` (defaults in `vite.config.ts`) and the optional build-time `VITE_DEV_OTP_CODE`.
- English text is the translation key (`src/lib/i18n`); every new `t("…")` string needs its Hindi in `messages/hi.ts` (a unit test checks it).
- Verify before saying "done": `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` for anything that changes behaviour.

## Requirements (add yours here)

- 

## Decisions already taken

- Sign-in is by emailed code only (fixed code `000000` only in dev).
- The identity provider (IAM JCG / Sita) is not to be worked on until the owner says so.
- Exit / full & final settlement and Form 16 were removed on purpose.
