import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SelectFilter } from "@/components/table/Table";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskBoard, type BoardColumn } from "@/components/tasks/TaskBoard";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useTaskDrawer } from "@/components/tasks/useTaskDrawer";
import type { TaskView } from "@/components/tasks/useTaskView";
import type { ProjectBoard, ProjectDetail, ProjectMember, TaskPage, TaskRow } from "@/lib/api-types";
import Link from "@/lib/link";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { colorTone, hasFilters, statusName, TASK_PRIORITIES, VISIBILITIES } from "@/lib/tasks";
import { moveTask } from "@/pages/tasks/actions";

/** "+ Add a task" under a board column: a one-line create into that step. */
function ColumnAdd({ projectId, statusId }: { projectId: string; statusId: string }) {
  const { t } = usePage();
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen) return <button type="button" className="btn btn-sm btn-ghost board-add" onClick={() => setIsOpen(true)}><Icon name="plus" size={13} />{t("Add a task")}</button>;
  return <div className="board-add-form" onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}><QuickAddTask projectId={projectId} statusId={statusId} label={t("Task title (Enter to save)")} /></div>;
}

/** One project: header, List / Board, filters, and the task panel. */
export function ProjectClient({ project, members, board, list, view, onViewChange }: {
  project: ProjectDetail; members: ProjectMember[]; board?: ProjectBoard; list?: TaskPage<TaskRow>; view: TaskView; onViewChange: (view: TaskView) => void;
}) {
  const { t, searchParams } = usePage();
  const readOnly = useReadOnly();
  const { openTask } = useTaskDrawer();
  const isArchived = project.status === "ARCHIVED";
  const canWrite = !readOnly && !isArchived;
  const canCreate = canWrite && project.canCreateTasks;
  const isMemberOrOwner = project.canManage || project.myRole === "OWNER" || project.myRole === "MEMBER";
  const open = (task: TaskRow) => openTask(task.key ?? task.id);
  const people = [{ value: "", label: t("Anyone") }, { value: "none", label: t("Nobody") }, ...members.map((member) => ({ value: member.employeeId, label: member.name }))];

  const columns: BoardColumn[] = (board?.columns ?? []).map((column) => ({
    key: column.status.id,
    title: statusName(column.status.name, t),
    count: column.taskCount,
    tasks: column.tasks,
    footer: canCreate && column.status.category !== "DONE" ? <ColumnAdd projectId={project.id} statusId={column.status.id} /> : undefined,
  }));
  const rows = view === "board" ? columns.flatMap((column) => column.tasks) : list?.rows ?? [];

  return (
    <div className="col">
      <PageHeader back="/projects" eyebrow={<><span className={`project-swatch ${colorTone(project.color)}`} aria-hidden="true"></span> {project.key} · {t(VISIBILITIES[project.visibility].label)}</>} title={project.name}
        sub={t("{open} open · {overdue} overdue · {members} members", { open: project.openTaskCount, overdue: project.overdueTaskCount, members: project.memberCount })}>
        <span className="project-avatars" aria-label={t("Members")}>
          {members.slice(0, 5).map((member) => <Avatar key={member.employeeId} id={member.employeeId} name={member.name} photo={member.photo} style={{ width: 28, height: 28, fontSize: 11 }} />)}
          {members.length > 5 && <span className="muted">+{members.length - 5}</span>}
        </span>
        {(project.canManage || project.myRole) && <Link className="btn" href={`/projects/${encodeURIComponent(project.id)}/settings`}><Icon name="sliders" size={15} />{t("Settings")}</Link>}
        {canCreate && <NewTaskButton project={project} />}
      </PageHeader>
      {isArchived && <div className="card task-banner" role="status">{t("This project is archived. Restore it in the settings to make changes.")}</div>}
      {project.description && <p className="muted project-description">{project.description}</p>}
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <div className="seg" role="group" aria-label={t("View")}>
          <button type="button" className={view === "list" ? "on" : undefined} aria-pressed={view === "list"} onClick={() => onViewChange("list")}><Icon name="list" size={14} /> {t("List")}</button>
          <button type="button" className={view === "board" ? "on" : undefined} aria-pressed={view === "board"} onClick={() => onViewChange("board")}><Icon name="board" size={14} /> {t("Board")}</button>
        </div>
        <SearchBox placeholder={t("Search tasks…")} label={t("Search tasks")} />
        <SelectFilter name="assigneeId" label={t("Assignee")} dflt="" options={people} />
        <SelectFilter name="indirectAssigneeId" label={t("Accountable")} dflt="" options={people} />
        {project.labels.length > 0 && <SelectFilter name="labelId" label={t("Label")} dflt="" options={[{ value: "", label: t("All") }, ...project.labels.map((label) => ({ value: label.id, label: label.name }))]} />}
        <SelectFilter name="priority" label={t("Priority")} dflt="" options={[{ value: "", label: t("All") }, ...Object.entries(TASK_PRIORITIES).map(([value, priority]) => ({ value, label: t(priority.label) }))]} />
        {hasFilters(searchParams) && <ClearFilters />}
      </div>
      <Pending>
        {view === "board" && board ? (
          <>
            <TaskBoard label={t("Board of {project}", { project: project.name })} columns={columns} allowsOrdering
              canMove={(task) => canWrite && (isMemberOrOwner || task.myAssignment !== null)}
              onMove={(task, move) => moveTask(task.id, { statusId: move.toKey, previousTaskId: move.previousTaskId, nextTaskId: move.nextTaskId })} onOpen={open} />
            <p className="hint">{t("Done steps show the tasks finished in the last 14 days.")}</p>
          </>
        ) : list ? (
          <section className="card enter" style={{ ["--i" as string]: 2 }}>
            {list.rows.length ? <TaskTable rows={list.rows} onOpen={open} showLabels /> : null}
            <Pager page={list.page} take={list.take} total={list.total} />
          </section>
        ) : null}
        {!rows.length && (
          hasFilters(searchParams) ? <div className="empty"><b className="display">{t("No tasks match these filters")}</b><ClearFilters /></div>
            : view === "list" && <div className="empty"><b className="display">{t("No tasks yet")}</b>{canCreate && <span className="muted">{t("Add the first task with “New task”.")}</span>}</div>
        )}
      </Pending>
      <TaskDrawer />
    </div>
  );
}
