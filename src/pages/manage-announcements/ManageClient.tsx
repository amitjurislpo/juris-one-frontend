
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { Announcement } from "@/lib/api-types";
import { AUDIENCES } from "@/lib/assets";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { createAnnouncement, setAnnouncementStatus, updateAnnouncement, type AnnouncementInput } from "./actions";

const EMPTY: AnnouncementInput = { title: "", body: "", audience: "ALL", pinned: false, expiresOn: "" };

function Editor({ announcement, onClose }: { announcement?: Announcement; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<AnnouncementInput>(announcement ? { title: announcement.title, body: announcement.body, audience: announcement.audience, pinned: announcement.pinned, expiresOn: announcement.expiresOn ?? "" } : EMPTY);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const result = announcement ? await updateAnnouncement(announcement.id, form) : await createAnnouncement(form);
    if (result.ok) { toast(result.message ?? t("Saved")); onClose(); router.refresh(); } else setErr(result.error);
  });
  return (
    <Modal title={announcement ? t("Edit announcement") : t("New announcement")} eyebrow={announcement ? t("People are not notified again") : t("Published straight away")} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : announcement ? t("Save") : t("Publish")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Title *")}<input value={form.title} maxLength={160} autoFocus onChange={(e) => { setForm({ ...form, title: e.target.value }); setErr(""); }} /></label>
        <label className="field">{t("Message *")} <span className="hint">{t("plain text; a blank line starts a new paragraph")}</span>
          <textarea rows={8} value={form.body} onChange={(e) => { setForm({ ...form, body: e.target.value }); setErr(""); }} style={{ fontFamily: "inherit", lineHeight: 1.55 }} />
        </label>
        <div className="grid2">
          <label className="field">{t("For")}<select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>{Object.entries(AUDIENCES).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{t(label)}</option>)}</select></label>
          <label className="field">{t("Show until")} <span className="hint">{t("optional")}</span><input type="date" value={form.expiresOn} onChange={(e) => { setForm({ ...form, expiresOn: e.target.value }); setErr(""); }} /></label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
          {t("Pin to the top")}
        </label>
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

export function NewAnnouncementButton() {
  const readOnly = useReadOnly();
  const t = useT();
  const [open, setOpen] = useState(false);
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon name="plus" size={16} />{t("New announcement")}</button>
      {open && <Editor onClose={() => setOpen(false)} />}
    </>
  );
}

// English labels; translated at render.
function state(announcement: Announcement): { className: string; text: string } {
  if (announcement.status === "UNPUBLISHED") return { className: "neutral", text: "Unpublished" };
  return announcement.active ? { className: "ok", text: "Showing" } : { className: "warn", text: "Expired" };
}

export function ManageTable({ rows }: { rows: Announcement[] }) {
  const t = useT();
  const readOnly = useReadOnly();
  const toast = useToast();
  const router = useRouter();
  const [edit, setEdit] = useState<Announcement | null>(null);
  const [ask, setAsk] = useState<Announcement | null>(null);
  const [busy, start] = useTransition();
  const toggle = (announcement: Announcement, status: "PUBLISHED" | "UNPUBLISHED") => start(async () => {
    const result = await setAnnouncementStatus(announcement.id, status);
    toast(result.ok ? result.message ?? t("Done") : result.error, result.ok ? undefined : "bad");
    setAsk(null);
    if (result.ok) router.refresh();
  });
  return (
    <>
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Announcement")}</th><th>{t("Status")}</th><th>{t("For")}</th><th className="hide-sm">{t("Posted")}</th><th className="hide-sm">{t("Until")}</th><th></th></tr></thead>
            <tbody>
              {rows.map((announcement) => (
                <tr key={announcement.id}>
                  <td><b>{announcement.title}</b>{announcement.pinned && <span className="chip gold nodot" style={{ marginLeft: 8 }}>{t("Pinned")}</span>}<br /><small className="muted">{announcement.body.length > 80 ? `${announcement.body.slice(0, 80)}…` : announcement.body}</small></td>
                  <td><span className={`chip ${state(announcement).className}`}>{t(state(announcement).text)}</span></td>
                  <td>{t(AUDIENCES[announcement.audience])}</td>
                  <td className="muted hide-sm">{formatDayMonthYear(announcement.createdAt.slice(0, 10))}</td>
                  <td className="muted hide-sm">{announcement.expiresOn ? formatDayMonthYear(announcement.expiresOn) : "—"}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    {!readOnly && <><button className="btn btn-sm btn-ghost" aria-label={t("Edit {title}", { title: announcement.title })} onClick={() => setEdit(announcement)}><Icon name="edit" size={14} /></button>
                    {announcement.status === "PUBLISHED"
                      ? <button className="btn btn-sm" onClick={() => setAsk(announcement)}>{t("Unpublish")}</button>
                      : <button className="btn btn-sm" disabled={busy} onClick={() => toggle(announcement, "PUBLISHED")}>{t("Publish again")}</button>}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="empty"><b className="display">{t("Nothing posted yet")}</b><span className="muted">{t("Post your first announcement — a holiday notice, a new joiner, an office update.")}</span></div>}
      </section>
      {edit && <Editor announcement={edit} onClose={() => setEdit(null)} />}
      {ask && (
        <ConfirmDialog title={t("Unpublish announcement")} confirm={t("Unpublish")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Hide")} <b>{ask.title}</b> {t("from everyone? You can publish it again later.")}</>} onConfirm={() => toggle(ask, "UNPUBLISHED")} />
      )}
    </>
  );
}
