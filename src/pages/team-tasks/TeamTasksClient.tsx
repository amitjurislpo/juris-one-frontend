import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { useQuery } from "@/components/table/useQuery";
import { ClearFilters, Pager, Pending, SearchBox, SelectFilter } from "@/components/table/Table";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useTaskDrawer } from "@/components/tasks/useTaskDrawer";
import type { TaskRow, TeamTasksPage } from "@/lib/api-types";
import { usePage } from "@/lib/page";
import { DUE_BUCKETS, hasFilters } from "@/lib/tasks";

/**
 * The tasks of the people who report to me (with the switch, also their reports): a card per person (open, overdue,
 * finished in the last 7 days; a click filters to them) and the task table. The manager reads and comments; the task's
 * own rights decide the rest.
 */
export function TeamTasksClient({ data }: { data: TeamTasksPage }) {
  const { user, t, searchParams } = usePage();
  const { get, set } = useQuery();
  const { openTask } = useTaskDrawer();
  const isDeep = get("depth") === "2";
  const personId = get("employeeId");
  const isAccountableOnly = get("indirectAssigneeId") === user.id;
  const totals = data.people.reduce((sum, person) => ({ open: sum.open + person.open, overdue: sum.overdue + person.overdue }), { open: 0, overdue: 0 });
  const open = (task: TaskRow) => openTask(task.key ?? task.id);

  return (
    <div className="col">
      <PageHeader eyebrow={t("Tasks")} title={t("Team tasks")}
        sub={t(data.people.length === 1 ? "1 person · {open} open · {overdue} overdue" : "{people} people · {open} open · {overdue} overdue", { people: data.people.length, open: totals.open, overdue: totals.overdue })}>
        <label className="task-switch">
          <input type="checkbox" role="switch" checked={isDeep} onChange={(e) => set({ depth: e.target.checked ? "2" : null, employeeId: null })} />
          {t("Include indirect reports")}
        </label>
      </PageHeader>
      <div className="team-people enter" style={{ ["--i" as string]: 1 }} role="group" aria-label={t("People")}>
        {data.people.map((person) => (
          <button key={person.employeeId} type="button" className={`card team-person${personId === person.employeeId ? " on" : ""}`} aria-pressed={personId === person.employeeId}
            onClick={() => set({ employeeId: personId === person.employeeId ? null : person.employeeId })}>
            <Avatar id={person.employeeId} name={person.name} photo={person.photo} />
            <span className="team-person-text">
              <b>{person.name}</b>
              <small className="muted">{person.code}{person.depth > 1 ? ` · ${t("indirect")}` : ""}</small>
              <small>{t("{open} open · {overdue} overdue", { open: person.open, overdue: person.overdue })}</small>
              <small className="muted">{t("{n} done in 7 days", { n: person.doneLast7Days })}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="toolbar enter" style={{ ["--i" as string]: 2 }}>
        <SearchBox placeholder={t("Search tasks…")} label={t("Search tasks")} />
        <SelectFilter name="employeeId" label={t("Person")} dflt="" options={[{ value: "", label: t("Everyone") }, ...data.people.map((person) => ({ value: person.employeeId, label: person.name }))]} />
        <SelectFilter name="due" label={t("Due")} dflt="" options={[{ value: "", label: t("Any time") }, ...DUE_BUCKETS.map((bucket) => ({ value: bucket.key, label: t(bucket.label) }))]} />
        <SelectFilter name="statusCategory" label={t("Status")} dflt="TODO,IN_PROGRESS" options={[
          { value: "TODO,IN_PROGRESS", label: t("Open tasks") }, { value: "TODO", label: t("To do") }, { value: "IN_PROGRESS", label: t("In progress") },
          { value: "DONE", label: t("Done") }, { value: "TODO,IN_PROGRESS,DONE", label: t("All") },
        ]} />
        <label className="task-switch">
          <input type="checkbox" checked={isAccountableOnly} onChange={(e) => set({ indirectAssigneeId: e.target.checked ? user.id : null })} />
          {t("Where I'm accountable")}
        </label>
        {hasFilters(searchParams) && <ClearFilters />}
        <span className="tcount">{data.total === 1 ? t("1 task") : t("{n} tasks", { n: data.total })}</span>
      </div>
      <Pending>
        <section className="card enter" style={{ ["--i" as string]: 3 }}>
          {data.rows.length ? <TaskTable rows={data.rows} onOpen={open} showProject /> : (
            <div className="empty" style={{ border: 0 }}>
              <b className="display">{hasFilters(searchParams) ? t("No tasks match these filters") : t("Your team has no open tasks")}</b>
              {hasFilters(searchParams) && <ClearFilters />}
            </div>
          )}
          <Pager page={data.page} take={data.take} total={data.total} />
        </section>
      </Pending>
      <TaskDrawer />
    </div>
  );
}
