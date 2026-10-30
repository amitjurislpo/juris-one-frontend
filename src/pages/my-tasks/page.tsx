import { PageHeader } from "@/components/PageHeader";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { useTaskView } from "@/components/tasks/useTaskView";
import type { MyTasksPage as MyTasksData, ProjectRow, TaskPage } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { taskListPath } from "@/lib/tasks";
import { MyTasksClient } from "./MyTasksClient";

/** Defaults of GET /api/v1/tasks/mine on this page (the URL overrides them). */
const LIST_DEFAULTS = { relation: "ASSIGNED", statusCategory: "TODO,IN_PROGRESS", sort: "dueDate", pageSize: "200" };

/** Everything I do (direct assignee) or answer for (accountable), grouped by due; a board as the other view. */
export default function MyTasksPage() {
  const { user, t, searchParams } = usePage();
  const { view, setView } = useTaskView("jurisone.my-tasks.view", "list");
  // the board shows Done too (the last 14 days of it, filtered on screen)
  const data = useData<MyTasksData>(taskListPath("/api/v1/tasks/mine", searchParams, LIST_DEFAULTS, view === "board" ? { statusCategory: "TODO,IN_PROGRESS,DONE" } : {}));
  const projects = useData<TaskPage<ProjectRow>>("/api/v1/projects?status=ACTIVE&sort=name");
  if (!data || !projects) return <PageLoading />;
  const isTaskAdmin = user.perms.has("tasks.manage");
  // projects where I can add tasks (the quick add and "New task" offer these)
  const writableProjects = projects.rows.filter((project) => isTaskAdmin || project.myRole === "OWNER" || project.myRole === "MEMBER");

  return (
    <div className="col">
      <PageHeader eyebrow={t("Tasks")} title={t("My tasks")}
        sub={t("{overdue} overdue · {today} today · {week} this week", { overdue: data.counts.overdue, today: data.counts.today, week: data.counts.thisWeek })}>
        <NewTaskButton projects={writableProjects} />
      </PageHeader>
      <MyTasksClient data={data} projects={projects.rows} writableProjects={writableProjects} view={view} onViewChange={setView} />
    </div>
  );
}
