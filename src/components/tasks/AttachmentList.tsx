import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { TaskAttachment } from "@/lib/api-types";
import { formatDayMonth, isoDateIn } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { ATTACHMENT_ACCEPT, attachmentProblem, formatFileSize } from "@/lib/tasks";
import { deleteTaskAttachment, uploadTaskAttachment } from "@/pages/tasks/actions";

/** Files on a task: download, attach (≤ 10 MB; PDF, image, Word, Excel, PowerPoint, text, CSV), remove (kept in the history). */
export function AttachmentList({ taskId, attachments, canAttach, timeZone }: { taskId: string; attachments: TaskAttachment[]; canAttach: boolean; timeZone: string }) {
  const t = useT();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState<TaskAttachment | null>(null);
  const [busy, start] = useTransition();
  const upload = (file: File) => {
    const problem = attachmentProblem(file.name, file.size);
    if (problem === "size") { toast(t("That file is larger than 10 MB."), "bad"); return; }
    if (problem === "type") { toast(t("Upload a PDF, image, Word, Excel, PowerPoint, text or CSV file."), "bad"); return; }
    start(async () => {
      const result = await uploadTaskAttachment(taskId, file);
      toast(result.ok ? t("File attached") : result.error, result.ok ? undefined : "bad");
    });
  };
  if (!attachments.length && !canAttach) return null;
  return (
    <section className="task-section" aria-labelledby={`attachments-${taskId}`}>
      <div className="task-section-h">
        <h3 id={`attachments-${taskId}`}>{t("Attachments")} {attachments.length > 0 && <span className="muted">({attachments.length})</span>}</h3>
        {canAttach && (
          <>
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => input.current?.click()}><Icon name="paperclip" size={13} />{busy ? t("Uploading…") : t("Attach a file")}</button>
            <input ref={input} type="file" hidden accept={ATTACHMENT_ACCEPT} aria-label={t("Attach a file")}
              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) upload(file); }} />
          </>
        )}
      </div>
      <ul className="task-attachments">
        {attachments.map((attachment) => (
          <li key={attachment.id}>
            <Icon name="paperclip" size={14} />
            <a href={`/api/v1/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachment.id)}/file`} download={attachment.fileName}>{attachment.fileName}</a>
            <small className="muted">{formatFileSize(attachment.sizeBytes)} · {attachment.uploadedByName} · {formatDayMonth(isoDateIn(attachment.uploadedAt, timeZone))}</small>
            {canAttach && attachment.canDelete && <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Remove {item}", { item: attachment.fileName })} onClick={() => setRemoving(attachment)}><Icon name="x" size={13} /></button>}
          </li>
        ))}
      </ul>
      {removing && (
        <ConfirmDialog title={t("Remove attachment")} danger confirm={t("Remove")} busy={busy} onClose={() => setRemoving(null)}
          body={t("{file} is removed from the task. It is kept in the history.", { file: removing.fileName })}
          onConfirm={() => start(async () => {
            const result = await deleteTaskAttachment(taskId, removing.id);
            toast(result.ok ? t("Attachment removed") : result.error, result.ok ? undefined : "bad");
            setRemoving(null);
          })} />
      )}
    </section>
  );
}
