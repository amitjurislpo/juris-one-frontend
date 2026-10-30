import { useState } from "react";
import type { TaskActivityEntry, TaskPage } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useData } from "@/lib/page";
import { describeActivity } from "@/lib/tasks";

/** The History tab: who changed what and when, newest first (50 a page), one sentence per change. */
export function TaskActivityList({ taskId, timeZone }: { taskId: string; timeZone: string }) {
  const t = useT();
  const [page, setPage] = useState(1);
  const data = useData<TaskPage<TaskActivityEntry>>(`/api/v1/tasks/${encodeURIComponent(taskId)}/activity?page=${page}`);
  if (!data) return null;
  const lastPage = Math.max(1, Math.ceil(data.total / Math.max(1, data.take)));
  return (
    <div>
      {!data.rows.length && <p className="muted">{t("No changes yet.")}</p>}
      <ul className="task-history">
        {data.rows.map((entry) => {
          const sentence = describeActivity(entry);
          // values such as "High" or "To do" are shown in the reader's language; names and titles stay as typed
          const vars = Object.fromEntries(Object.entries(sentence.vars).map(([name, value]) => [name, name === "name" ? value : t(value)]));
          return (
            <li key={entry.id}>
              <span>{t(sentence.text, vars)}</span>
              <small className="muted"> · {formatDateTime(new Date(entry.occurredAt), timeZone)}</small>
            </li>
          );
        })}
      </ul>
      {page < lastPage && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPage(page + 1)}>{t("Show older")}</button>}
      {page > 1 && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPage(page - 1)}>{t("Show newer")}</button>}
    </div>
  );
}
