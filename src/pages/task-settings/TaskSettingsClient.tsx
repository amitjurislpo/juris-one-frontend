import { PageHeader } from "@/components/PageHeader";
import { LabelEditor } from "@/components/tasks/LabelEditor";
import { WorkflowEditor } from "@/components/tasks/WorkflowEditor";
import type { TaskSettings } from "@/lib/api-types";
import { usePage } from "@/lib/page";
import { useReadOnly } from "@/lib/session";
import { createDefaultStatus, deleteDefaultStatus, reorderDefaultStatuses, updateDefaultStatus } from "./actions";

/** The business's task set-up (Owner): the default workflow and the company-wide labels. */
export function TaskSettingsClient({ settings }: { settings: TaskSettings }) {
  const { t } = usePage();
  const readOnly = useReadOnly();
  return (
    <div className="col">
      <PageHeader eyebrow={t("Tasks")} title={t("Task settings")}
        sub={t("{projects} projects · {tasks} tasks", { projects: settings.projectCount, tasks: settings.taskCount })} />
      <section className="card pad enter" style={{ ["--i" as string]: 1 }} aria-labelledby="default-workflow-h">
        <div className="card-h"><h3 id="default-workflow-h">{t("Default workflow")}</h3><span className="muted">{t("Used for personal tasks and copied into new projects.")}</span></div>
        <WorkflowEditor statuses={settings.defaultStatuses} canEdit={!readOnly}
          onCreate={createDefaultStatus} onUpdate={updateDefaultStatus} onReorder={reorderDefaultStatuses} onDelete={deleteDefaultStatus} />
      </section>
      <section className="card pad enter" style={{ ["--i" as string]: 2 }} aria-labelledby="company-labels-h">
        <div className="card-h"><h3 id="company-labels-h">{t("Company labels")}</h3><span className="muted">{t("Every project can use these.")}</span></div>
        <LabelEditor labels={settings.labels} canEdit={!readOnly} />
      </section>
    </div>
  );
}
