
import { useRouter } from "@/lib/router";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { PolicyDetail } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { createPolicy, deletePolicy, remindPolicy, removePolicyFile, setPolicyStatus, updatePolicy } from "./actions";

export function NewPolicyButton() {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setErr(""); setTitle(""); };
  const save = () => start(async () => {
    const createResult = await createPolicy({ title, body: "", requiresAcknowledgement: true });
    if (createResult.ok) { toast(createResult.message!); close(); router.push(`/policies/${createResult.data!.id}`); } else setErr(createResult.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon name="plus" size={16} />{t("New policy")}</button>
      {open && (
        <Modal title={t("New policy")} eyebrow={t("Starts as a draft")} size="sm" onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Creating…") : t("Create draft")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Title *")}<input value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} maxLength={160} placeholder={t("e.g. Code of conduct")} autoFocus
              onKeyDown={(e) => e.key === "Enter" && save()} /></label>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

/** The draft: title, text, "must be accepted" and the PDF. */
export function PolicyEditor({ policy: policyToEdit }: { policy: PolicyDetail }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const [policyForm, setF] = useState({ title: policyToEdit.title, body: policyToEdit.body, requiresAcknowledgement: policyToEdit.requiresAcknowledgement });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);
  const archived = policyToEdit.status === "ARCHIVED";
  const dirty = policyForm.title !== policyToEdit.title || policyForm.body !== policyToEdit.body || policyForm.requiresAcknowledgement !== policyToEdit.requiresAcknowledgement;
  const save = () => start(async () => {
    const updateResult = await updatePolicy(policyToEdit.id, policyForm);
    if (updateResult.ok) toast(updateResult.message!); else setErr(updateResult.error);
  });
  const upload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const res = await fetch(`/api/policies/${policyToEdit.id}/file`, { method: "PUT", body: formData });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) toast(j.detail ?? t("Upload failed"), "bad"); else toast(j.message ?? t("Attached"));
      router.refresh();
    } finally { setUploading(false); }
  };
  if (readOnly) return null;
  return (
    <section className="card enter" style={{ ["--i" as string]: 2, padding: 18 }}>
      <div className="card-h"><h3>{t("Draft")}</h3>{dirty && <span className="chip warn nodot">{t("Not saved")}</span>}</div>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Title")}<input value={policyForm.title} disabled={archived} onChange={(e) => { setF({ ...policyForm, title: e.target.value }); setErr(""); }} maxLength={160} /></label>
        <label className="field">{t("Policy text")} <span className="hint">{t("plain text; a blank line starts a new paragraph")}</span>
          <textarea value={policyForm.body} disabled={archived} onChange={(e) => { setF({ ...policyForm, body: e.target.value }); setErr(""); }} rows={14} style={{ fontFamily: "inherit", lineHeight: 1.55 }} />
        </label>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={policyForm.requiresAcknowledgement} disabled={archived} onChange={(e) => setF({ ...policyForm, requiresAcknowledgement: e.target.checked })} />
            {t("Everyone must accept it before using JurisOne")}
          </label>
          <span style={{ flex: 1 }} />
          {policyToEdit.fileName ? (
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <a className="linkish" href={`/api/policies/${policyToEdit.id}/file`} target="_blank" rel="noopener"><Icon name="doc" size={14} /> {policyToEdit.fileName}</a>
              {!archived && <button className="btn btn-sm btn-ghost" aria-label={t("Remove the PDF")} onClick={() => start(async () => { const removeResult = await removePolicyFile(policyToEdit.id); toast(removeResult.ok ? removeResult.message! : removeResult.error, removeResult.ok ? undefined : "bad"); })}><Icon name="x" size={13} /></button>}
            </span>
          ) : <span className="muted">{t("No PDF attached")}</span>}
          {!archived && (
            <>
              <button className="btn btn-sm" disabled={uploading} onClick={() => fileIn.current?.click()}><Icon name="upload" size={14} />{uploading ? t("Uploading…") : policyToEdit.fileName ? t("Replace PDF") : t("Attach PDF")}</button>
              <input ref={fileIn} type="file" accept="application/pdf" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
            </>
          )}
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        {!archived && <div><button className="btn btn-gold" disabled={busy || !dirty} onClick={save}>{busy ? t("Saving…") : t("Save draft")}</button></div>}
      </div>
    </section>
  );
}

/** Publish / archive / delete, reminders and the evidence export. */
export function PolicyActions({ policy }: { policy: PolicyDetail }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const [ask, setAsk] = useState<null | "publish" | "archive" | "delete">(null);
  const [busy, start] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) => start(async () => {
    const actionResult = await action();
    toast(actionResult.ok ? actionResult.message! : actionResult.error!, actionResult.ok ? undefined : "bad");
    setAsk(null);
    if (actionResult.ok) after?.();
  });
  const canPublish = policy.status !== "PUBLISHED" || policy.hasChanges;
  if (readOnly) return null;
  return (
    <>
      {policy.versions.length > 0 && <a className="btn" href={`/api/policies/${policy.id}/acknowledgements/export`} download><Icon name="download" size={14} />{t("Evidence (CSV)")}</a>}
      {policy.versions.length > 0 && <a className="btn" href={`/api/policies/${policy.id}/acknowledgements/export?format=pdf`} download><Icon name="doc" size={14} />{t("Evidence (PDF)")}</a>}
      {policy.status === "PUBLISHED" && policy.requiresAcknowledgement && <button className="btn" disabled={busy} onClick={() => run(() => remindPolicy(policy.id))}><Icon name="bell" size={14} />{t("Remind")}</button>}
      {policy.status === "PUBLISHED" && <button className="btn btn-ghost" onClick={() => setAsk("archive")}>{t("Archive")}</button>}
      {policy.version === 0 && <button className="btn btn-ghost" onClick={() => setAsk("delete")} aria-label={t("Delete draft")}><Icon name="trash" size={14} /></button>}
      {canPublish && <button className="btn btn-gold" onClick={() => setAsk("publish")}><Icon name="upload" size={14} />{policy.version === 0 ? t("Publish") : policy.hasChanges ? t("Publish version {n}", { n: policy.version + 1 }) : t("Publish again")}</button>}
      {ask === "publish" && (
        <ConfirmDialog title={policy.hasChanges ? t("Publish version {n}", { n: policy.version + 1 }) : t("Publish again")} confirm={t("Publish")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Publish the saved draft of {title}? It can't be changed afterwards (a change makes a new version).", { title: policy.title })}
            {" "}{policy.requiresAcknowledgement ? t("Everyone except owners will have to read and accept it before they can use JurisOne.") : t("It is for information only — nobody has to accept it.")}
            {" "}{t("Unsaved edits in the editor are not included.")}</>}
          onConfirm={() => run(() => setPolicyStatus(policy.id, "PUBLISHED"))} />
      )}
      {ask === "archive" && (
        <ConfirmDialog title={t("Archive policy")} confirm={t("Archive")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Archive {title}? Employees will no longer see it or be asked to accept it. Its versions and acceptances are kept.", { title: policy.title })}</>}
          onConfirm={() => run(() => setPolicyStatus(policy.id, "ARCHIVED"))} />
      )}
      {ask === "delete" && (
        <ConfirmDialog title={t("Delete draft")} danger confirm={t("Delete")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Delete the draft {title}? It has never been published.", { title: policy.title })}</>}
          onConfirm={() => run(() => deletePolicy(policy.id), () => router.push("/policies"))} />
      )}
    </>
  );
}
