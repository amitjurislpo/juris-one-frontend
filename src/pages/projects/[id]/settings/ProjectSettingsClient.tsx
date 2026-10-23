import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/shell/Toasts";
import { LabelEditor } from "@/components/tasks/LabelEditor";
import { PersonPicker, type PickedPerson } from "@/components/tasks/PersonPicker";
import { WorkflowEditor } from "@/components/tasks/WorkflowEditor";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { ActionResult } from "@/lib/action";
import type { ProjectDetail, ProjectMember, ProjectRole, ProjectVisibility } from "@/lib/api-types";
import { usePage } from "@/lib/page";
import { useRouter } from "@/lib/router";
import { useReadOnly } from "@/lib/session";
import { PROJECT_COLORS, PROJECT_ROLES, VISIBILITIES } from "@/lib/tasks";
import {
  addProjectMember, changeProjectMemberRole, createProjectStatus, deleteProject, deleteProjectStatus, removeProjectMember,
  reorderProjectStatuses, setProjectStatus, updateProject, updateProjectStatus,
} from "@/pages/projects/actions";

/** Details card: name, key (only while the project has no tasks), description, visibility, colour. */
function DetailsCard({ project, canEdit, hasTasks }: { project: ProjectDetail; canEdit: boolean; hasTasks: boolean }) {
  const { t } = usePage();
  const toast = useToast();
  const [form, setForm] = useState({ name: project.name, key: project.key, description: project.description ?? "", visibility: project.visibility, color: project.color ?? "purple" });
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const result = await updateProject(project.id, {
      version: project.version, name: form.name.trim(), description: form.description.trim() || null, visibility: form.visibility, color: form.color,
      departmentId: project.departmentId, key: hasTasks ? project.key : form.key,
    });
    if (result.ok) { setError(""); toast(result.message ?? t("Project saved")); } else setError(result.error);
  });
  return (
    <section className="card pad enter" style={{ ["--i" as string]: 1 }} aria-labelledby="project-details-h">
      <div className="card-h"><h3 id="project-details-h">{t("Details")}</h3></div>
      {canEdit ? (
        <div className="col" style={{ gap: 14 }}>
          <div className="grid2">
            <label className="field">{t("Name *")}<input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field">{t("Key")} {hasTasks && <span className="hint">{t("fixed once the project has tasks")}</span>}
              <input value={form.key} maxLength={6} disabled={hasTasks} onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
            </label>
          </div>
          <label className="field">{t("Description")}<textarea rows={2} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="grid2">
            <label className="field">{t("Visibility")}
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as ProjectVisibility })}>
                {Object.entries(VISIBILITIES).map(([value, visibility]) => <option key={value} value={value}>{t(visibility.label)}</option>)}
              </select>
              <span className="hint">{t(VISIBILITIES[form.visibility].hint)}</span>
            </label>
            <label className="field">{t("Colour")}<select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>{Object.entries(PROJECT_COLORS).map(([value, color]) => <option key={value} value={value}>{t(color.label)}</option>)}</select></label>
          </div>
          {error && <div className="err" role="alert">{error}</div>}
          <div><button type="button" className="btn btn-gold" disabled={busy || !form.name.trim()} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></div>
        </div>
      ) : (
        <div>
          <div className="kv"><span className="muted">{t("Name")}</span><b>{project.name}</b></div>
          <div className="kv"><span className="muted">{t("Key")}</span><b>{project.key}</b></div>
          <div className="kv"><span className="muted">{t("Visibility")}</span><b>{t(VISIBILITIES[project.visibility].label)}</b></div>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
      )}
    </section>
  );
}

