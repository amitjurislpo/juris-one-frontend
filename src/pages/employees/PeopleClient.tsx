
import { useEffect, useState, useTransition } from "react";
import { useDismissOnEdit } from "@/lib/useDismissOnEdit";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ClearFilters, SortableHeader } from "@/components/table/Table";
import { ConfirmDialog, Drawer } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import Link from "@/lib/link";
import { useCurrentUser, useReadOnly } from "@/lib/session";
import { formatDayMonthYear, formatRupees, INDIA_TIME_ZONE, todayIn } from "@/lib/format";
import { shiftLabel } from "@/lib/shifts";
import { EmployeeForm } from "./EmployeeForm";
import { OnboardingStatusChip } from "./OnboardingStatusChip";
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
  /** NOT_REQUIRED, NOT_STARTED, IN_PROGRESS, SUBMITTED, CHANGES_REQUESTED or APPROVED */
  onboardingStatus?: string | null;
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PROBATION: "Probation", ONBOARDING: "Onboarding", EXITED: "Past employee" };
const stChip = (status: string) => (status === "ACTIVE" ? "ok" : status === "EXITED" ? "neutral" : status === "ONBOARDING" ? "info" : "warn");

function AccessSwitch({ id, name, isEnabled, disabled, onDone }: { id: string; name: string; isEnabled: boolean; disabled: boolean; onDone?: (hasAccess: boolean) => void }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [busy, start] = useTransition();
  const [val, setVal] = useState(isEnabled);
  const [lastOn, setLastOn] = useState(isEnabled);
  if (lastOn !== isEnabled) { setLastOn(isEnabled); setVal(isEnabled); }
  if (readOnly) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
      <button className="switch" role="switch" aria-checked={val} disabled={disabled || busy} aria-label={val ? t("Disable portal access for {name}", { name }) : t("Enable portal access for {name}", { name })}
        onClick={() => start(async () => {
          const next = !val;
          setVal(next);
          const result = await toggleAccess(id, next);
          if (result.ok) { toast(result.message!, next ? "ok" : "bad"); onDone?.(next); }
          else { setVal(!next); toast(result.error, "bad"); }
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
              <SortableHeader sortKey="name" dflt="name">{t("Employee")}</SortableHeader>
              <SortableHeader sortKey="department" dflt="name">{t("Department")}</SortableHeader>
              <SortableHeader sortKey="manager" dflt="name">{t("Reports to")}</SortableHeader>
              <SortableHeader sortKey="location" dflt="name">{t("Location")}</SortableHeader>
              <SortableHeader sortKey="role" dflt="name">{t("Role")}</SortableHeader>
              <SortableHeader sortKey="status" dflt="name">{t("Status")}</SortableHeader>
              <SortableHeader sortKey="access" dflt="name">{t("Portal access")}</SortableHeader>
              <th>{t("Onboarding")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((person, i) => (
              <tr key={person.id} onClick={() => setOpen(person.id)} style={{ cursor: "pointer", animationDelay: `${i * 30}ms` }} className={person.status === "EXITED" ? "dim" : undefined}>
                <td>
                  <div className="person">
                    <Avatar id={person.id} name={person.name} photo={person.photo} />
                    <div>
                      <b><button className="linkish" style={{ color: "inherit", fontWeight: 600 }} onClick={(event) => { event.stopPropagation(); setOpen(person.id); }}>{person.name}</button></b>
                      <small>{person.code} · {person.title}</small>
                    </div>
                  </div>
                </td>
                <td>{person.department}</td>
                <td className="muted">{person.manager}</td>
                <td><span className={`chip nodot ${person.india ? "gold" : "info"}`}>{person.location}</span></td>
                <td className="muted">{person.role}</td>
                <td><span className={`chip ${stChip(person.status)}`}>{t(STATUS_LABEL[person.status])}</span></td>
                <td onClick={(event) => event.stopPropagation()}><AccessSwitch id={person.id} name={person.name} isEnabled={person.access} disabled={!person.canToggle} /></td>
                <td onClick={(event) => event.stopPropagation()}>{person.onboardingStatus && person.onboardingStatus !== "NOT_REQUIRED" ? <Link href={`/onboarding/hires/${person.id}`} title={t("Open onboarding")}><OnboardingStatusChip status={person.onboardingStatus} /></Link> : <OnboardingStatusChip status={person.onboardingStatus} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty"><b>{t("No one matches")}</b><span className="muted">{t("Try a different search or filter.")}</span><ClearFilters /></div>}
      {open && <ProfileDrawer id={open} onboardingStatus={rows.find((person) => person.id === open)?.onboardingStatus} onClose={() => setOpen(null)} onEdit={(id) => { setOpen(null); setEditId(id); }} />}
      {editId && <EmployeeForm editId={editId} photo={rows.find((person) => person.id === editId)?.photo} onClose={() => setEditId(null)} />}
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
      <button className="btn btn-gold btn-lg" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t("Add employee")}</button>
      {adding && <EmployeeForm onClose={() => setAdding(false)} />}
    </>
  );
}

function ProfileDrawer({ id, onboardingStatus, onClose, onEdit }: { id: string; onboardingStatus?: string | null; onClose: () => void; onEdit: (id: string) => void }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState("");
  const [contact, setContact] = useState<{ phone: string; address: string } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const timeZone = useCurrentUser().user?.timeZone ?? INDIA_TIME_ZONE;
  const [exitDate, setExitDate] = useState(() => todayIn(timeZone));
  const [busy, start] = useTransition();
  useDismissOnEdit(err, () => setErr(""), exitDate);

  useEffect(() => {
    let alive = true;
    getProfile(id).then((result) => {
      if (!alive) return;
      if (result.ok) setProfile(result.data!);
      else setErr(result.error);
    });
    return () => { alive = false; };
  }, [id]);

  const keyValueRow = (label: string, content: React.ReactNode, mono = false) => <div className="kv"><span className="muted">{label}</span><b className={mono ? "num" : undefined}>{content}</b></div>;

  return (
    <Drawer label={t("Employee profile")} onClose={onClose} width={520}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Avatar id={profile?.id} name={profile?.name ?? ""} photo={profile?.photo} isLarge />
        <button className="icon-btn" onClick={onClose} aria-label={t("Close")}><Icon name="x" size={16} /></button>
      </div>
      {err && <div className="err">{err}</div>}
      {!profile && !err && <div className="faint">{t("Loading…")}</div>}
      {profile && (
        <>
          <div>
            <span className="eyebrow">{profile.code} · {t(STATUS_LABEL[profile.status])} · {profile.role}</span>
            <h2 className="display" style={{ margin: "6px 0 2px", fontSize: 32 }}>{profile.name}</h2>
            <span className="muted">{profile.designation} · {profile.department}</span>
          </div>
          <div className="access-row">
            <div><b>{t("Portal access")}</b><div className="faint" style={{ fontSize: 12.5 }}>{profile.status === "EXITED" ? t("Removed on exit") : profile.access ? t("Can sign in to JurisOne") : t("Sign-in is blocked")}</div></div>
            <AccessSwitch id={profile.id} name={profile.name} isEnabled={profile.access} disabled={!profile.canToggle} onDone={(hasAccess) => setProfile({ ...profile, access: hasAccess })} />
          </div>
          {profile.canConfirm && !readOnly && (
            <div className="access-row confirm-row">
              <div><b>{t("Probation")}</b><div className="faint" style={{ fontSize: 12.5 }}>{t("Make this person a permanent employee now, without waiting for the probation period to end.")}</div></div>
              <button className="btn btn-gold" disabled={busy} onClick={() => start(async () => {
                const result = await confirmEmployee(profile.id);
                if (result.ok) { toast(result.message!, "ok"); setProfile({ ...profile, status: "ACTIVE", canConfirm: false }); } else toast(result.error, "bad");
              })}>{t("Make permanent")}</button>
            </div>
          )}
          {onboardingStatus && onboardingStatus !== "NOT_REQUIRED" && (
            <div className="access-row">
              <div><b>{t("Onboarding")}</b><div style={{ marginTop: 4 }}><OnboardingStatusChip status={onboardingStatus} /></div></div>
              <Link className="btn" href={`/onboarding/hires/${encodeURIComponent(profile.id)}`}>{t("View onboarding")}</Link>
            </div>
          )}
          <div>
            <div className="eyebrow" style={{ margin: "4px 0 4px" }}>{t("Personal")}</div>
            {keyValueRow(t("Father’s name"), profile.fatherName)}
            {keyValueRow(t("Official email"), profile.email)}
            {keyValueRow(t("Phone"), contact?.phone ?? profile.phone, true)}
            {keyValueRow(t("Address"), contact?.address ?? profile.address)}
            {profile.canEdit && !contact && (
              <button className="linkish" style={{ fontSize: 12.5, marginTop: 6 }} disabled={busy}
                onClick={() => start(async () => { const result = await revealContact(profile.id); if (result.ok) setContact(result.data!); else toast(result.error, "bad"); })}>
                {t("Show full phone & address (logged)")}
              </button>
            )}
            {profile.india && (
              <>
                <div className="eyebrow" style={{ margin: "14px 0 4px" }}>{t("Statutory")}</div>
                {keyValueRow("PAN", profile.pan, true)}
                {keyValueRow("Aadhaar", profile.aadhaar, true)}
                {keyValueRow(t("UAN (PF)"), profile.uan, true)}
              </>
            )}
            <div className="eyebrow" style={{ margin: "14px 0 4px" }}>{t("Job")}</div>
            {keyValueRow(t("Reporting manager"), profile.manager)}
            {keyValueRow(t("Direct reports"), profile.reports.length ? profile.reports.join(", ") : "—")}
            {keyValueRow(t("Date of joining"), formatDayMonthYear(profile.dateOfJoining))}
            {profile.exitDate && keyValueRow(t("Last working day"), formatDayMonthYear(profile.exitDate))}
            {keyValueRow(t("Location · shift"), `${profile.location} · ${shiftLabel(profile.shift, t)}`)}
            {profile.gross !== null && keyValueRow(t("Monthly gross"), profile.gross ? formatRupees(profile.gross) : t("Not set"), true)}
          </div>
          {profile.gross === null && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, borderRadius: 12, border: "1px dashed var(--line2)", background: "var(--sunken)" }}>
              <Icon name="lock" size={20} />
              <div><b style={{ fontWeight: 600 }}>{t("Compensation")}</b><div className="muted" style={{ fontSize: 13 }}>{t("Salary and tax details are visible to Finance only.")}</div></div>
            </div>
          )}
          {profile.canEdit && !readOnly && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-gold" onClick={() => onEdit(profile.id)}><Icon name="edit" size={15} />{t("Edit details")}</button>
              <button className="btn btn-danger" onClick={() => setExitOpen(true)}>{t("Mark as past employee")}</button>
            </div>
          )}
        </>
      )}
      {exitOpen && profile && (
        <ConfirmDialog title={t("Mark as past employee")} danger confirm={t("Mark as exited")} busy={busy} onClose={() => setExitOpen(false)}
          body={<><b>{profile.name}</b> {t("will lose portal access immediately and will be signed out everywhere.")}</>}
          onConfirm={() => start(async () => {
            const result = await markExited(profile.id, exitDate);
            if (result.ok) { toast(result.message!, "bad"); setExitOpen(false); onClose(); }
            else toast(result.error, "bad");
          })}>
          <label className="field" style={{ marginTop: 14 }}>{t("Last working day *")}<input type="date" value={exitDate} min={profile.dateOfJoining} onChange={(e) => setExitDate(e.target.value)} /></label>
        </ConfirmDialog>
      )}
    </Drawer>
  );
}
