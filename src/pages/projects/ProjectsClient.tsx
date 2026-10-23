import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ClearFilters, Pager, Pending, SearchBox, SegmentedFilter } from "@/components/table/Table";
import type { ProjectRow, TaskPage } from "@/lib/api-types";
import Link from "@/lib/link";
import { usePage } from "@/lib/page";
import { useRouter } from "@/lib/router";
import { useReadOnly } from "@/lib/session";
import { colorTone, PROJECT_ROLES, VISIBILITIES } from "@/lib/tasks";
import { ProjectFormModal } from "./ProjectFormModal";

/** The projects I can see as cards (the Owner sees all), with "New project" for those who may create one. */
export function ProjectsClient({ data, departments }: { data: TaskPage<ProjectRow>; departments: { id: string; name: string }[] }) {
  const { user, t, searchParams } = usePage();
  const router = useRouter();
  const readOnly = useReadOnly();
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = !readOnly && (user.perms.has("projects.create") || user.perms.has("tasks.manage"));
  const isFiltered = !!searchParams.search || !!searchParams.status;
  const active = data.rows.filter((project) => project.status === "ACTIVE").length;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Tasks")} title={t("Projects")}
        sub={data.total === 1 ? t("1 project") : t("{n} projects", { n: data.total })}>
        {canCreate && <button type="button" className="btn btn-gold btn-lg" onClick={() => setIsCreating(true)}><Icon name="plus" size={16} />{t("New project")}</button>}
      </PageHeader>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <SearchBox placeholder={t("Search projects…")} label={t("Search projects")} />
        <SegmentedFilter name="status" dflt="ACTIVE" label={t("Status")} options={[{ value: "ACTIVE", label: t("Active") }, { value: "ARCHIVED", label: t("Archived") }, { value: "ALL", label: t("All") }]} />
        <span className="tcount">{t("{n} active", { n: active })}</span>
      </div>
      <Pending>
        {!data.rows.length ? (
          isFiltered ? (
            <div className="empty"><b className="display">{t("No projects match")}</b><ClearFilters /></div>
          ) : (
            <div className="empty">
              <b className="display">{t("No projects yet")}</b>
              {canCreate ? <button type="button" className="btn btn-sm btn-gold" onClick={() => setIsCreating(true)}>{t("Create a project")}</button>
                : <span className="muted">{t("Ask your manager to add you to a project.")}</span>}
            </div>
          )
        ) : (
          <div className="grid3 project-cards">
            {data.rows.map((project, i) => (
              <Link key={project.id} href={`/projects/${encodeURIComponent(project.id)}`} className="card pad project-card enter" style={{ ["--i" as string]: Math.min(i + 2, 8) }}>
                <div className="project-card-h">
                  <span className={`project-swatch ${colorTone(project.color)}`} aria-hidden="true"></span>
                  <span className="task-key">{project.key}</span>
                  <b>{project.name}</b>
                </div>
                <small className="muted">{t(VISIBILITIES[project.visibility].label)}{project.ownerNames.length ? ` · ${t("Owner: {names}", { names: project.ownerNames.join(", ") })}` : ""}</small>
                <span className="project-card-counts">
                  {t("{open} open · {overdue} overdue", { open: project.openTaskCount, overdue: project.overdueTaskCount })}
                  {project.status === "ARCHIVED" && <span className="chip neutral nodot">{t("Archived")}</span>}
                </span>
                <small className="muted">{project.myRole ? t("You: {role}", { role: t(PROJECT_ROLES[project.myRole]) }) : t("You: not a member")}</small>
              </Link>
            ))}
          </div>
        )}
        <Pager page={data.page} take={data.take} total={data.total} />
      </Pending>
      {isCreating && <ProjectFormModal departments={departments} onClose={() => setIsCreating(false)} onCreated={(projectId) => router.push(`/projects/${encodeURIComponent(projectId)}`)} />}
    </div>
  );
}