/** Members card: roles, remove, add a person, leave. */
function MembersCard({ project, members, canEdit, userId }: { project: ProjectDetail; members: ProjectMember[]; canEdit: boolean; userId: string }) {
  const { t } = usePage();
  const toast = useToast();
  const router = useRouter();
  const [person, setPerson] = useState<PickedPerson | null>(null);
  const [role, setRole] = useState<ProjectRole>("MEMBER");
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const [busy, start] = useTransition();
  const run = (action: () => Promise<ActionResult>, success: string, after?: () => void) => start(async () => {
    const result = await action();
    if (result.ok) { toast(result.message ?? success); after?.(); } else toast(result.error, "bad");
  });
  const isMe = (member: ProjectMember) => member.employeeId === userId;
  return (
    <section className="card enter" style={{ ["--i" as string]: 2 }} aria-labelledby="project-members-h">
      <div className="card-h pad-x"><h3 id="project-members-h">{t("Members")} <span className="muted">({members.length})</span></h3></div>
      <div className="table-wrap">
        <table className="t task-table">
          <thead><tr><th>{t("Person")}</th><th>{t("Role")}</th><th></th></tr></thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.employeeId}>
                <td><span className="person"><Avatar id={member.employeeId} name={member.name} photo={member.photo} /><span><b>{member.name}</b><small>{member.code}{member.designation ? ` · ${member.designation}` : ""}{!member.isActive ? ` · ${t("left")}` : ""}</small></span></span></td>
                <td>
                  {canEdit ? (
                    <select value={member.role} aria-label={t("Role of {name}", { name: member.name })} onChange={(e) => run(() => changeProjectMemberRole(project.id, member.employeeId, e.target.value as ProjectRole), t("Role changed"))}>
                      {Object.entries(PROJECT_ROLES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                    </select>
                  ) : t(PROJECT_ROLES[member.role])}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {isMe(member) && !canEdit && <button type="button" className="btn btn-sm" onClick={() => setRemoving(member)}>{t("Leave project")}</button>}
                  {canEdit && <button type="button" className="btn btn-sm btn-ghost" aria-label={isMe(member) ? t("Leave project") : t("Remove {name}", { name: member.name })} onClick={() => setRemoving(member)}><Icon name="x" size={13} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="pad member-add">
          <PersonPicker label={t("Person to add")} value={person} onChange={setPerson} isNobodyAllowed={false} />
          <label className="field">{t("Role")}<select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>{Object.entries(PROJECT_ROLES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
          <button type="button" className="btn btn-gold" disabled={busy || !person} onClick={() => person && run(() => addProjectMember(project.id, person.id, role), t("Member added"), () => setPerson(null))}><Icon name="plus" size={14} />{t("Add member")}</button>
        </div>
      )}
      {removing && (
        <ConfirmDialog title={isMe(removing) ? t("Leave project") : t("Remove member")} danger confirm={isMe(removing) ? t("Leave project") : t("Remove")} busy={busy} onClose={() => setRemoving(null)}
          body={isMe(removing) ? t("You leave {project}. Tasks assigned to you stay assigned.", { project: project.name }) : t("{name} is removed from {project}. Tasks assigned to them stay assigned.", { name: removing.name, project: project.name })}
          onConfirm={() => run(() => removeProjectMember(project.id, removing.employeeId), isMe(removing) ? t("You left the project") : t("Member removed"), () => { const left = isMe(removing); setRemoving(null); if (left) router.push("/projects"); })} />
      )}
    </section>
  );
}

/** Archive / restore; delete only while the project has no tasks (a soft delete). */
function DangerCard({ project, hasTasks }: { project: ProjectDetail; hasTasks: boolean }) {
  const { t } = usePage();
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState<"archive" | "delete" | null>(null);
  const [busy, start] = useTransition();
  const isArchived = project.status === "ARCHIVED";
  const run = (action: () => Promise<ActionResult>, success: string, after?: () => void) => start(async () => {
    const result = await action();
    setConfirming(null);
    if (result.ok) { toast(result.message ?? success); after?.(); } else toast(result.error, "bad");
  });
  return (
    <section className="card pad enter task-danger" style={{ ["--i" as string]: 5 }} aria-labelledby="project-danger-h">
      <div className="card-h"><h3 id="project-danger-h">{t("Archive or delete")}</h3></div>
      <div className="col" style={{ gap: 10 }}>
        <div className="kv">
          <span className="muted">{isArchived ? t("The project is archived: everything can be read, nothing changed.") : t("Archive a finished project: its tasks leave everyone's lists and nothing can be changed.")}</span>
          {isArchived
            ? <button type="button" className="btn btn-sm" disabled={busy} onClick={() => run(() => setProjectStatus(project.id, "ACTIVE"), t("Project restored"))}>{t("Restore")}</button>
            : <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setConfirming("archive")}>{t("Archive")}</button>}
        </div>
        {!hasTasks && (
          <div className="kv">
            <span className="muted">{t("A project without tasks can be deleted.")}</span>
            <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => setConfirming("delete")}>{t("Delete")}</button>
          </div>
        )}
      </div>
      {confirming === "archive" && (
        <ConfirmDialog title={t("Archive project")} confirm={t("Archive")} busy={busy} onClose={() => setConfirming(null)}
          body={t("{project} becomes read-only and its tasks leave everyone's lists. You can restore it later.", { project: project.name })}
          onConfirm={() => run(() => setProjectStatus(project.id, "ARCHIVED"), t("Project archived"))} />
      )}
      {confirming === "delete" && (
        <ConfirmDialog title={t("Delete project")} danger confirm={t("Delete")} busy={busy} onClose={() => setConfirming(null)}
          body={t("{project} is removed from the projects list.", { project: project.name })}
          onConfirm={() => run(() => deleteProject(project.id), t("Project deleted"), () => router.push("/projects"))} />
      )}
    </section>
  );
}

