
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ClearFilters, SortableHeader } from "@/components/table/Table";
import { ConfirmDialog, Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { formatDayMonthYear, formatRupees } from "@/lib/format";
import { EmployeeForm } from "./EmployeeForm";
import { getProfile, confirmEmployee, markExited, revealContact, toggleAccess, type Profile } from "./actions";
import { Avatar } from "@/components/Avatar";

export interface PersonRow {
  id: string;
  photo?: number | null;
  code: string;
  name: string;
  title: string;
  department: string;
  manager: string;
  location: string;
  india: boolean;
  role: string;
  status: string;
  access: boolean;
  dateOfJoining: string;
  canToggle: boolean;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PROBATION: "Probation", ONBOARDING: "Onboarding", EXITED: "Past employee" };
const stChip = (s: string) => (s === "ACTIVE" ? "ok" : s === "EXITED" ? "neutral" : s === "ONBOARDING" ? "info" : "warn");

function AccessSwitch({ id, name, on, disabled, onDone }: { id: string; name: string; on: boolean; disabled: boolean; onDone?: (v: boolean) => void }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [busy, start] = useTransition();
  const [val, setVal] = useState(on);
  const [lastOn, setLastOn] = useState(on);
  if (lastOn !== on) { setLastOn(on); setVal(on); }
  if (readOnly) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
      <button className="switch" role="switch" aria-checked={val} disabled={disabled || busy} aria-label={val ? t("Disable portal access for {name}", { name }) : t("Enable portal access for {name}", { name })}
        onClick={() => start(async () => {
          const next = !val;
          setVal(next);
          const r = await toggleAccess(id, next);
          if (r.ok) { toast(r.msg!, next ? "ok" : "bad"); onDone?.(next); }
          else { setVal(!next); toast(r.error, "bad"); }
        })}><i></i></button>
      <span className="sw-l">{val ? t("Enabled") : t("Disabled")}</span>
    </span>
  );
}

export function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <SortableHeader k="name" dflt="name">{t("Employee")}</SortableHeader>
              <SortableHeader k="department" dflt="name">{t("Department")}</SortableHeader>
              <SortableHeader k="manager" dflt="name">{t("Reports to")}</SortableHeader>
              <SortableHeader k="location" dflt="name">{t("Location")}</SortableHeader>
              <SortableHeader k="role" dflt="name">{t("Role")}</SortableHeader>
              <SortableHeader k="status" dflt="name">{t("Status")}</SortableHeader>
              <SortableHeader k="access" dflt="name">{t("Portal access")}</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={e.id} onClick={() => setOpen(e.id)} style={{ cursor: "pointer", animationDelay: `${i * 30}ms` }} className={e.status === "EXITED" ? "dim" : undefined}>
                <td>
                  <div className="person">
                    <Avatar id={e.id} name={e.name} photo={e.photo} />
                    <div>
                      <b><button className="linkish" style={{ color: "inherit", fontWeight: 600 }} onClick={(ev) => { ev.stopPropagation(); setOpen(e.id); }}>{e.name}</button></b>
                      <small>{e.code} · {e.title}</small>
                    </div>
                  </div>
                </td>
                <td>{e.department}</td>
                <td className="muted">{e.manager}</td>
                <td><span className={`chip nodot ${e.india ? "gold" : "info"}`}>{e.location}</span></td>
                <td className="muted">{e.role}</td>
                <td><span className={`chip ${stChip(e.status)}`}>{t(STATUS_LABEL[e.status])}</span></td>
                <td onClick={(ev) => ev.stopPropagation()}><AccessSwitch id={e.id} name={e.name} on={e.access} disabled={!e.canToggle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Try a different search or filter.")}</span><ClearFilters /></div>}
      {open && <ProfileDrawer id={open} onClose={() => setOpen(null)} onEdit={(id) => { setOpen(null); setEditId(id); }} />}
      {editId && <EmployeeForm editId={editId} photo={rows.find((r) => r.id === editId)?.photo} onClose={() => setEditId(null)} />}
    </>
  );
}

export function AddEmployeeButton() {
  const readOnly = useReadOnly();
  const t = useT();
  const [adding, setAdding] = useState(false);
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setAdding(true)}><Icon n="plus" s={16} />{t("Add employee")}</button>
      {adding && <EmployeeForm onClose={() => setAdding(false)} />}
    </>
  );
}

