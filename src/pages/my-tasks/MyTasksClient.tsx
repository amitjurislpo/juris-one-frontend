import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { ClearFilters, Pending, SearchBox, SegmentedFilter, SelectFilter } from "@/components/table/Table";
import { changeTaskCategory } from "@/components/tasks/changeTaskCategory";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskBoard, type BoardColumn } from "@/components/tasks/TaskBoard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskGroupedList } from "@/components/tasks/TaskGroupedList";
import { useTaskDrawer } from "@/components/tasks/useTaskDrawer";
import type { TaskView } from "@/components/tasks/useTaskView";
import type { MyTasksPage, ProjectRow, TaskStatusCategory } from "@/lib/api-types";
import { todayIn } from "@/lib/format";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { hasFilters, STATUS_CATEGORIES, TASK_PRIORITIES } from "@/lib/tasks";

/** Done cards on the My tasks board: the last 14 days. */
const DONE_DAYS = 14;

/** Filters, quick add, and the grouped list or the To do / In progress / Done board of My tasks. */
export function MyTasksClient({ data, projects, writableProjects, view, onViewChange }: {
  data: MyTasksPage; projects: ProjectRow[]; writableProjects: ProjectRow[]; view: TaskView; onViewChange: (view: TaskView) => void;
}) {
  const { user, t, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { openTask } = useTaskDrawer();
  const quickAdd = useRef<HTMLDivElement>(null);
  const today = todayIn(user.timeZone);
  const open = (task: { key: string | null; id: string }) => openTask(task.key ?? task.id);

  const doneSince = Date.now() - DONE_DAYS * 86_400_000;
  const columns: BoardColumn[] = (Object.keys(STATUS_CATEGORIES) as TaskStatusCategory[]).map((category) => {
    const tasks = data.rows.filter((task) => task.statusCategory === category && (category !== "DONE" || !task.completedAt || new Date(task.completedAt).getTime() >= doneSince));
    return { key: category, title: category === "DONE" ? t("Done (last {days} days)", { days: DONE_DAYS }) : t(STATUS_CATEGORIES[category]), count: tasks.length, tasks };
  });
  const isEmpty = data.rows.length === 0;

  return (
    <>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SegmentedFilter name="relation" dflt="ASSIGNED" label={t("Show")} options={[
          { value: "ASSIGNED", label: t("All mine") }, { value: "DIRECT", label: t("Doing") }, { value: "INDIRECT", label: t("Accountable") },
          { value: "REPORTED", label: t("Reported by me") }, { value: "WATCHING", label: t("Following") },
        ]} />
        <div className="seg" role="group" aria-label={t("View")}>
          <button type="button" className={view === "list" ? "on" : undefined} aria-pressed={view === "list"} onClick={() => onViewChange("list")}><Icon name="list" size={14} /> {t("List")}</button>
          <button type="button" className={view === "board" ? "on" : undefined} aria-pressed={view === "board"} onClick={() => onViewChange("board")}><Icon name="board" size={14} /> {t("Board")}</button>
        </div>
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 2 }}>
        <SearchBox placeholder={t("Search tasks…")} label={t("Search tasks")} />
        <SelectFilter name="projectId" label={t("Project")} dflt="" options={[{ value: "", label: t("All") }, ...projects.map((project) => ({ value: project.id, label: project.key }))]} />
        <SelectFilter name="priority" label={t("Priority")} dflt="" options={[{ value: "", label: t("All") }, ...Object.entries(TASK_PRIORITIES).map(([value, priority]) => ({ value, label: t(priority.label) }))]} />
        {view === "list" && (
          <SelectFilter name="statusCategory" label={t("Status")} dflt="TODO,IN_PROGRESS" options={[
            { value: "TODO,IN_PROGRESS", label: t("Open tasks") }, { value: "TODO", label: t("To do") }, { value: "IN_PROGRESS", label: t("In progress") },
            { value: "DONE", label: t("Done") }, { value: "TODO,IN_PROGRESS,DONE", label: t("All") },
          ]} />
        )}
        {hasFilters(searchParams) && <ClearFilters />}
        <span className="tcount">{data.total === 1 ? t("1 task") : t("{n} tasks", { n: data.total })}</span>
      </div>
      {!readOnly && <div ref={quickAdd} className="enter" style={{ ["--i" as string]: 3 }}><QuickAddTask projects={writableProjects} /></div>}
      <Pending>
        {isEmpty ? (
          hasFilters(searchParams) ? (
            <div className="empty"><b className="display">{t("No tasks match these filters")}</b><ClearFilters /></div>
          ) : (
            <div className="empty">
              <b className="display">{t("Nothing on your plate")}</b>
              <span className="muted">{t("Tasks you do or answer for show up here.")}</span>
              {!readOnly && <button type="button" className="btn btn-sm" onClick={() => quickAdd.current?.querySelector("input")?.focus()}>{t("Add a task")}</button>}
            </div>
          )
        ) : view === "board" ? (
          <TaskBoard label={t("My tasks board")} columns={columns} allowsOrdering={false}
            canMove={(task) => !readOnly && task.myAssignment !== null}
            onMove={(task, move) => changeTaskCategory(task, move.toKey as TaskStatusCategory)} onOpen={open} />
        ) : (
          <section className="card enter" style={{ ["--i" as string]: 4 }}>
            <TaskGroupedList rows={data.rows} today={today} onOpen={open} />
          </section>
        )}
      </Pending>
      <TaskDrawer />
    </>
  );
}
