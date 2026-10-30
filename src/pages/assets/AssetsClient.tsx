
import { useRouter } from "@/lib/router";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { AssetAssignment, AssetRow } from "@/lib/api-types";
import { ASSET_STATUS, ASSET_TYPES, CONDITIONS } from "@/lib/assets";
import { formatDayMonthYear } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { assignAsset, createAsset, deleteAsset, returnAsset, updateAsset, type AssetInput } from "./actions";

const EMPTY: AssetInput = { tag: "", type: "LAPTOP", make: "", model: "", serial: "", purchaseDate: "", status: "AVAILABLE", notes: "" };
type Person = { id: string; code: string; name: string };

/** Create / edit form for one asset. */
function AssetForm({ asset, onClose }: { asset?: AssetRow; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<AssetInput>(asset ? {
    tag: asset.tag, type: asset.type, make: asset.make ?? "", model: asset.model ?? "", serial: asset.serial ?? "", purchaseDate: asset.purchaseDate ?? "",
    status: asset.status === "ASSIGNED" ? undefined : asset.status, notes: asset.notes ?? "",
  } : EMPTY);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (fieldName: keyof AssetInput, fieldValue: string) => { setForm({ ...form, [fieldName]: fieldValue }); setErr(""); };
  const save = () => start(async () => {
    const result = asset ? await updateAsset(asset.id, form) : await createAsset(form);
    if (result.ok) { toast(result.message ?? t("Asset saved")); onClose(); router.refresh(); } else setErr(result.error);
  });
  return (
    <Modal title={asset ? t("Edit {tag}", { tag: asset.tag }) : t("Add asset")} eyebrow={t("Asset register")} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid2">
          <label className="field">{t("Asset tag *")}<input value={form.tag} maxLength={40} autoFocus onChange={(e) => set("tag", e.target.value)} placeholder={t("e.g. JC-LT-014")} /></label>
          <label className="field">{t("Type")}<select value={form.type} onChange={(e) => set("type", e.target.value)}>{Object.entries(ASSET_TYPES).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{t(label)}</option>)}</select></label>
          <label className="field">{t("Make")}<input value={form.make} maxLength={80} onChange={(e) => set("make", e.target.value)} placeholder={t("e.g. Dell")} /></label>
          <label className="field">{t("Model")}<input value={form.model} maxLength={80} onChange={(e) => set("model", e.target.value)} placeholder={t("e.g. Latitude 5440")} /></label>
          <label className="field">{t("Serial number")}<input value={form.serial} maxLength={80} onChange={(e) => set("serial", e.target.value)} /></label>
          <label className="field">{t("Purchase date")}<input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
        </div>
        {asset?.status !== "ASSIGNED" && (
          <label className="field">{t("Status")}
            <select value={form.status ?? "AVAILABLE"} onChange={(e) => set("status", e.target.value)}>
              <option value="AVAILABLE">{t("Available")}</option><option value="IN_REPAIR">{t("In repair")}</option><option value="RETIRED">{t("Retired")}</option>
            </select>
          </label>
        )}
        <label className="field">{t("Notes")}<textarea value={form.notes} rows={3} maxLength={500} onChange={(e) => set("notes", e.target.value)} /></label>
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

export function AddAssetButton() {
  const t = useT();
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon name="plus" size={16} />{t("Add asset")}</button>
      {open && <AssetForm onClose={() => setOpen(false)} />}
    </>
  );
}

function AssignDialog({ asset, people, today, onClose }: { asset: AssetRow; people: Person[]; today: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ employeeId: "", assignedOn: today, notes: "" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const result = await assignAsset(asset.id, form);
    if (result.ok) { toast(result.message ?? t("Assigned")); onClose(); router.refresh(); } else setErr(result.error);
  });
  return (
    <Modal title={t("Assign {tag}", { tag: asset.tag })} eyebrow={t("The employee is notified")} size="sm" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy || !form.employeeId} onClick={save}>{busy ? t("Assigning…") : t("Assign")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Employee *")}
          <select value={form.employeeId} onChange={(e) => { setForm({ ...form, employeeId: e.target.value }); setErr(""); }}>
            <option value="">{t("Choose…")}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>
        </label>
        <label className="field">{t("Assigned on")}<input type="date" value={form.assignedOn} onChange={(e) => setForm({ ...form, assignedOn: e.target.value })} /></label>
        <label className="field">{t("Notes")} <span className="hint">{t("accessories handed over, condition…")}</span><textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

function ReturnDialog({ asset, today, onClose }: { asset: AssetRow; today: string; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ condition: "GOOD", returnedOn: today, notes: "" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const result = await returnAsset(asset.id, form);
    if (result.ok) { toast(result.message ?? t("Returned")); onClose(); router.refresh(); } else setErr(result.error);
  });
  return (
    <Modal title={t("Take back {tag}", { tag: asset.tag })} eyebrow={t("From {name}", { name: asset.holderName ?? t("the employee") })} size="sm" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Mark returned")}</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <label className="field">{t("Condition")}<select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{Object.entries(CONDITIONS).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{t(label)}</option>)}</select></label>
        <label className="field">{t("Returned on")}<input type="date" value={form.returnedOn} onChange={(e) => { setForm({ ...form, returnedOn: e.target.value }); setErr(""); }} /></label>
        <label className="field">{t("Condition notes")}<textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        {err && <div className="err" role="alert">{err}</div>}
      </div>
    </Modal>
  );
}

function HistoryDialog({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const t = useT();
  const [rows, setRows] = useState<AssetAssignment[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/v1/assets/${asset.id}`).then((response) => response.json()).then((j) => { if (live) setRows(j.data?.history ?? []); }).catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [asset.id]);
  return (
    <Modal title={t("{tag} history", { tag: asset.tag })} eyebrow={t("Who held it")} onClose={onClose} footer={<button className="btn" onClick={onClose}>{t("Close")}</button>}>
      {rows === null ? <p className="muted">{t("Loading…")}</p> : !rows.length ? <p className="muted">{t("This asset has never been assigned.")}</p> : (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Employee")}</th><th>{t("From")}</th><th>{t("Returned")}</th><th>{t("Condition")}</th></tr></thead>
            <tbody>
              {rows.map((assignment) => (
                <tr key={assignment.id}>
                  <td><b>{assignment.employeeName}</b><br /><small className="muted">{assignment.employeeCode}</small></td>
                  <td>{formatDayMonthYear(assignment.assignedOn)}{assignment.assignNotes && <><br /><small className="muted">{assignment.assignNotes}</small></>}</td>
                  <td>{assignment.returnedOn ? formatDayMonthYear(assignment.returnedOn) : <span className="chip info">{t("Holding now")}</span>}</td>
                  <td>{assignment.returnCondition ? t(CONDITIONS[assignment.returnCondition]).split(" ")[0] : "—"}{assignment.returnNotes && <><br /><small className="muted">{assignment.returnNotes}</small></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

type Dialog = { kind: "edit" | "assign" | "return" | "history" | "delete"; asset: AssetRow } | null;

export function AssetsTable({ rows, people, today }: { rows: AssetRow[]; people: Person[]; today: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const readOnly = useReadOnly();
  const [dlg, setDlg] = useState<Dialog>(null);
  const [filter, setFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [busy, start] = useTransition();
  const close = () => setDlg(null);
  const shown = rows.filter((asset) => (filter === "ALL" || asset.status === filter)
    && (!searchText.trim() || [asset.tag, asset.make, asset.model, asset.serial, asset.holderName, asset.holderCode].some((text) => text?.toLowerCase().includes(searchText.trim().toLowerCase()))));
  return (
    <>
      <div className="toolbar enter" style={{ ["--i" as string]: 1 }}>
        <div className="seg" role="tablist" aria-label={t("Status")}>
          {["ALL", "AVAILABLE", "ASSIGNED", "IN_REPAIR", "RETIRED"].map((status) => (
            <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? "on" : ""} onClick={() => setFilter(status)}>{status === "ALL" ? t("All") : t(ASSET_STATUS[status].text)}</button>
          ))}
        </div>
        <input type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={t("Search tag, model, person…")} aria-label={t("Search assets")} style={{ maxWidth: 260 }} />
        <span className="tcount">{shown.length === 1 ? t("1 asset") : t("{n} assets", { n: shown.length })}</span>
      </div>
      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Asset")}</th><th>{t("Tag")}</th><th>{t("Status")}</th><th>{t("Held by")}</th><th className="hide-sm">{t("Serial")}</th><th className="hide-sm">{t("Purchased")}</th><th></th></tr></thead>
            <tbody>
              {shown.map((asset) => (
                <tr key={asset.id}>
                  <td><div className="person"><span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="layers" size={16} /></span>
                    <div><b>{[asset.make, asset.model].filter(Boolean).join(" ") || t(ASSET_TYPES[asset.type])}</b><small>{ASSET_TYPES[asset.type] ? t(ASSET_TYPES[asset.type]) : asset.type}</small></div></div></td>
                  <td className="num">{asset.tag}</td>
                  <td><span className={`chip ${ASSET_STATUS[asset.status].className}`}>{t(ASSET_STATUS[asset.status].text)}</span></td>
                  <td>{asset.holderName ? <><b>{asset.holderName}</b><br /><small className="muted">{t("since {date}", { date: formatDayMonthYear(asset.heldSince!) })}</small></> : <span className="muted">—</span>}</td>
                  <td className="muted hide-sm">{asset.serial ?? "—"}</td>
                  <td className="muted hide-sm">{asset.purchaseDate ? formatDayMonthYear(asset.purchaseDate) : "—"}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    {!readOnly && asset.status === "AVAILABLE" && <button className="btn btn-sm btn-gold" onClick={() => setDlg({ kind: "assign", asset: asset })}>{t("Assign")}</button>}
                    {!readOnly && asset.status === "ASSIGNED" && <button className="btn btn-sm" onClick={() => setDlg({ kind: "return", asset: asset })}>{t("Take back")}</button>}
                    {" "}<button className="btn btn-sm btn-ghost" onClick={() => setDlg({ kind: "history", asset: asset })}>{t("History")}</button>
                    {!readOnly && <button className="btn btn-sm btn-ghost" aria-label={t("Edit {tag}", { tag: asset.tag })} onClick={() => setDlg({ kind: "edit", asset: asset })}><Icon name="edit" size={14} /></button>}
                    {!readOnly && <button className="btn btn-sm btn-ghost" aria-label={t("Delete {tag}", { tag: asset.tag })} onClick={() => setDlg({ kind: "delete", asset: asset })}><Icon name="trash" size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <div className="empty"><b className="display">{rows.length ? t("No matching assets") : t("No assets yet")}</b><span className="muted">{rows.length ? t("Try another filter.") : t("Add your laptops, phones and other equipment to start tracking them.")}</span></div>}
      </section>
      {dlg?.kind === "edit" && <AssetForm asset={dlg.asset} onClose={close} />}
      {dlg?.kind === "assign" && <AssignDialog asset={dlg.asset} people={people} today={today} onClose={close} />}
      {dlg?.kind === "return" && <ReturnDialog asset={dlg.asset} today={today} onClose={close} />}
      {dlg?.kind === "history" && <HistoryDialog asset={dlg.asset} onClose={close} />}
      {dlg?.kind === "delete" && (
        <ConfirmDialog title={t("Delete asset")} danger confirm={t("Delete")} busy={busy} onClose={close}
          body={<>{t("Delete")} <b>{dlg.asset.tag}</b>? {t("Only assets that were never assigned can be deleted — mark the others as retired instead.")}</>}
          onConfirm={() => start(async () => {
            const result = await deleteAsset(dlg.asset.id);
            toast(result.ok ? result.message ?? t("Deleted") : result.error, result.ok ? undefined : "bad");
            close();
            if (result.ok) router.refresh();
          })} />
      )}
    </>
  );
}
