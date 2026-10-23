import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { TaskComment, TaskPage } from "@/lib/api-types";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useData } from "@/lib/page";
import { mentionsToNames, namesToMentions } from "@/lib/tasks";
import { addComment, deleteComment, editComment } from "@/pages/tasks/actions";
import { MentionTextarea } from "./MentionTextarea";
import { RichText } from "./RichText";

/** The task's comments, oldest first (50 a page), with `@mentions`; the box to write one when the user may comment. */
export function CommentList({ taskId, projectId, canComment, timeZone }: { taskId: string; projectId: string | null; canComment: boolean; timeZone: string }) {
  const t = useT();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const data = useData<TaskPage<TaskComment>>(`/api/tasks/${encodeURIComponent(taskId)}/comments?page=${page}`);
  const [draft, setDraft] = useState("");
  const [mentioned, setMentioned] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<{ id: string; text: string; mentioned: { id: string; name: string }[] } | null>(null);
  const [removing, setRemoving] = useState<TaskComment | null>(null);
  const [busy, start] = useTransition();
  if (!data) return null;
  const lastPage = Math.max(1, Math.ceil(data.total / Math.max(1, data.take)));

  const send = () => start(async () => {
    if (!draft.trim()) return;
    const result = await addComment(taskId, namesToMentions(draft.trim(), mentioned));
    if (result.ok) { setDraft(""); setMentioned([]); toast(t("Comment added")); setPage(Math.max(1, Math.ceil((data.total + 1) / Math.max(1, data.take)))); }
    else toast(result.error, "bad");
  });
  const saveEdit = () => start(async () => {
    if (!editing || !editing.text.trim()) return;
    const result = await editComment(taskId, editing.id, namesToMentions(editing.text.trim(), editing.mentioned));
    if (result.ok) setEditing(null); else toast(result.error, "bad");
  });

  return (
    <div className="task-comments">
      {!data.rows.length && <p className="muted">{t("No comments yet.")}</p>}
      {data.total > data.take && (
        <div className="task-older">
          <button type="button" className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Show older")}</button>
          <span className="muted">{t("Page {a} of {b}", { a: page, b: lastPage })}</span>
          <button type="button" className="btn btn-sm btn-ghost" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>{t("Show newer")}</button>
        </div>
      )}
      <ul className="task-comment-list">
        {data.rows.map((comment) => (
          <li key={comment.id} className="task-comment">
            <Avatar id={comment.authorId} name={comment.authorName} photo={comment.authorPhoto} style={{ width: 30, height: 30, fontSize: 11 }} />
            <div className="task-comment-body">
              <div className="task-comment-h">
                <b>{comment.authorName}</b>
                <small className="muted">{formatDateTime(new Date(comment.createdAt), timeZone)}{comment.editedAt && !comment.isDeleted ? ` · ${t("edited")}` : ""}</small>
                {!comment.isDeleted && canComment && (
                  <span className="task-comment-actions">
                    {comment.canEdit && <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Edit comment")} onClick={() => { const shown = mentionsToNames(comment.body ?? "", comment.mentionedPeople); setEditing({ id: comment.id, text: shown.text, mentioned: shown.mentioned }); }}><Icon name="edit" size={13} /></button>}
                    {comment.canDelete && <button type="button" className="btn btn-sm btn-ghost" aria-label={t("Delete comment")} onClick={() => setRemoving(comment)}><Icon name="trash" size={13} /></button>}
                  </span>
                )}
              </div>
              {comment.isDeleted ? <p className="muted task-deleted">{t("Comment deleted")}</p>
                : editing?.id === comment.id ? (
                  <div className="col" style={{ gap: 8 }}>
                    <MentionTextarea label={t("Edit comment")} isLabelHidden value={editing.text} onChange={(text) => setEditing({ ...editing, text })} mentioned={editing.mentioned}
                      onMentionedChange={(next) => setEditing({ ...editing, mentioned: next })} projectId={projectId} maxLength={5000} onSubmit={saveEdit} autoFocus />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="btn btn-sm btn-gold" disabled={busy || !editing.text.trim()} onClick={saveEdit}>{t("Save")}</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>{t("Cancel")}</button>
                    </div>
                  </div>
                ) : <RichText text={comment.body ?? ""} people={comment.mentionedPeople} />}
            </div>
          </li>
        ))}
      </ul>
      {canComment && (
        <div className="task-composer">
          <MentionTextarea label={t("Write a comment")} isLabelHidden value={draft} onChange={setDraft} mentioned={mentioned} onMentionedChange={setMentioned}
            projectId={projectId} placeholder={t("Write a comment… type @ to mention someone")} maxLength={5000} onSubmit={send} />
          <button type="button" className="btn btn-gold btn-sm" disabled={busy || !draft.trim()} onClick={send}><Icon name="comment" size={14} />{t("Comment")}</button>
        </div>
      )}
      {removing && (
        <ConfirmDialog title={t("Delete comment")} danger confirm={t("Delete")} busy={busy} onClose={() => setRemoving(null)}
          body={t("The comment is hidden from the task; a “Comment deleted” line stays.")}
          onConfirm={() => start(async () => {
            const result = await deleteComment(taskId, removing.id);
            toast(result.ok ? t("Comment deleted") : result.error, result.ok ? undefined : "bad");
            setRemoving(null);
          })} />
      )}
    </div>
  );
}
