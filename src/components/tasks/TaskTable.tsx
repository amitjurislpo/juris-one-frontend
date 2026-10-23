import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { SortableHeader } from "@/components/table/Table";
import type { TaskRow } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { DueLabel } from "./DueLabel";
import { LabelChips } from "./LabelChips";
import { PriorityLabel } from "./PriorityLabel";
import { StatusChip } from "./StatusChip";

/** A person cell: avatar and name (the accountable column is hidden on a phone). */
function PersonCell({ id, name, photo }: { id: string | null; name: string | null; photo: number | null }) {
  const t = useT();
  if (!id || !name) return <span className="muted">{t("Nobody")}</span>;
  return <span className="person"><Avatar id={id} name={name} photo={photo} style={{ width: 26, height: 26, fontSize: 10.5 }} /><span>{name}</span></span>;
}

/**
 * Sortable task table (sort and sortDirection live in the URL). A row opens the task panel (click or Enter); the key is
 * a link to the full task page. On a phone only Key, Title, Status and Due stay.
 */
export function TaskTable({ rows, onOpen, showProject, showLabels }: { rows: TaskRow[]; onOpen: (task: TaskRow) => void; showProject?: boolean; showLabels?: boolean }) {
  const t = useT();
  return (
    <div className="table-wrap task-table-wrap">
      <table className="t task-table">
        <thead>
          <tr>
            <SortableHeader sortKey="key" dflt="dueDate">{t("Key")}</SortableHeader>
            <SortableHeader sortKey="title" dflt="dueDate">{t("Title")}</SortableHeader>
            <SortableHeader sortKey="status" dflt="dueDate">{t("Status")}</SortableHeader>
            <SortableHeader sortKey="priority" dflt="dueDate" className="hide-sm">{t("Priority")}</SortableHeader>
            <SortableHeader sortKey="assignee" dflt="dueDate" className="hide-sm">{t("Assignee")}</SortableHeader>
            <th className="hide-sm">{t("Accountable")}</th>
            <SortableHeader sortKey="dueDate" dflt="dueDate">{t("Due")}</SortableHeader>
            {showProject && <th className="hide-sm">{t("Project")}</th>}
            {showLabels && <th className="hide-sm">{t("Labels")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => {
            const ref = task.key ?? task.id;
            return (
              <tr key={task.id} tabIndex={0} onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) onOpen(task); }} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(task); }}>
                <td className="task-key-cell"><Link href={`/tasks/${encodeURIComponent(ref)}`} className="task-key">{task.key ?? t("Personal")}</Link></td>
                <td className="task-title-cell">
                  <b>{task.title}</b>
                  {task.parentKey && <small className="muted"> · ↳ {task.parentKey}</small>}
                  {task.commentCount > 0 && <small className="task-count"><Icon name="comment" size={12} />{task.commentCount}</small>}
                </td>
                <td><StatusChip name={task.statusName} category={task.statusCategory} color={task.statusColor} /></td>
                <td className="hide-sm"><PriorityLabel priority={task.priority} /></td>
                <td className="hide-sm"><PersonCell id={task.assigneeId} name={task.assigneeName} photo={task.assigneePhoto} /></td>
                <td className="hide-sm"><PersonCell id={task.indirectAssigneeId} name={task.indirectAssigneeName} photo={task.indirectAssigneePhoto} /></td>
                <td><DueLabel task={task} /></td>
                {showProject && <td className="hide-sm">{task.projectKey ?? <span className="muted">{t("Personal")}</span>}</td>}
                {showLabels && <td className="hide-sm"><LabelChips labels={task.labels} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