/** A project's settings: details, members, workflow steps, labels, archive. Owners edit; everyone else reads (and may leave). */
export function ProjectSettingsClient({ project, members }: { project: ProjectDetail; members: ProjectMember[] }) {
  const { user, t } = usePage();
  const readOnly = useReadOnly();
  const canEdit = !readOnly && project.canManage;
  const isArchived = project.status === "ARCHIVED";
  const hasTasks = project.statuses.some((status) => status.taskCount > 0);
  const canEditContent = canEdit && !isArchived;
  return (
    <div className="col">
      <PageHeader back={`/projects/${encodeURIComponent(project.id)}`} eyebrow={`${project.key} · ${t("Project settings")}`} title={project.name} />
      {isArchived && <div className="card task-banner" role="status">{t("This project is archived. Restore it below to make changes.")}</div>}
      <DetailsCard project={project} canEdit={canEditContent} hasTasks={hasTasks} />
      <MembersCard project={project} members={members} canEdit={canEditContent} userId={user.id} />
      <section className="card pad enter" style={{ ["--i" as string]: 3 }} aria-labelledby="project-workflow-h">
        <div className="card-h"><h3 id="project-workflow-h">{t("Workflow")}</h3><span className="muted">{t("The steps a task goes through, in board order.")}</span></div>
        <WorkflowEditor statuses={project.statuses} canEdit={canEditContent}
          onCreate={(input) => createProjectStatus(project.id, input)} onUpdate={(statusId, input) => updateProjectStatus(project.id, statusId, input)}
          onReorder={(statusIds) => reorderProjectStatuses(project.id, statusIds)} onDelete={(statusId, moveTo) => deleteProjectStatus(project.id, statusId, moveTo)} />
      </section>
      <section className="card pad enter" style={{ ["--i" as string]: 4 }} aria-labelledby="project-labels-h">
        <div className="card-h"><h3 id="project-labels-h">{t("Labels")}</h3><span className="muted">{t("Company labels from Task settings can be used too.")}</span></div>
        <LabelEditor labels={project.labels} projectId={project.id} canEdit={canEditContent} />
      </section>
      {canEdit && <DangerCard project={project} hasTasks={hasTasks} />}
    </div>
  );
}
