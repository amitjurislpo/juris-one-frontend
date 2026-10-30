@INSTRUCTIONS.md

# JurisOne — frontend notes

- React 19 + Vite + TypeScript SPA. Routes: `src/routes.tsx` (path, tab title, nav id that grants access); guard: `RequirePage` in `src/lib/page.tsx`; app shell: `src/components/shell/`.
- A page reads `const { user, t, searchParams, params } = usePage()` and its data with `useData<T>("/api/v1/…")`; writes are plain functions in each page folder's `actions.ts` calling `apiAction(…)` (every success refetches the data on screen). A 401 triggers one silent session refresh, then `/login`.
- Money = integer paise; dates = ISO strings; the API returns raw values and the app formats them with `src/lib/format.ts`.
- `src/globals.css` is the design prototype's CSS verbatim; put app-only CSS in the "JurisOne additions" block at the end.
- Backend repo: `Juris-one` (Spring Boot API). Requirements and design: `references/REQUIREMENTS.md` and `references/Juris-People-Design-8.html` in that repo; requirements win on conflict.
