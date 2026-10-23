# Task management — frontend plan (React + Vite SPA)

Status: **plan only, nothing built yet** (written 2026-10-22, updated 2026-10-23 with the owner's decisions, see §16). Companion file: `juris-one-backend/references/TASK_MANAGEMENT_BACKEND_PLAN.md`
(the API contract: endpoint paths, methods, JSON field names, rules). Both files use the same names; if you change one, change the other in the same commit.

A future session must be able to build the UI from this file alone (plus the backend file for API details). Every pattern below is copied
from code that exists today; the source file is named next to it. Paths are relative to the repo root (`src/…`, `tests/…`).

## Contents

0. [Overview in plain words](#0-overview-in-plain-words)
1. [Standards, git rules and verify steps](#1-standards-git-rules-and-verify-steps)
2. [Left side menu](#2-left-side-menu)
3. [Routes (`src/routes.tsx`)](#3-routes)
4. [How pages get data and write](#4-how-pages-get-data-and-write)
5. [Pages with wireframes](#5-pages-with-wireframes)
6. [Components to build and to reuse](#6-components)
7. [`actions.ts` functions (must match the backend exactly)](#7-actionsts-functions)
8. [Board drag and drop](#8-board-drag-and-drop)
9. [Keyboard and accessibility](#9-keyboard-and-accessibility)
10. [Responsive behaviour (390 px and 1280 px)](#10-responsive-behaviour)
11. [Loading, empty, error and read-only states](#11-loading-empty-error-and-read-only-states)
12. [Translations (Hindi)](#12-translations)
13. [Design classes and CSS additions](#13-design-classes-and-css-additions)
14. [Tests (unit and e2e)](#14-tests)
15. [Phases and gates (incl. "Later: email alerts")](#15-phases-and-gates)
16. [Decided by the owner, and open questions](#16-open-questions)
17. [How to start implementation (checklist)](#17-how-to-start-implementation)

---

## 0. Overview in plain words

What the owner gets in the app:

1. A new **Tasks** group in the left menu, **free for every business** and shown to every signed-in user: **My tasks**, **Team tasks** (managers only), **Projects**, and **Task settings** (owner). Later: **Task calendar** and **Task reports**.
2. **My tasks**: everything where I am the **assignee** (I do the work) or the **accountable person** (indirect assignee, I oversee it), grouped as Overdue / Today / This week / Later / No date, with a red count in the menu for overdue + due today. One click switches to a **board** (To do / In progress / Done).
3. **Projects**: a list of the projects I can see (the Owner sees all of them). Opening one shows its tasks as a **List** (sortable table) or a **Board** (columns per step; drag cards between steps).
4. A **task page** (also opens as a side panel from lists): title, description, status, priority, assignee and accountable person, followers, start date, due date with an optional due time, labels, sub-tasks, checklist, attachments, comments with `@mentions`, and the history of changes.
5. **Team tasks**: a manager sees the tasks of the people who report to them, a summary per person (open, overdue, finished this week), and a switch to include the next level down.
6. Notifications appear in the **bell only** (no emails for now).
7. Quick add: type a title and press Enter to create a task; more details can be filled in afterwards.
8. Works on a phone (390 px wide) without sideways scrolling, in Hindi and English, in light and dark theme, and with the keyboard.
9. If the subscription has ended, everything is visible but read-only (buttons hidden), like the rest of JurisOne.

Nothing is built yet. The first phase (MVP) delivers the items above; calendar, reports, templates, recurring tasks, CSV import/export, bulk actions and saved filters come in phase 2.

---

## 1. Standards, git rules and verify steps

**Read first:** `INSTRUCTIONS.md` and `CLAUDE.md` in this repo. Summary (those files win):

| Topic | Rule |
|---|---|
| Names | Full words: `projectId`, `dueDate`, `TaskBoard`, `moveTask`. Booleans as questions (`isOverdue`, `canEdit`). No `u`, `d`, `p`, `tsk`. Single letters only for loop index, event `e`, translate `t`, tiny lambdas. |
| Page shape | `const { user, t, searchParams, params } = usePage()`; data with `useData<T>("/api/…")` (call it `data` or a full noun, never `d`). |
| Files | Named after what they hold (`TaskBoard.tsx`), one exported component per file, hooks start with `use`. |
| API calls | In the page folder's `actions.ts`, one function per endpoint, named after what it does; path and method **exactly** as in the backend plan §12. |
| Text | English text is the translation key; every new `t("…")` string needs Hindi in `src/lib/i18n/messages/hi.ts` (`tests/unit/i18n.test.ts` fails otherwise); fixed API error messages need Hindi in `src/lib/i18n/messages/hi-api.ts`. |
| CSS | `src/globals.css` is the prototype verbatim; app-only CSS goes in the "JurisOne additions" block at the end. |
| Clean repo | No unused files/exports/dependencies (`npx knip`), no new env files. |
| Money/dates | Dates are ISO strings from the API; format with `src/lib/format.ts` (`formatDayMonth`, `formatDayMonthYear`, `todayIn`, `formatDateTime`). |

**Git:** branch `feature/task-management` cut from `dev` (same name in the backend repo). PRs go to `dev`, never `main`; never merge yourself (open, share the link, stop). Commit/push only when asked. Never commit `.idea/`. Commit messages end with the co-author line the harness gives.

**Verify before saying "done"** (say plainly what was not run): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx knip`, and `npm run test:e2e`
(needs Docker and the backend checkout next to this repo: set `BACKEND_REPO=../juris-one-backend`, because the default in `scripts/e2e-env.mjs` is `../JurisOne`). Backend: `./mvnw test` in `backend/` of a fresh copy of that repo.

---

## 2. Left side menu

How it works today: `src/lib/nav.ts` (`NAV`, must stay identical to the backend `engine/Nav.java`) defines id, label, icon, permissions, `needsReports`, `group`, `module`;
the server sends the visible groups in `/api/shell`, and `src/components/shell/Shell.tsx` renders them (`groups.map` → `.group` title + `a.nav-item` links to `/${navItem.id}`), with badges for `approvals` and `proofs`.

### 2.1 Changes to `src/lib/nav.ts`

1. `NavId` union: add `"my-tasks" | "team-tasks" | "projects" | "task-settings"` (MVP) and `"task-calendar" | "task-reports"` (v2).
2. `NavGroup` union: add `"Tasks"`.
3. Insert into `NAV` **right after the `juris-track` entry and before `team`** (so the group shows after "My workspace" and before "Team"). Tasks is free for every business (owner's decision 2026-10-23), so the items have **no `module`**:

```ts
{ id: "my-tasks", label: "My tasks", icon: "tasks", perm: ["self", "dir", "roles.manage"], group: "Tasks" },
{ id: "team-tasks", label: "Team tasks", icon: "team", perm: ["self", "dir", "roles.manage"], needsReports: true, group: "Tasks" },
{ id: "projects", label: "Projects", icon: "folder", perm: ["self", "dir", "roles.manage"], group: "Tasks" },
// v2: { id: "task-calendar", label: "Task calendar", icon: "cal", perm: ["self", "dir", "roles.manage"], group: "Tasks" },
// v2: { id: "task-reports", label: "Task reports", icon: "chart", perm: ["tasks.manage", "projects.create"], group: "Tasks" },
{ id: "task-settings", label: "Task settings", icon: "sliders", perm: ["tasks.manage"], group: "Tasks" },
```

4. `src/lib/permissions.ts`: add `["tasks.manage", "Task settings & every project and task"]`, `["projects.create", "Create task projects"]` and the group `["Tasks", ["tasks.manage", "projects.create"]]`.
5. No change to `src/lib/subscription.ts` or the platform screens (no module).

### 2.2 Menu table (what each click opens)

| Menu item | Icon | Who sees it (default) | Badge | Route → page file | Opens | Main API calls |
|---|---|---|---|---|---|---|
| My tasks | `tasks` (new) | every signed-in user of a business | overdue + due today (direct or indirect assignee) | `/my-tasks` → `src/pages/my-tasks/page.tsx` | My tasks list grouped by due; board tab | `GET /api/tasks/mine`, `POST /api/tasks`, `PATCH /api/tasks/{taskId}`, `PUT /api/tasks/{taskId}/position` |
| Team tasks | `team` | people with direct reports | — | `/team-tasks` → `src/pages/team-tasks/page.tsx` | People summary + their tasks; depth switch | `GET /api/tasks/team` |
| Projects | `folder` (new) | every signed-in user of a business | — | `/projects` → `src/pages/projects/page.tsx` | Projects I can see (Owner: all); "New project" for `projects.create` (Owner, HR Manager) | `GET /api/projects`, `POST /api/projects` |
| (project) | — | via Projects | — | `/projects/:projectId` → `src/pages/projects/[id]/page.tsx` | One project: List / Board tabs | `GET /api/projects/{projectId}`, `GET /api/tasks?projectId=`, `GET /api/projects/{projectId}/board` |
| (project settings) | — | project owners | — | `/projects/:projectId/settings` → `src/pages/projects/[id]/settings/page.tsx` | Details, members, workflow, labels, archive | `PUT /api/projects/{projectId}`, members, workflow-statuses, task-labels |
| (task) | — | anyone who can see the task | — | `/tasks/:taskRef` → `src/pages/tasks/[ref]/page.tsx` | Full task page | `GET /api/tasks/{taskRef}`, comments, activity, attachments |
| Task calendar (v2) | `cal` | every signed-in user of a business | — | `/task-calendar` → `src/pages/task-calendar/page.tsx` | Month/week grid by due date (Mine / Team / a project) | `GET /api/tasks/mine?dueFrom=&dueTo=&pageSize=500` (or `/team`, `/api/tasks?projectId=`) |
| Task reports (v2) | `chart` (new) | Owner, HR Manager | — | `/task-reports` → `src/pages/task-reports/page.tsx` | KPIs, workload, overdue, finished per week | `GET /api/task-reports/summary` |
| Task settings | `sliders` | Owner (`tasks.manage`) | — | `/task-settings` → `src/pages/task-settings/page.tsx` | Default workflow, company labels; templates (v2) | `GET /api/task-settings`, `/api/task-settings/workflow-statuses…`, `/api/task-labels…` |

No separate "Board" menu item: a board always belongs to a project or to My tasks, so it is a tab there (one line reason: a menu item would first need a project picker).

### 2.3 Badge in `Shell.tsx`

- `ShellProps.badges` type becomes `{ approvals: number; proofs: number; myTasks?: number }` (treat a missing value as 0).
- In the nav loop add: `{navItem.id === "my-tasks" && (badges.myTasks ?? 0) > 0 && <span className="badge">{badges.myTasks}</span>}`.
- Optional: include `myTasks` in the bell dot condition (`badges.approvals + badges.proofs > 0`). Recommended: **no** (the bell is for notifications; the badge already shows it).

### 2.4 New icons in `src/components/Icon.tsx`

Existing names: `home clock cal team users check wallet receipt sliders bell search sun moon logout user chevL chevR chevD x plus ok eye eyeoff lock menu sparkle arrow sunrise doc shield layers inbox download upload edit book grid building key globe trash sort print info`.
Add (same stroke style, 24-unit viewBox like the others): `tasks` (checkbox list), `folder`, `chart` (v2, bars), `board` (three columns, for the view toggle), `list` (lines), `flag` (priority), `paperclip` (attachments), `comment` (speech bubble), `drag` (six dots, drag handle).

---

## 3. Routes

Add to `APP_ROUTES` in `src/routes.tsx` (lazy `page(() => import(…))` like every entry; `nav` is the access check used by `RequirePage` in `src/lib/page.tsx`; a user without the item's permission is sent to their landing page):

| Path | Tab title | Nav id | Page module | Phase |
|---|---|---|---|---|
| `my-tasks` | My tasks | `my-tasks` | `@/pages/my-tasks/page` | MVP |
| `team-tasks` | Team tasks | `team-tasks` | `@/pages/team-tasks/page` | MVP |
| `projects` | Projects | `projects` | `@/pages/projects/page` | MVP |
| `projects/:id` | Project | `projects` | `@/pages/projects/[id]/page` | MVP |
| `projects/:id/settings` | Project settings | `projects` | `@/pages/projects/[id]/settings/page` | MVP |
| `tasks/:ref` | Task | `my-tasks` | `@/pages/tasks/[ref]/page` | MVP |
| `task-settings` | Task settings | `task-settings` | `@/pages/task-settings/page` | MVP |
| `task-calendar` | Task calendar | `task-calendar` | `@/pages/task-calendar/page` | v2 |
| `task-reports` | Task reports | `task-reports` | `@/pages/task-reports/page` | v2 |

- Route params follow the existing style (`policies/:id`, `onboarding/:id`); the page reads `params.id` / `params.ref`. `ref` is a task key (`WEB-12`) or a UUID; notifications link to `/tasks/WEB-12`.
- The breadcrumb (`PAGE_TITLES[page]`) shows the nav label of the route's nav id ("Projects", "My tasks"); the page header shows the project or task name.

---

## 4. How pages get data and write

- **Reads:** `useData<T>(path)` from `src/lib/page.tsx` (suspends on first load, refetches after any write). Build the path from the URL with `toQueryString(searchParams)` (`src/lib/api.ts`), as `src/pages/audit/AuditTable.tsx` does. `useData(null)` = "not yet" (e.g. a drawer that has no task chosen).
- **URL state:** filters, sort, page, view (`view=list|board`), the open drawer task (`task=WEB-12`) and the team depth (`depth=2`) live in the URL via `useQuery()` from `src/components/table/useQuery.ts` (`set({ name: value })` resets `page`). So a filtered board can be bookmarked and the Back button closes the drawer.
- **Writes:** functions in `actions.ts` calling `apiAction(method, path, body)` (`src/lib/api.ts`). On success **every** cached query is refetched before the promise resolves, so the toast shows with fresh data (no manual cache code). Errors come back as `{ ok: false, error }` with the API's `detail` already translated.
- **Uploads:** multipart (attachments). Today `src/pages/policies/PoliciesClient.tsx` uses a raw `fetch` with `FormData`, which skips the 401 refresh. Add one helper to `src/lib/api.ts`: `apiUpload(path, formData)` → same envelope + 401 refresh + refetch, built on `apiCall`'s refresh logic (extend `send()` to accept a `FormData` body without setting `content-type`). Use it from `uploadTaskAttachment`. (Moving the policy upload onto it is optional and not part of this work.)
- **Conflicts:** `PATCH /api/tasks/{taskId}` needs `version`. On a 409 the edit form shows the message ("Someone else changed this task. Reload to see their changes.") with a **Reload** button that calls `router.refresh()` (`src/lib/router.ts`).
- **Toasts:** `useToast()` from `src/components/shell/Toasts.tsx`; `toast(message)` / `toast(error, "bad")`.
- **Read-only:** `useReadOnly()` from `src/lib/session.tsx` hides every write control (pattern: `AddAssetButton` in `src/pages/assets/AssetsClient.tsx`).

Types: add to `src/lib/api-types.ts` (`ProjectRow`, `ProjectDetail`, `ProjectMember`, `WorkflowStatus`, `TaskLabel`, `TaskRow`, `TaskDetail`, `TaskComment`, `TaskActivityEntry`, `TaskAttachment`, `TaskPage<T>` = `{ page, take, total, rows: T[] }`) with the **exact** field names of backend plan §12.4. Constants and pure helpers go in a new `src/lib/tasks.ts` (pattern `src/lib/assets.ts`): `TASK_TYPES`, `TASK_PRIORITIES`, `STATUS_CATEGORIES`, `PROJECT_COLORS`, `DUE_BUCKETS`, `formatEstimate(minutes)`, `formatDue(dueDate, dueTime, dueTimeZone, viewerTimeZone)` ("21 Oct", "21 Oct, 17:00", "21 Oct, 17:00 New York time" when the zones differ), `dueBucket(dueDate, today)` (display grouping only; the server's `isOverdue` and `due` filter are the truth), `priorityRank`, `splitMentions(text)` (turns `@{uuid}` tokens into parts for rendering), `insertMention(text, caret, employeeId)`.

---

## 5. Pages with wireframes

Widths: desktop 1280 px (sidebar + content), phone 390 px (sidebar is a drawer, `.side.open`). Wireframes show desktop; §10 says what changes on a phone.

### 5.1 My tasks — `src/pages/my-tasks/page.tsx` (+ `MyTasksClient.tsx`)

```
┌ Tasks ───────────────────────────────────────────────────────────────────────┐
│ My tasks                                                [ + New task ]       │
│ 4 overdue · 3 today · 9 this week                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ [All mine | Doing | Accountable | Reported by me | Following]  [List | Board]│
│ (search…)  Project ▾  Priority ▾  Status ▾  Clear filters        18 tasks    │
├──────────────────────────────────────────────────────────────────────────────┤
│ + Add a task… (Enter to save)                                [Project ▾]     │
│ OVERDUE (4)                                                                  │
│ ☐ WEB-12  Fix login page          ● In progress  ▲ High   21 Oct 11:00 [WEB]│
│ ☐ PEO-3   Upload offer letters  (Accountable) ● To do  ● Med  20 Oct (PN)    │
│ TODAY (3) …                                                                   │
│ THIS WEEK (9) …   LATER …   NO DATE …                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Data: `GET /api/tasks/mine` + `toQueryString(searchParams)` (defaults `relation=ASSIGNED`, `statusCategory=TODO,IN_PROGRESS`, `sort=dueDate`, `pageSize=200`); the header counts come from `data.counts`.
- The segmented filter sets `relation`: All mine = `ASSIGNED` (I am the direct **or** the indirect assignee, default), Doing = `DIRECT`, Accountable = `INDIRECT`, Reported by me = `REPORTED`, Following = `WATCHING`. A row where `myAssignment === "INDIRECT"` shows an "Accountable" chip and the direct assignee's `Avatar`, so the overseer sees who is doing it.
- Rows are grouped client-side with `dueBucket()`. The checkbox marks the task done with `updateTask(taskId, { version, statusCategory: "DONE" })`: the list does not carry each project's workflow, so the server maps the category to the project's first `DONE` status (backend plan §8.2 and row T7 of §12.1). Unticking sends `statusCategory: "TODO"`.
- Click a row → opens the task drawer (`?task=WEB-12`); the key link opens `/tasks/WEB-12` in full.
- Quick add: `createTask({ title, projectId? })` (personal task when no project is chosen; the project picker lists projects where I am owner/member).
- Board tab (`view=board`): `TaskBoard` with three category columns (To do / In progress / Done (last 14 days)); dropping changes `statusCategory` (§8).

### 5.2 Team tasks — `src/pages/team-tasks/page.tsx` (+ `TeamTasksClient.tsx`)

```
┌ Tasks ───────────────────────────────────────────────────────────────────────┐
│ Team tasks                                      [☐ Include indirect reports] │
│ 6 people · 31 open · 5 overdue                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌ (NK) Naman   ┐ ┌ (KV) Kavya   ┐ ┌ (SI) Siddharth┐ ┌ (AJ) Amit    ┐  …       │
│ │ 6 open · 1 ⚠ │ │ 4 open · 0 ⚠ │ │ 9 open · 3 ⚠  │ │ 5 open · 1 ⚠ │          │
│ │ 3 done/7d    │ │ 2 done/7d    │ │ 0 done/7d     │ │ 4 done/7d    │          │
│ └──────────────┘ └──────────────┘ └───────────────┘ └──────────────┘          │
│ (search…)  Person ▾  Project ▾  Due ▾  Status ▾  [☐ Where I'm accountable] 31 │
│ Key     Title              Assignee   Accountable  Status       Due     Proj  │
│ WEB-12  Fix login page     Amit J.    Nazneen K.   In progress  21 Oct⚠ WEB   │
│ …                                                         ‹ Previous  Next ›  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Data: `GET /api/tasks/team?depth=1|2&employeeId=&…` → `rows` + `people`. Clicking a person card sets `employeeId` in the URL (click again to clear). The switch sets `depth=2`.
- Team tasks follows the **reporting line** (tasks whose direct assignee reports to me); the indirect assignee is a separate per-task choice. The "Where I'm accountable" checkbox adds `indirectAssigneeId={user.id}`. Tasks where I am accountable also appear in my own My tasks.
- Read-only for the manager (view + comment) unless they are also a project member or the task's indirect assignee (then they may change status and priority and reassign the direct assignee); the API's `permissions` in the task detail decide and the drawer hides controls accordingly.
- Table: `SortableHeader` (`sort`, `sortDirection`) and `Pager` from `src/components/table/Table.tsx`.

### 5.3 Projects — `src/pages/projects/page.tsx` (+ `ProjectsClient.tsx`)

```
┌ Tasks ───────────────────────────────────────────────────────────────────────┐
│ Projects                                               [ + New project ]     │
│ 5 active · 2 archived                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ (search…)   [Active | Archived | All]                              5 projects │
│ ┌──────────────────────────┐ ┌──────────────────────────┐ ┌────────────────┐  │
│ │ ■ WEB  Website relaunch  │ │ ■ PEO  People operations │ │ ■ PAY  Payroll │  │
│ │ Private · Owner: Nazneen │ │ Company-wide · Riya K.   │ │ Private · …    │  │
│ │ 12 open · 2 overdue      │ │ 8 open · 2 overdue       │ │ 4 open         │  │
│ │ You: Member              │ │ You: Viewer              │ │ You: Owner     │  │
│ └──────────────────────────┘ └──────────────────────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Data: `GET /api/projects` + query. Cards use `.card` in a `.grid3` (2 columns ≤ 1100 px, 1 column ≤ 700 px). A table view is not needed in MVP.
- "New project" (only when `user.perms` has `projects.create` or `tasks.manage`, and not read-only) opens `ProjectFormModal`: Key (auto-suggested from the name, uppercase, 2–6), Name, Description, Visibility (Private / Company-wide, with one-line explanations), Colour, Department (optional). On success → navigate to `/projects/{id}`.

### 5.4 Project — `src/pages/projects/[id]/page.tsx` (+ `ProjectClient.tsx`)

```
┌ Projects ────────────────────────────────────────────────────────────────────┐
│ ← Website relaunch  [WEB] Private                [Settings]  [ + New task ]  │
│ 12 open · 2 overdue · 5 members  (NK)(KV)(SI)(AJ)+1                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ [List | Board]  (search…)  Assignee ▾  Accountable ▾  Label ▾  Priority ▾     │
├─ Board ──────────────────────────────────────────────────────────────────────┤
│ To do (5)          │ In progress (3)    │ In review (2)     │ Done (4, 14d)   │
│ ┌────────────────┐ │ ┌────────────────┐ │                   │                 │
│ │ ⠿ WEB-14       │ │ │ ⠿ WEB-12       │ │                   │                 │
│ │ Hero copy      │ │ │ Fix login page │ │                   │                 │
│ │ [content] ▲High│ │ │ 21 Oct ⚠  (AJ) │ │                   │                 │
│ │ ☑ 2/5  💬 3    │ │ └────────────────┘ │                   │                 │
│ └────────────────┘ │                    │                   │                 │
│ + Add a task       │ + Add a task       │ + Add a task      │                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Data: `GET /api/projects/{id}` (header, statuses, labels, `canManage`, `canCreateTasks`) and, by tab, `GET /api/tasks?projectId={id}&…` (List) or `GET /api/projects/{id}/board?…` (Board).
- List tab: table with Key, Title (+ sub-task marker), Status chip, Priority, Assignee (`Avatar`), Accountable (`Avatar`, `hide-sm`), Due (red when `isOverdue`), Labels, 💬 count; sortable; paged 50. Filters `assigneeId` and `indirectAssigneeId` (person select + "Nobody" = `none`); also sent to the board endpoint.
- Cards show the direct assignee's avatar and, when set, a smaller second avatar for the accountable person (title attribute "Accountable: {name}").
- Board: `TaskBoard` + `TaskCard` (§8). "+ Add a task" at the bottom of a column creates in that status (`createTask({ projectId, title, statusId })`).
- Archived project: a banner "This project is archived" and no write controls.

### 5.5 Project settings — `src/pages/projects/[id]/settings/page.tsx` (+ `ProjectSettingsClient.tsx`)

Sections as `.card`s, each with its own Save (owners only; others are redirected back by a 403 from the API — show the read-only view instead):
1. **Details**: name, description, visibility, colour, department (key editable only while the project has no tasks). `updateProject(id, {version, …})`.
2. **Members**: table (person, role select Owner/Member/Viewer, remove ✕); "Add member" = person picker (`GET /api/tasks/assignees?search=`) + role. Leaving the project is a button for the member themself.
3. **Workflow**: rows of statuses (name, category select, colour, "initial" radio, task count, ✕); "Add status"; reorder with ↑/↓ buttons (sends the full order to `PUT …/workflow-status-order`). Deleting a status with tasks asks "Move its tasks to:" (select).
4. **Labels**: chips with edit/delete; "Add label".
5. **Danger zone**: Archive / Restore; Delete (only offered when the project has no tasks; a soft delete like everything else).

### 5.6 Task page and drawer — `src/pages/tasks/[ref]/page.tsx` + `src/components/tasks/TaskDetail.tsx`

The same `TaskDetail` component renders full-page (`/tasks/WEB-12`) and inside `Drawer` (`src/components/ui/Modal.tsx`, width 560) when a list sets `?task=WEB-12`.

```
┌ WEB-12 · Website relaunch ──────────────────────────────── [Follow] [⋯] [✕] ┐
│ Fix login page                                                (click to edit)│
│ ┌ Status ─────┐ ┌ Priority ┐ ┌ Assignee ─────┐ ┌ Accountable ───┐ ┌ Due ─────┐ │
│ │ In progress▾│ │ ▲ High ▾ │ │ (AJ) Amit J. ▾│ │ (NK) Nazneen ▾ │ │21 Oct 11:00⚠│
│ └─────────────┘ └──────────┘ └───────────────┘ └────────────────┘ └──────────┘ │
│ Start: —   Type: Issue ▾   Estimate: 4h   Labels: [frontend] [+]             │
│ Reporter: Nazneen K.   Followers: (KV)(SI) [Follow]                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Description                                                         [Edit]   │
│ The login button does nothing on Safari. @Nazneen Khan please check…        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sub-tasks (1/2)                                                [+ Sub-task]  │
│  ☑ WEB-15 Reproduce on iPhone     ☐ WEB-16 Fix the handler                    │
│ Checklist (2/3)                                                 [+ Item]     │
│  ☑ Check Safari 17   ☑ Check Chrome   ☐ Update the test                       │
│ Attachments (1)                                                [+ Attach]    │
│  📎 screenshot.png · 220 KB · Amit · 20 Oct                         [✕]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Comments (3) | History]                                                     │
│ (NK) Nazneen · 20 Oct 14:10   Looks like the click handler. @Amit can you…   │
│ ┌──────────────────────────────────────────────────────────────┐ [Comment]   │
│ │ Write a comment… type @ to mention                           │             │
│ └──────────────────────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Data: `GET /api/tasks/{ref}` (`TaskDetail`: fields, `version`, `statuses`, `permissions`, sub-tasks, checklist, attachments, watchers, `mentionedPeople`); `GET /api/tasks/{id}/comments?page=` and `GET /api/tasks/{id}/activity?page=` (load the tab that is open; "Show older" sets the page).
- Each field saves on change (`updateTask(id, {version, field})`); title and description switch to an input/textarea on click and save on blur/Ctrl+Enter, Esc cancels.
- Field controls follow `permissions` from the API, field by field: `canEdit` (all fields), `canChangeStatus` (status select, board moves), `canChangePriority`, `canChangeDirectAssignee`, `canChangeIndirectAssignee`, `canComment` (comment box), `canDelete`. A field the user may not change is shown as text.
- **Due box:** a date input plus an optional time input (`<input type="date">` + `<input type="time">`, no new library); the time input is disabled until a date is chosen; clearing the date clears the time. Saved as `dueDate` (`YYYY-MM-DD`) and `dueTime` (`HH:mm` or null). The due time is optional: if a time is given, the task is due at that time; otherwise the task is due at the **end of that day** (23:59:59 in the task time zone), so it becomes overdue at the start of the next day. `DueInput` shows no default time (never pre-fills 00:00 or 09:00); `DueLabel` shows a date-only task as just the date (no time). Hint under it: "Due times are in the assignee's time zone"; when `dueTimeZone` differs from the viewer's zone the value shows the zone name (`formatDue`). Overdue (from the server's `isOverdue`) is shown in `--bad` with the word "Overdue".
- **Two assignee boxes:** "Assignee" (does the work, `assigneeId`) and "Accountable" (oversees it, `indirectAssigneeId`, optional), each a `PersonPicker` with "Nobody". The pickers refuse choosing the same person in both (the API also answers 400). Labels have a short hint ("does the work" / "oversees it").
- **Indirect assignee's rights (decided by the owner 2026-10-23):** they can comment, change status and priority, and reassign the direct assignee; they cannot delete the task unless they are a project owner (other fields only if they are also a project member). The UI simply follows the `permissions` flags above.
- Followers (`watchers`) are a separate row of avatars with a Follow / Stop following button; both assignees are added automatically by the API.
- "⋯" menu: Copy link, Move to project (v1: select of projects where I am owner/member → `PATCH {version, projectId}`), Delete (`canDelete`, `ConfirmDialog`: "The task is removed from all lists. It is kept in the history and can be restored by a project owner" — the app only soft-deletes; the restore screen comes in T2).
- History tab: `TaskActivityList` renders each `kind` as a sentence ("Amit changed the status from To do to In progress · 20 Oct 14:12"); sentences are translation keys with `{placeholders}`.

### 5.7 Task settings — `src/pages/task-settings/page.tsx` (+ `TaskSettingsClient.tsx`)

- Owner only (`tasks.manage`). Cards: **Default workflow** (same editor as the project Workflow card, against `/api/task-settings/workflow-statuses…`; note "Used for personal tasks and copied into new projects"), **Company labels** (`/api/task-labels` without `projectId`), counts (projects, tasks). v2: **Templates** list/editor; v3: custom fields.
- Reuse the `WorkflowEditor` and `LabelEditor` components (§6) for both project and company settings; they take the action functions as props.

### 5.8 Task calendar (v2) — `src/pages/task-calendar/page.tsx`

```
┌ Tasks ───────────────────────────────────────────────────────────────────────┐
│ Task calendar        [Mine | Team | Project ▾]      ‹ October 2026 ›  [Month|Week] │
│ Mon     Tue     Wed     Thu     Fri     Sat     Sun                            │
│ 19      20      21      22      23      24      25                             │
│ PEO-3⚠  WEB-12⚠ WEB-14                  —       —                             │
│         +2 more                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Data: `GET /api/tasks/mine?dueFrom=&dueTo=&pageSize=500` (Team: `/api/tasks/team`, Project: `/api/tasks?projectId=`). Tasks are placed on their `dueDate`; timed tasks show their `dueTime` (via `formatDue`) and come first in the day, sorted by time; **date-only tasks sort after the timed tasks of the same day** because they are due at the end of that day (23:59:59, task time zone). Grid styling from the existing `.cal` classes used by `src/pages/attendance/AttendanceClient.tsx`. Phone: an agenda list (one day per row) instead of the grid.

### 5.9 Task reports (v2) — `src/pages/task-reports/page.tsx`

- Filters: project, department, person, period (`from`/`to`). KPI row (`.kpis` / `.kpi`): Open, Overdue, Completed in period, Average days to complete. Cards: "Finished per week" (bars with the existing `.bars` styles), "Workload by person" (table: open, overdue, estimate hours, completed), "By status", "By project". Data: `GET /api/task-reports/summary`. Export: link to `GET /api/tasks/export?…`.

---

## 6. Components

### 6.1 Reuse (do not rebuild)

| Need | Existing |
|---|---|
| Page header with eyebrow, title, back button, actions | `PageHeader` (`src/components/PageHeader.tsx`) |
| Dialogs, side panel, confirm | `Modal`, `Drawer`, `ConfirmDialog` (`src/components/ui/Modal.tsx`) |
| Search box, select filter, segmented filter, sortable header, pager, dim-while-loading, clear filters | `SearchBox`, `SelectFilter`, `SegmentedFilter`, `SortableHeader`, `Pager`, `Pending`, `ClearFilters` (`src/components/table/Table.tsx`) |
| URL state | `useQuery` (`src/components/table/useQuery.ts`) |
| Person circle with photo | `Avatar` (`src/components/Avatar.tsx`; pass `id`, `name`, `photo` = `assigneePhoto`) |
| Icons | `Icon` (`src/components/Icon.tsx`) |
| Toasts, read-only, router refresh | `useToast`, `useReadOnly`, `useRouter` |
| Dates | `src/lib/format.ts` |
| Links | `src/lib/link.tsx` (`Link`) |

### 6.2 New shared components — `src/components/tasks/`

(One exported component per file; used by several pages, so they live outside a page folder.)

| File | Purpose |
|---|---|
| `TaskTable.tsx` | Sortable task table (columns configurable: project, assignee); rows clickable (`tabIndex=0`, Enter opens) |
| `TaskGroupedList.tsx` | My-tasks list grouped by due bucket, with done checkbox |
| `TaskBoard.tsx` | Columns + drag and drop + keyboard move (§8); props: `columns`, `onMove(taskId, target)` |
| `TaskCard.tsx` | Card: key, title, labels, priority, due, assignee avatar (+ small accountable avatar), counts; `draggable` when `canChangeStatus` |
| `TaskDetail.tsx` | Full task view used by the page and the drawer |
| `TaskDrawer.tsx` | Reads `?task=` and renders `Drawer` + `TaskDetail`; closing removes the parameter |
| `QuickAddTask.tsx` | Single-line create (title + optional project/status) |
| `TaskFormModal.tsx` | "New task" with all fields (project, title, description, type, priority, assignee, accountable person, start date, due date + optional due time, estimate, labels); after an assignee is chosen it offers their reporting manager (`reportingManagerId` from `/api/tasks/assignees`) as a one-click "Accountable" suggestion chip (decided by the owner; never set automatically) |
| `StatusChip.tsx`, `PriorityLabel.tsx`, `DueLabel.tsx`, `LabelChips.tsx` | Small display pieces (colour from palette names; `DueLabel` shows date + optional time via `formatDue`, overdue in `--bad`) |
| `DueInput.tsx` | Date + optional time inputs used by the task panel and the form modal |
| `PersonPicker.tsx` | Search-as-you-type person select (`GET /api/tasks/assignees?search=&projectId=`); listbox with `aria-activedescendant` (pattern of `PhoneInput`'s country list) |
| `MentionTextarea.tsx` | Textarea that opens the person picker after `@` and inserts `@{uuid}` |
| `RichText.tsx` | Renders stored text: paragraphs, line breaks, auto-links (`rel="noopener"`), `@{uuid}` → `@Name` chip; v2 adds bold/italic/lists/code. **Never** uses `dangerouslySetInnerHTML` |
| `CommentList.tsx`, `TaskActivityList.tsx`, `ChecklistEditor.tsx`, `SubtaskList.tsx`, `AttachmentList.tsx` | Sections of `TaskDetail` |
| `WorkflowEditor.tsx`, `LabelEditor.tsx` | Used by project settings and task settings |
| `ProjectFormModal.tsx` | Create/edit project |

Pure helpers in `src/lib/tasks.ts` (unit-tested). Keep the number of files tight: if a component is used by one page only, keep it in that page folder (knip flags unused exports).

### 6.3 Page folders

```
src/pages/my-tasks/        page.tsx, MyTasksClient.tsx
src/pages/team-tasks/      page.tsx, TeamTasksClient.tsx
src/pages/projects/        page.tsx, ProjectsClient.tsx, actions.ts
src/pages/projects/[id]/   page.tsx, ProjectClient.tsx
src/pages/projects/[id]/settings/  page.tsx, ProjectSettingsClient.tsx
src/pages/tasks/           actions.ts            (task-level writes shared by every task view)
src/pages/tasks/[ref]/     page.tsx
src/pages/task-settings/   page.tsx, TaskSettingsClient.tsx, actions.ts
v2: src/pages/task-calendar/, src/pages/task-reports/ (+ actions.ts where they write)
```
Sharing `src/pages/tasks/actions.ts` across pages follows the existing shared `src/pages/notification-actions.ts`.

---

## 7. `actions.ts` functions

All return `Promise<ActionResult<…>>` (`src/lib/action.ts`) via `apiAction` unless noted; `const enc = encodeURIComponent;` for path ids (as `src/pages/assets/actions.ts`).
Paths and methods are binding: they must match backend plan §12 exactly.

### 7.1 `src/pages/projects/actions.ts`

| Function | Method + path | Body |
|---|---|---|
| `createProject(input)` | `POST /api/projects` | `{key, name, description, visibility, color, departmentId}` → `{id, key}` |
| `updateProject(projectId, input)` | `PUT /api/projects/{projectId}` | `{version, name, description, visibility, color, departmentId}` → `{version}` |
| `setProjectStatus(projectId, status)` | `PUT /api/projects/{projectId}/status` | `{status: "ACTIVE" \| "ARCHIVED"}` |
| `deleteProject(projectId)` | `DELETE /api/projects/{projectId}` | — |
| `addProjectMember(projectId, employeeId, role)` | `POST /api/projects/{projectId}/members` | `{employeeId, role}` |
| `changeProjectMemberRole(projectId, employeeId, role)` | `PUT /api/projects/{projectId}/members/{employeeId}` | `{role}` |
| `removeProjectMember(projectId, employeeId)` | `DELETE /api/projects/{projectId}/members/{employeeId}` | — |
| `createProjectStatus(projectId, input)` | `POST /api/projects/{projectId}/workflow-statuses` | `{name, category, color}` |
| `updateProjectStatus(projectId, statusId, input)` | `PUT /api/projects/{projectId}/workflow-statuses/{statusId}` | `{name, category, color, isInitial}` |
| `reorderProjectStatuses(projectId, statusIds)` | `PUT /api/projects/{projectId}/workflow-status-order` | `{statusIds}` |
| `deleteProjectStatus(projectId, statusId, moveTasksToStatusId?)` | `DELETE /api/projects/{projectId}/workflow-statuses/{statusId}?moveTasksToStatusId=` | — |
| `createTaskLabel(input)` | `POST /api/task-labels` | `{name, color, projectId?}` |
| `updateTaskLabel(labelId, input)` | `PUT /api/task-labels/{labelId}` | `{name, color}` |
| `deleteTaskLabel(labelId)` | `DELETE /api/task-labels/{labelId}` | — |

### 7.2 `src/pages/tasks/actions.ts`

| Function | Method + path | Body |
|---|---|---|
| `createTask(input)` | `POST /api/tasks` | `TaskInput` (backend §12.1) → `{id, key}` |
| `updateTask(taskId, changes)` | `PATCH /api/tasks/{taskId}` | `{version, …changed fields}` incl. `assigneeId`, `indirectAssigneeId`, `dueDate`, `dueTime` (`null` clears; `statusCategory` allowed instead of `statusId`, see §5.1) → `{version}` |
| `moveTask(taskId, target)` | `PUT /api/tasks/{taskId}/position` | `{statusId, previousTaskId?, nextTaskId?}` |
| `deleteTask(taskId)` | `DELETE /api/tasks/{taskId}` | — |
| `followTask(taskId, employeeId)` | `PUT /api/tasks/{taskId}/watchers/{employeeId}` | — |
| `unfollowTask(taskId, employeeId)` | `DELETE /api/tasks/{taskId}/watchers/{employeeId}` | — |
| `addChecklistItem(taskId, text)` | `POST /api/tasks/{taskId}/checklist-items` | `{text}` |
| `updateChecklistItem(taskId, itemId, changes)` | `PATCH /api/tasks/{taskId}/checklist-items/{itemId}` | `{text?, isDone?, position?}` |
| `deleteChecklistItem(taskId, itemId)` | `DELETE /api/tasks/{taskId}/checklist-items/{itemId}` | — |
| `addComment(taskId, body)` | `POST /api/tasks/{taskId}/comments` | `{body}` |
| `editComment(taskId, commentId, body)` | `PATCH /api/tasks/{taskId}/comments/{commentId}` | `{body}` |
| `deleteComment(taskId, commentId)` | `DELETE /api/tasks/{taskId}/comments/{commentId}` | — |
| `uploadTaskAttachment(taskId, file)` | `POST /api/tasks/{taskId}/attachments` (multipart `file`, via `apiUpload`) | → `{id, name}` |
| `deleteTaskAttachment(taskId, attachmentId)` | `DELETE /api/tasks/{taskId}/attachments/{attachmentId}` | — |
| v2 `updateTasks(taskIds, changes)` | `PATCH /api/tasks` | `{taskIds, changes}` |
| v2 `restoreTask(taskId)` | `POST /api/tasks/{taskId}/restoration` | — |
| v2 `addTaskDependency(taskId, dependsOnTaskId)` / `removeTaskDependency(…)` | `POST /api/tasks/{taskId}/dependencies` / `DELETE /api/tasks/{taskId}/dependencies/{dependsOnTaskId}` | `{dependsOnTaskId}` |
| v2 `setTaskRecurrence(taskId, rule)` / `removeTaskRecurrence(taskId)` | `PUT` / `DELETE /api/tasks/{taskId}/recurrence` | rule fields |
| v2 `importTasks(projectId, file, isDryRun)` | `POST /api/projects/{projectId}/task-imports?isDryRun=` (multipart) | — |
| v2 `saveTaskFilter(input)` / `updateTaskFilter` / `deleteTaskFilter` | `POST /api/task-filters`, `PUT`/`DELETE /api/task-filters/{filterId}` | `{name, page, projectId?, query}` |

Downloads are plain links (no action): attachment `href="/api/tasks/{taskId}/attachments/{attachmentId}/file"`; v2 export `href="/api/tasks/export?…"` with `download` (pattern: the audit export link).

### 7.3 `src/pages/task-settings/actions.ts`

| Function | Method + path | Body |
|---|---|---|
| `createDefaultStatus(input)` | `POST /api/task-settings/workflow-statuses` | `{name, category, color}` |
| `updateDefaultStatus(statusId, input)` | `PUT /api/task-settings/workflow-statuses/{statusId}` | `{name, category, color, isInitial}` |
| `reorderDefaultStatuses(statusIds)` | `PUT /api/task-settings/workflow-status-order` | `{statusIds}` |
| `deleteDefaultStatus(statusId, moveTasksToStatusId?)` | `DELETE /api/task-settings/workflow-statuses/{statusId}?moveTasksToStatusId=` | — |
| v2 template functions | `/api/task-templates…` | as backend §12.2 |

Company labels reuse `createTaskLabel` etc. from `src/pages/projects/actions.ts` (no `projectId`).

### 7.4 Reads (`useData` paths, for reference)

`/api/tasks/mine?…`, `/api/tasks/team?…`, `/api/tasks?projectId=…`, `/api/tasks/{ref}`, `/api/tasks/{taskId}/comments?page=`, `/api/tasks/{taskId}/activity?page=`, `/api/tasks/assignees?search=&projectId=` (person picker; small direct `apiData` call inside the picker, debounced 250 ms like `SearchBox`, not `useData`, because it changes per keystroke), `/api/projects?…`, `/api/projects/{id}`, `/api/projects/{id}/members`, `/api/projects/{id}/board?…`, `/api/task-labels?projectId=`, `/api/task-settings`; v2 `/api/task-reports/summary?…`, `/api/task-filters/mine`, `/api/task-templates?projectId=`, `/api/tasks/deleted`.

---

## 8. Board drag and drop

**No new dependency.** `package.json` has only React, React Router, TanStack Query and small libraries; a drag-and-drop library (e.g. dnd-kit) adds weight and a knip/maintenance cost for one screen. Native HTML5 drag and drop covers mouse/trackpad; a keyboard/touch "Move to…" control covers the rest.

1. **Mouse:** `TaskCard` has `draggable` and `onDragStart` (sets `dataTransfer.setData("text/plain", taskId)` and `effectAllowed = "move"`). Each column's card list handles `onDragOver` (`preventDefault`, compute the insertion index from the pointer's Y against the cards' midpoints, show a 2 px drop line), `onDragLeave`, `onDrop`.
2. **Drop → API:** compute `previousTaskId` / `nextTaskId` (the neighbours at the drop index, excluding the dragged card) and call `moveTask(taskId, { statusId, previousTaskId, nextTaskId })` (project board) or `updateTask(taskId, { version, statusCategory })` (My tasks board, category columns; no manual order there).
3. **Optimistic view:** the board keeps a local `pendingMove` state (task id → target column/index) and renders cards from `data + pendingMove` until the action promise resolves (`apiAction` waits for the refetch, so the fresh order is already there); on `{ ok: false }` clear `pendingMove` (the card jumps back) and `toast(error, "bad")`.
4. **Touch and keyboard:** every card has a "Move" button (`aria-label="Move WEB-12"`, icon `drag`) that opens a small menu: a status list (radio) + "Move up" / "Move down" / "To top" / "To bottom". It calls the same `moveTask`. Touch devices do not fire HTML5 drag events, so this is the phone path too.
5. **Live region:** after a move, announce "WEB-12 moved to In review" in an `aria-live="polite"` `.sr-only` element.
6. **Limits:** do not allow drag while read-only, while the project is archived, or when the user may not change the task's status (`canChangeStatus` false; list and board rows carry no permissions, so the board allows drag for project owners/members and for tasks where `myAssignment` is set, and the API's 403 is the final check) — such cards render without `draggable`.

---

## 9. Keyboard and accessibility

- All controls are real `button`/`a`/`select`/`input` elements; clickable rows use `tabIndex=0` + Enter (CSS for `table.t tbody tr[tabindex]:focus-visible` already exists).
- Drawer and modals: focus moves inside on open and back to the opener on close; Esc closes (existing `Modal`/`Drawer` behaviour).
- Board columns are `role="list"` with `aria-label="{status} ({count})"`; cards are `role="listitem"` containing a link to the task and the Move button.
- Task fields have visible labels (`.field`); the editable title has `aria-label="Title"`.
- Status/priority are never colour-only: chips carry text; overdue dates carry "Overdue" text for screen readers.
- The person picker and mention picker are listboxes with arrow keys, Enter to pick, Esc to close.
- Shortcuts (only when focus is not in an input): `n` = new task on My tasks / Project pages; `/` = focus search. Show them in the command palette entries ("New task"); keep the list short to avoid clashes with ⌘K.
- Contrast: use the existing tokens (`--bad`, `--ok`, `--faint` were nudged to WCAG AA in the additions block).

---

## 10. Responsive behaviour

| Element | 1280 px | 390 px (no sideways scroll) |
|---|---|---|
| Sidebar | fixed left | drawer (existing `.side.open` + burger) |
| Toolbars | one row | wrap (`.toolbar` already wraps); filters collapse into a "Filters" button opening a `Drawer` with the same selects |
| My tasks list | table-like rows with all columns | two-line rows: title on line 1; key · due · status on line 2; project/labels hidden (`hide-sm`) |
| Task tables | `.table-wrap` + `table.t` | keep only Key, Title, Due, Status (others `hide-sm`); `.table-wrap` must not overflow (titles wrap, `min-width: 0`) |
| Board | columns side by side (min 260 px each); if more columns than fit, **the board area** scrolls horizontally inside its own container (`overflow-x: auto` on the board only, the page itself never scrolls sideways) | one column at a time: a `.seg` / select of statuses above the cards ("To do (5)"); cards full width; Move menu instead of drag |
| Task drawer | `Drawer` 560 px from the right | full screen (`width: 100vw`), sticky header with ✕ |
| Task fields row | five boxes in a row | 2-column grid (`.grid2`), then stacked |
| Projects | `.grid3` cards | 1 column |
| Team people cards | horizontal row of cards (wraps) | horizontal list inside its own scroll container, or wrap to 2 per row |
| Calendar (v2) | month grid | agenda list |

Check both widths in the e2e (Playwright `page.setViewportSize({ width: 390, height: 844 })`) by asserting `document.documentElement.scrollWidth <= 390`.

---

## 11. Loading, empty, error and read-only states

| State | What the user sees |
|---|---|
| First load | `PageLoading` (`src/lib/page.tsx`) |
| Filter change | previous rows stay, dimmed by `Pending` |
| Error (403/404/other) | `PageErrorBoundary` with Retry (existing); a task you cannot see shows "Not found" (the API answers 404 on purpose) |
| Empty My tasks | `.empty`: "Nothing on your plate" + "Add a task" button |
| Empty filtered list | "No tasks match these filters" + `ClearFilters` |
| Empty project | "No tasks yet" + "Add the first task" |
| No projects | "No projects yet" + (with `projects.create`) "Create a project", else "Ask your manager to add you to a project" |
| Team with no tasks | "Your team has no open tasks" |
| Read-only (subscription ended) | all create/edit/move/comment controls hidden (`useReadOnly()`), banner from the shell as today |
| Archived project | banner + no write controls |
| Stale edit (409) | inline message + Reload |
| Upload too big / wrong type | the API message in a toast (checked client-side first: 10 MB, allowed extensions) |

---

## 12. Translations

Every `t("…")` key needs Hindi in `src/lib/i18n/messages/hi.ts` (keep `{placeholders}` identical; the unit test checks it). Group them under a `// tasks` comment. Main groups:

1. **Menu and titles:** "Tasks", "My tasks", "Team tasks", "Projects", "Task settings", "Task calendar", "Task reports", "Project", "Project settings", "Task".
2. **Fields:** Title, Description, Type, Status, Priority, Assignee, Accountable, "does the work", "oversees it", Reporter, Followers, Start date, Due date, Due time, "Due times are in the assignee's time zone", "{time} {zone} time", Estimate, Labels, Sub-tasks, Checklist, Attachments, Comments, History, Key, Visibility, Members, Role, Colour, Department.
3. **Values:** Task / Issue / Request / Milestone; Urgent / High / Medium / Low / No priority; To do / In progress / Done (categories) and the default status names (To do, In progress, In review, Done, Cancelled); Private / Company-wide; Owner / Member / Viewer; Active / Archived; Overdue / Today / This week / Later / No date; All mine / Doing / Accountable / Reported by me / Following; Where I'm accountable; Nobody; List / Board.
4. **Actions:** New task, Add a task…, New project, Add member, Add status, Add label, Move, Move up, Move down, To top, To bottom, Follow, Stop following, Attach a file, Comment, Edit, Delete, Archive, Restore, Leave project, Include indirect reports, Copy link, Move to project, Reload.
5. **Sentences with placeholders:** "{n} overdue · {today} today · {week} this week", "{open} open · {overdue} overdue", "{key} moved to {status}", "{name} changed the status from {from} to {to}", "{name} assigned this to {assignee}", "{name} made {person} accountable", "Accountable: {name}", "{name} created this task", "Done in the last {days} days", "{done}/{total} done", "Someone else changed this task. Reload to see their changes." (also in `hi-api.ts` as it comes from the API).
6. **Empty/error states** listed in §11.
7. **Activity kinds** (§5.6) — one sentence per `kind` from backend plan §9.
8. **Audit labels:** new entries in `src/lib/audit-labels.ts` (`project.*`, `task.*`, `workflow_status.*`, `task_label.*`) and the new "Tasks" event group, with Hindi.
9. **Permissions:** the two new permission labels and the "Tasks" group in `src/lib/permissions.ts` (shown on the Roles page), with Hindi.
10. **API messages:** each fixed validation/rule message from the backend task services in `hi-api.ts`.

Stored notification texts are generated by the API in English (existing behaviour for the bell); no Hindi needed for them.

---

## 13. Design classes and CSS additions

Use the prototype classes in `src/globals.css` (do not edit the prototype part):
`.col`, `.row`, `.card`, `.card-h`, `.enter` (with `--i`), `.toolbar`, `.tsearch`, `.tsel`, `.seg`, `.tcount`, `.table-wrap`, `table.t`, `.pager`, `.chip` (+ tone classes as used in `AuditTable.tsx`: `ok`, `warn`, `bad`, `info`, `gold`, `neutral`, `nodot`), `.badge`, `.btn` / `.btn-gold` / `.btn-ghost` / `.btn-sm` / `.btn-lg` / `.btn-danger`, `.icon-btn`, `.field` / `.hint` / `.err`, `.grid2` / `.grid3`, `.kpis` / `.kpi`, `.empty`, `.muted`, `.mono`, `.avatar`, `.modal` / `.drawer`, `.linkish`, `.cal` (calendar v2), `.bars` (reports v2), `.sr-only`, `.hide-sm`.

New CSS goes at the end of the "JurisOne additions" block, prefixed `task-`/`board-` to avoid clashes:
`.board` (flex row, gap, `overflow-x:auto` only on itself), `.board-col` (min-width 260 px, `--surface` background, rounded), `.board-col-h`, `.board-drop` (2 px `--accent` line), `.task-card` (card look, `cursor:grab`, focus ring), `.task-card.dragging` (opacity .5), `.task-key` (mono, faint), `.task-meta` (wrap row), `.task-prio-urgent|high|medium|low` (small icon colours from existing tokens), `.task-overdue` (`color: var(--bad)`), `.task-label` (chip variant with palette colour via a CSS variable), `.task-fields` (grid of field boxes, 5 → 2 → 1 columns), `.mention` (subtle accent chip), `.task-group-h` (My tasks bucket header), plus `@media (max-width:700px)` rules for the one-column board and full-screen drawer. Use only existing colour tokens (`--accent`, `--accentsoft`, `--bad`, `--badbg`, `--ok`, `--line`, `--surface`, `--elev`, `--faint`, `--muted`) so light and dark themes both work.

---

## 14. Tests

### 14.1 Unit (`tests/unit/`, Vitest)

| File | Covers |
|---|---|
| `tasks.test.ts` (new) | `dueBucket` (overdue/today/this week/later/no date across a week boundary), `formatDue` (date only, date + time, other zone), the same-day sort order (timed first, date-only last), `formatEstimate`, `priorityRank` ordering, `splitMentions` / `insertMention` (tokens, unknown ids, text without mentions), project key suggestion from a name |
| `nav.test.ts` (extend) | task items have no `module` (shown in every business); `team-tasks` needs reports; `task-settings` only with `tasks.manage`; Admin (no `self`) still sees My tasks and Projects |
| `i18n.test.ts` (existing) | automatically fails on any missing Hindi string and checks new nav labels |

### 14.2 End-to-end (`tests/e2e/tasks.spec.ts`, Playwright)

Uses `login(page, code)`, `expectLanded`, `sql` from `tests/e2e/helpers.ts` and the demo seed (backend plan §16): owner `JC-002` (Sana), HR manager `JC-012` (Riya), finance manager `JC-004` (Arjun), manager `JC-035` (Nazneen, reports JC-049/058/072/074), employee `JC-072` (Siddharth). Clean up rows created by the test in `beforeAll`/`afterAll` (pattern of `assets-announcements.spec.ts`: titles prefixed `E2E task`).

| # | Role | Scenario |
|---|---|---|
| 1 | Owner JC-002 | Sees the Tasks group with Task settings; sees the private project Payroll October without being a member (and an `project.private_access` row appears in `audit_log`); creates project "E2E Ops" (key `E2EO`, private); adds JC-012 as member; adds a status "Blocked" in the workflow. |
| 2 | Manager JC-035 | Opens Website relaunch board; creates a task with assignee JC-072, accountable JC-035 herself, due yesterday at 10:00 (date + time); the toast shows; the card shows both avatars in To do; the task is in her My tasks under "Accountable". |
| 3 | Employee JC-072 | My tasks badge shows ≥ 1; the task is under Overdue; opens it, moves it to In progress with the Move menu (keyboard path); drags another card to In review (mouse path); comments with `@Nazneen`; marks a checklist item done. |
| 4 | Manager JC-035 | Bell shows the mention; Team tasks lists JC-072's task with the new status; the "Include indirect reports" switch changes the URL to `depth=2`. |
| 5 | Employee JC-058 (not a member of a private project) | Opening `/tasks/PAY-1` shows Not found; `/projects` does not list Payroll October. |
| 6 | HR JC-012 | Cannot see Payroll October (private, finance) — HR has no special task access; can see People operations (company-wide) and comment, but the board has no drag handles if only a viewer. |
| 7 | Indirect assignee: Finance Manager JC-004 (not a member of People operations) on the seeded PEO task where Pooja JC-015 does the work | The task is in his My tasks under "Accountable"; he can change status and priority and reassign the direct assignee; the title is plain text (not editable) and Delete is not offered; he sees no "New project" button (no `projects.create`). |
| 8 | Read-only | `sql()` ends the subscription (restore after): task pages open, write buttons are hidden. |
| 9 | Phone | 390 × 844 viewport: My tasks and the project board have no horizontal page scroll; the board shows one column with the status selector. |
| 10 | Attachment | JC-072 attaches a small PNG to their task; it is listed and downloadable; a `.exe` renamed file is refused with the API message. |
| 11 | Language | Switch to Hindi: the Tasks menu labels and My tasks headings show Hindi (pattern `language.spec.ts`). |

v2 adds: calendar month shows seeded due dates; reports KPIs for the owner; CSV export downloads; bulk status change on 3 tasks; template creates a task with its checklist; recurring task appears after a jobs run (the e2e env runs jobs once after the seed; use `sql()` to set `next_due_on`, then trigger via the backend `jobs` command only if the driver supports it — otherwise cover recurrence in backend tests only).

---

## 15. Phases and gates

Matches backend plan §20. Each phase: backend PR first, then this repo's PR, both to `dev`; owner demo; wait for "continue".

| Phase | Frontend content | Gate |
|---|---|---|
| **T1 — MVP** | nav + icons + permissions; routes; My tasks (list + board + quick add); Projects (cards + create); Project (list + board with DnD + Move menu); Project settings (details, members, workflow, labels, archive); task page + drawer (fields incl. assignee and accountable person with field-level rights, description, sub-tasks, checklist, attachments, comments with mentions, history, follow, delete); Team tasks (people summary + table + depth switch); Task settings (default workflow, company labels); shell badge; `apiUpload`; Hindi for everything; unit + e2e scenarios 1–11. Suggested split: **T1a** lists, project, board, task page without comments/attachments; **T1b** comments, mentions, attachments, team tasks, settings, badge. | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx knip` clean, `npm run test:e2e` green against the backend branch; manual check at 390 px and 1280 px in light and dark theme; owner demo |
| **T2 — Planning tools** | Task calendar; Task reports; bulk select + bulk edit bar on lists; CSV export link and import dialog (dry run preview → import); saved filters (dropdown on My tasks / Project); templates (settings + "New task from template"); recurring rule editor on the task; dependencies section ("Blocked by"); recently deleted + restore; limited markdown in `RichText`; command-palette action "New task". | same + e2e for each new feature |
| **T3 — Advanced** | Custom fields (settings + task fields + filters); configurable types; timeline/Gantt view (CSS grid of weeks, bars from start/due, dependency lines optional); WIP limits on board columns; first integrations (JurisTrack time per task in the task page, leave warnings in the person picker). | same |
| **Later: email alerts** (the owner will start it; backend plan §20) | A "Task notifications" card on the profile page: per event, bell on/off and email on/off (`GET`/`PUT /api/task-notification-preferences/mine`), and a daily digest switch; Hindi for its labels. Nothing in T1–T3 sends or configures email. | same |

---

## 16. Open questions

**Decided by the owner (2026-10-23)** — same list as backend plan §22.1:
1. Tasks is **free for everybody**: no plan module, no module gating; the Tasks group shows for every signed-in user of every business (items still follow their permissions); read-only after a subscription ends stays (global rule).
2. `projects.create` goes to the **Owner and HR Manager** only; everybody can create personal tasks.
3. The **Owner sees all projects and tasks**, private ones included; every write is audited and opening a private project/task they are not part of writes a `*.private_access` audit row. This is the only exception to "a task you cannot see is not found".
4. **One direct assignee** (does the work) + **one optional indirect assignee** ("Accountable", oversees it); both see it in My tasks, both get notifications, both show on cards and in the task panel; followers stay a separate list.
5. The **indirect assignee** can comment, change status and priority, and reassign the direct assignee; cannot delete the task unless they are a project owner (other fields only if they are also a project member).
6. **Bell only** for now; no emails in T1 or T2; email alerts are a later phase the owner will start (§15 "Later: email alerts").
7. A **manager sees (read + comment) the tasks of their reports**, also inside private projects.
8. **Default steps:** To do, In progress, In review, Done, Cancelled (editable per project).
9. **Soft delete always:** tasks, comments, attachments with their files, and projects are never hard-deleted by the app, in any phase; T2 adds the 30-day "recently deleted" list with restore.
10. List parameters stay **`sort` / `sortDirection`**.
11. **Due date + optional due time**, read in the direct assignee's time zone; without a time the task is due at the end of that day (23:59:59); date-only tasks become overdue the day after, timed tasks at their time (backend §8.6).
12. **Reminders at 09:00** in the direct assignee's time zone.
13. When creating a task, the assignee's **reporting manager is offered as a one-click "Accountable" suggestion**; never set automatically.
14. **No notification to project owners** when the Owner opens a private project; the audit entry is enough.

Still open:

| # | Question | Recommended default |
|---|---|---|
| F1 | Board on phones: one column with a status switch, or horizontal swipe between columns? | One column + status switch (no sideways scroll rule; simpler). |
| F2 | Should clicking a task in a list open a side panel or a full page? | Side panel (drawer) from lists, full page from notifications/links; both use the same component. |
| F3 | Drag-and-drop library? | None: native HTML5 drag + Move menu for keyboard/touch (no new dependency). Revisit only if users ask for touch dragging. |
| F4 | Show the My tasks badge also on the bell? | No; the menu badge is enough. |
| F5 | Hindi for user-typed content (task titles)? | Not translated (it is user data); only the UI is. |
| F6 | Default view of a project: List or Board? | Board for projects (visual), List for My tasks; remembered per person in `localStorage` (wrapped in try/catch), the URL `view=` wins. |
| F7 | Should the Home page get a "My tasks" card? | Yes in T2 (top 5 due today/overdue), reusing `GET /api/tasks/mine?due=OVERDUE…`; not in MVP to keep Home unchanged. |
| Q15 | Should **timed** tasks also get a reminder shortly before the due time (e.g. 1 hour before)? (same as backend §22.2) | No; only the 09:00 daily reminders. |

Contract reminder: `PATCH /api/tasks/{taskId}` accepts `statusCategory` (`TODO`/`IN_PROGRESS`/`DONE`) as an alternative to `statusId` (exactly one of them; the server picks the project's first status of that category). It is in the backend plan (§8.2 and §12.1 row T7).

---

## 17. How to start implementation

1. Read `INSTRUCTIONS.md`, `CLAUDE.md`, this file and `juris-one-backend/references/TASK_MANAGEMENT_BACKEND_PLAN.md`. Note which open questions the owner answered; otherwise use the defaults and say so.
2. Make sure the backend T1 endpoints exist on the backend `feature/task-management` branch (or build them first; the e2e tests start that API from the backend checkout).
3. `git fetch`, cut `feature/task-management` from `dev`.
4. T1a:
   1. `src/lib/nav.ts`, `src/lib/permissions.ts`, `Icon.tsx` icons, Hindi for labels; extend `tests/unit/nav.test.ts`.
   2. `src/lib/api-types.ts` task types, `src/lib/tasks.ts` helpers + `tests/unit/tasks.test.ts`.
   3. `src/lib/api.ts` `apiUpload`.
   4. Routes in `src/routes.tsx`; page folders with `page.tsx` + clients; `actions.ts` (§7) with paths copied from the backend plan.
   5. Shared components in `src/components/tasks/` (table, grouped list, board, card, detail, drawer, quick add, form modal, chips, person picker).
   6. CSS additions (§13).
5. T1b: comments + `MentionTextarea` + `RichText`, attachments, history, Team tasks, project settings, Task settings, badge in `Shell.tsx`, audit labels.
6. `tests/e2e/tasks.spec.ts` (§14.2).
7. Verify (§1): typecheck, lint, unit, build, knip, e2e with `BACKEND_REPO=../juris-one-backend`; check 390 px and 1280 px, light and dark, English and Hindi by hand.
8. Commit only when the owner asks; open the PR to `dev`, share the link, stop. Tell the owner in short Hindi/Hinglish what changed, what was checked, what is left.