function ProfileDrawer({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: (id: string) => void }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState("");
  const [contact, setContact] = useState<{ phone: string; address: string } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitDate, setExitDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [busy, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getProfile(id).then((r) => {
      if (!alive) return;
      if (r.ok) setP(r.data!);
      else setErr(r.error);
    });
    return () => { alive = false; };
  }, [id]);

  const kv = (k: string, v: React.ReactNode, mono = false) => <div className="kv"><span className="muted">{k}</span><b className={mono ? "num" : undefined}>{v}</b></div>;

  return (
    <Drawer label={t("Employee profile")} onClose={onClose} width={520}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Avatar id={p?.id} name={p?.name ?? ""} photo={p?.photo} lg />
        <button className="icon-btn" onClick={onClose} aria-label={t("Close")}><Icon n="x" s={16} /></button>
      </div>
      {err && <div className="err">{err}</div>}
      {!p && !err && <div className="faint">{t("Loading…")}</div>}
      {p && (
        <>
          <div>
            <span className="eyebrow">{p.code} · {t(STATUS_LABEL[p.status])} · {p.role}</span>
            <h2 className="display" style={{ margin: "6px 0 2px", fontSize: 32 }}>{p.name}</h2>
            <span className="muted">{p.designation} · {p.department}</span>
          </div>
          <div className="access-row">
            <div><b>{t("Portal access")}</b><div className="faint" style={{ fontSize: 12.5 }}>{p.status === "EXITED" ? t("Removed on exit") : p.access ? t("Can sign in to JurisOne") : t("Sign-in is blocked")}</div></div>
            <AccessSwitch id={p.id} name={p.name} on={p.access} disabled={!p.canToggle} onDone={(v) => setP({ ...p, access: v })} />
          </div>
          {p.canConfirm && !readOnly && (
            <div className="access-row confirm-row">
              <div><b>{t("Probation")}</b><div className="faint" style={{ fontSize: 12.5 }}>{t("Make this person a permanent employee now, without waiting for the probation period to end.")}</div></div>
              <button className="btn btn-gold" disabled={busy} onClick={() => start(async () => {
                const r = await confirmEmployee(p.id);
                if (r.ok) { toast(r.msg!, "ok"); setP({ ...p, status: "ACTIVE", canConfirm: false }); } else toast(r.error, "bad");
              })}>{t("Make permanent")}</button>
            </div>
          )}
          <div>
            <div className="eyebrow" style={{ margin: "4px 0 4px" }}>{t("Personal")}</div>
            {kv(t("Father’s name"), p.fatherName)}
            {kv(t("Official email"), p.email)}
            {kv(t("Phone"), contact?.phone ?? p.phone, true)}
            {kv(t("Address"), contact?.address ?? p.address)}
            {p.canEdit && !contact && (
              <button className="linkish" style={{ fontSize: 12.5, marginTop: 6 }} disabled={busy}
                onClick={() => start(async () => { const r = await revealContact(p.id); if (r.ok) setContact(r.data!); else toast(r.error, "bad"); })}>
                {t("Show full phone & address (logged)")}
              </button>
            )}
            {p.india && (
              <>
                <div className="eyebrow" style={{ margin: "14px 0 4px" }}>{t("Statutory")}</div>
                {kv("PAN", p.pan, true)}
                {kv("Aadhaar", p.aadhaar, true)}
                {kv(t("UAN (PF)"), p.uan, true)}
              </>
            )}
            <div className="eyebrow" style={{ margin: "14px 0 4px" }}>{t("Job")}</div>
            {kv(t("Reporting manager"), p.manager)}
            {kv(t("Direct reports"), p.reports.length ? p.reports.join(", ") : "—")}
            {kv(t("Date of joining"), formatDayMonthYear(p.dateOfJoining))}
            {p.exitDate && kv(t("Last working day"), formatDayMonthYear(p.exitDate))}
            {kv(t("Location · shift"), `${p.location} · ${p.shift}`)}
            {p.gross !== null && kv(t("Monthly gross"), p.gross ? formatRupees(p.gross) : t("Not set"), true)}
          </div>
          {p.gross === null && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 12, border: "1px dashed var(--line2)", background: "var(--sunken)" }}>
              <Icon n="lock" s={20} />
              <div><b style={{ fontWeight: 600 }}>{t("Compensation")}</b><div className="muted" style={{ fontSize: 13 }}>{t("Salary and tax details are visible to Finance only.")}</div></div>
            </div>
          )}
          {p.canEdit && !readOnly && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-gold" onClick={() => onEdit(p.id)}><Icon n="edit" s={15} />{t("Edit details")}</button>
              <button className="btn btn-danger" onClick={() => setExitOpen(true)}>{t("Mark as past employee")}</button>
            </div>
          )}
        </>
      )}
      {exitOpen && p && (
        <ConfirmDialog title={t("Mark as past employee")} danger confirm={t("Mark as exited")} busy={busy} onClose={() => setExitOpen(false)}
          body={<><b>{p.name}</b> {t("will lose portal access immediately and will be signed out everywhere.")}</>}
          onConfirm={() => start(async () => {
            const r = await markExited(p.id, exitDate);
            if (r.ok) { toast(r.msg!, "bad"); setExitOpen(false); onClose(); }
            else toast(r.error, "bad");
          })}>
          <label className="field" style={{ marginTop: 14 }}>{t("Last working day *")}<input type="date" value={exitDate} min={p.dateOfJoining} onChange={(e) => setExitDate(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </Drawer>
  );
}
