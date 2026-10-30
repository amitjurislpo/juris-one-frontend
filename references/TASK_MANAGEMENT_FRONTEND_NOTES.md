# Task management — frontend notes (contract gaps and decisions)

Written while building T1 against `TASK_MANAGEMENT_BACKEND_PLAN.md` §12, the backend's `TASK_MANAGEMENT_API_CHANGES.md` and the backend
worktree `feature/task-management`. Each entry: endpoint, what the frontend expected, what the backend did, and the state now.

## Contract gaps

1. **`TaskRow` had no `version`** (`GET /api/v1/tasks/mine`, `/api/v1/tasks`, `/api/v1/tasks/team`, board cards, `subtasks` in the detail).
   - Expected: the My tasks checkbox, the My tasks board and the sub-task tick send `PATCH /api/v1/tasks/{taskId}` with `{version, statusCategory}`.
   - Was: plan §12.4 `TaskRow` had no `version`.
   - **Resolved** in the backend (`TaskQuery` selects `t.version AS "version"`); the frontend uses `row.version` directly.

2. **`GET /api/v1/tasks/assignees` had no `reportingManagerName`**.
   - Expected (owner decision 13): the create form offers the assignee's reporting manager as accountable, by name.
   - **Resolved** in the backend (`reportingManagerName` in the assignee rows); the chip reads "Make {name} accountable".

## Followed from the backend's API changes

- `PUT /api/v1/projects/{projectId}` needs `key` every time: project settings always send it (the current key once the project has tasks).
- `GET /api/v1/tasks/assignees` with an empty `search` lists the first 20 people: the person picker shows them as soon as it opens.
- `GET /api/v1/task-settings` may return default steps with `id: null` (built-in set not stored yet): those rows are shown read-only; adding a step stores the set.

## Decisions taken while building (no contract change)

- Activity `before`/`after` (`GET /api/v1/tasks/{taskId}/activity`) are maps such as `{"statusName": "To do"}`; the history sentence takes the
  first readable value (`name`, `statusName`, `assigneeName`, …) and also accepts the JSON as text.
- My tasks board "Done (last 14 days)": `/api/v1/tasks/mine` has no `doneWithinDays`, so the board asks for `statusCategory=TODO,IN_PROGRESS,DONE`
  and filters Done cards by `completedAt` on screen (`pageSize=200`).
- Department in "New project" is offered only to people with `dept.manage` (the department list `GET /api/v1/departments` is theirs).
- Phone toolbars wrap instead of collapsing into a "Filters" drawer (no sideways scroll either way).
