
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useT } from "@/lib/i18n/client";
import { useReadOnly } from "@/lib/session";
import { getFormOptions, type FormOptions } from "../employees/actions";
import {
  addOnboardedEmployee, decideDocument, getOnboardingDefaults, resendOnboarding, saveOnboardingDefaults, setOnboardingStatus, startOnboarding, updateOnboarding,
  type PlanInput,
} from "./actions";
import { DEFAULT_REQUIRED, DOC_KINDS } from "./status";

const LOCATIONS = [["IN_IST", "India · IST"], ["US_ET", "US East · ET"], ["US_CT", "US Central · CT"], ["US_PT", "US West · PT"]] as const;

/** Loads the people form options (departments, roles, managers) when a dialog opens. */
function useOptions() {
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const load = async () => {
    if (options) return;
    const optionsResult = await getFormOptions();
    if (optionsResult.ok) setOptions(optionsResult.data!); else setErrorMessage(optionsResult.error);
  };
  return { options, errorMessage, load };
}

function PlanFields({ plan, set, options }: { plan: PlanInput; set: (plan: PlanInput) => void; options: FormOptions | null }) {
  const t = useT();
  const bindField = (fieldName: keyof PlanInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set({ ...plan, [fieldName]: e.target.value });
  const req = plan.requiredDocs ?? DEFAULT_REQUIRED;
  return (
    <>
      <div className="grid2">
        <label className="field">{t("Candidate name *")}<input value={plan.candidateName} onChange={bindField("candidateName")} maxLength={120} autoFocus /></label>
        <label className="field">{t("Personal email *")} <span className="hint">{t("the link goes here")}</span><input type="email" value={plan.personalEmail} onChange={bindField("personalEmail")} maxLength={200} /></label>
      </div>
      <div className="grid3">
        <label className="field">{t("Designation")}<input value={plan.designation ?? ""} onChange={bindField("designation")} maxLength={120} placeholder={t("e.g. Associate")} /></label>
        <label className="field">{t("Department")}
          <select value={plan.departmentId ?? ""} onChange={bindField("departmentId")}><option value="">—</option>{options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
        </label>
        <label className="field">{t("Joining date")}<input type="date" value={plan.joiningDate ?? ""} onChange={bindField("joiningDate")} /></label>
      </div>
      <div className="grid3">
        <label className="field">{t("Role")}
          <select value={plan.roleId ?? ""} onChange={bindField("roleId")}><option value="">—</option>{options?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
        </label>
        <label className="field">{t("Reporting manager")}
          <select value={plan.managerId ?? ""} onChange={bindField("managerId")}><option value="">—</option>{options?.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} — {manager.title}</option>)}</select>
        </label>
        <label className="field">{t("Location")}
          <select value={plan.location ?? "IN_IST"} onChange={bindField("location")}>{LOCATIONS.map(([locationCode, locationLabel]) => <option key={locationCode} value={locationCode}>{t(locationLabel)}</option>)}</select>
        </label>
      </div>
      <div className="field">{t("Documents the candidate must upload")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          {Object.entries(DOC_KINDS).map(([documentKind, kindLabel]) => (
            <label key={documentKind} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
              <input type="checkbox" checked={req.includes(documentKind)} onChange={(e) => set({ ...plan, requiredDocs: e.target.checked ? [...req, documentKind] : req.filter((requiredKind) => requiredKind !== documentKind) })} />{t(kindLabel)}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

const blank: PlanInput = { candidateName: "", personalEmail: "", designation: "", departmentId: "", roleId: "", managerId: "", joiningDate: "", location: "IN_IST", requiredDocs: DEFAULT_REQUIRED };

export function StartOnboardingButton() {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const { options, errorMessage: optionsError, load } = useOptions();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanInput>(blank);
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setErrorMessage(""); setPlan(blank); };
  const save = () => start(async () => {
    const result = await startOnboarding(plan);
    if (result.ok) { toast(result.message!); close(); router.push(`/onboarding/${result.data!.id}`); } else setErrorMessage(result.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => {
        setOpen(true);
        void load();
        // start from the business's default document list
        void getOnboardingDefaults().then((defaultsResult) => { if (defaultsResult.ok) setPlan((cur) => ({ ...cur, requiredDocs: defaultsResult.data!.requiredDocs })); });
      }}><Icon name="plus" size={16} />{t("New onboarding")}</button>
      {open && (
        <Modal title={t("New onboarding")} eyebrow={t("The candidate gets a link valid for 7 days")} maxWidth={760} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Sending…") : t("Send link")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <PlanFields plan={plan} set={(x) => { setPlan(x); setErrorMessage(""); }} options={options} />
            {(errorMessage || optionsError) && <div className="err" role="alert">{errorMessage || optionsError}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function EditPlanButton({ id, plan }: { id: string; plan: PlanInput }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const { options, load } = useOptions();
  const [open, setOpen] = useState(false);
  const [editedPlan, setEditedPlan] = useState<PlanInput>(plan);
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const result = await updateOnboarding(id, editedPlan);
    if (result.ok) { toast(result.message!); setOpen(false); } else setErrorMessage(result.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className="btn" onClick={() => { setEditedPlan(plan); setOpen(true); void load(); }}><Icon name="edit" size={14} />{t("Edit")}</button>
      {open && (
        <Modal title={t("Onboarding details")} eyebrow={plan.candidateName} maxWidth={760} onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <PlanFields plan={editedPlan} set={(x) => { setEditedPlan(x); setErrorMessage(""); }} options={options} />
            {errorMessage && <div className="err" role="alert">{errorMessage}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

/** Verify / reject one document (a rejection asks for a comment the candidate sees). */
export function DocumentDecision({ id, docId, name, status }: { id: string; docId: string; name: string; status: "PENDING" | "VERIFIED" | "REJECTED" }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [reject, setReject] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, start] = useTransition();
  const run = (decision: "VERIFIED" | "REJECTED", reviewComment?: string) => start(async () => {
    const result = await decideDocument(id, docId, decision, reviewComment);
    toast(result.ok ? result.message! : result.error, result.ok ? undefined : "bad");
    if (result.ok) { setReject(false); setComment(""); }
  });
  if (readOnly) return null;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {status !== "VERIFIED" && <button className="btn btn-sm" disabled={busy} onClick={() => run("VERIFIED")}><Icon name="check" size={13} />{t("Verify")}</button>}
      {status !== "REJECTED" && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setReject(true)}>{t("Reject")}</button>}
      {reject && (
        <Modal title={t("Reject document")} eyebrow={name} size="sm" onClose={() => setReject(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setReject(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy || comment.trim().length < 3} onClick={() => run("REJECTED", comment)}>{t("Reject")}</button></>}>
          <label className="field">{t("What should the candidate fix? *")}<input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} autoFocus placeholder={t("e.g. The scan is blurred")} /></label>
        </Modal>
      )}
    </span>
  );
}

/** Resend the link, send back, verify, cancel. */
export function OnboardingActions({ id, status, name }: { id: string; status: string; name: string }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState<null | "back" | "cancel">(null);
  const [comment, setComment] = useState("");
  const [busy, start] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const result = await action();
    toast(result.ok ? result.message! : result.error!, result.ok ? undefined : "bad");
    if (result.ok) { setAsk(null); setComment(""); }
  });
  const open = ["INVITED", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(status);
  const cancelParts = t("Cancel the onboarding of {name}? Their link stops working. Uploaded documents are kept with this record.", { name: "\u0000" }).split("\u0000");
  if (readOnly) return null;
  return (
    <>
      {open && <button className="btn" disabled={busy} onClick={() => run(() => resendOnboarding(id))}><Icon name="upload" size={14} />{t("Send a new link")}</button>}
      {(status === "SUBMITTED" || status === "VERIFIED") && <button className="btn" onClick={() => setAsk("back")}>{t("Send back")}</button>}
      {status === "SUBMITTED" && <button className="btn btn-gold" disabled={busy} onClick={() => run(() => setOnboardingStatus(id, "VERIFIED"))}><Icon name="check" size={14} />{t("Mark verified")}</button>}
      {status !== "ADDED" && status !== "CANCELLED" && <button className="btn btn-ghost" onClick={() => setAsk("cancel")}>{t("Cancel onboarding")}</button>}
      {ask === "back" && (
        <Modal title={t("Send back to the candidate")} eyebrow={name} size="sm" onClose={() => setAsk(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setAsk(null)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy || comment.trim().length < 3} onClick={() => run(() => setOnboardingStatus(id, "CHANGES_REQUESTED", comment))}>{t("Send back")}</button></>}>
          <label className="field">{t("What should they change? *")} <span className="hint">{t("emailed with a new link")}</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={1000} autoFocus />
          </label>
        </Modal>
      )}
      {ask === "cancel" && (
        <ConfirmDialog title={t("Cancel onboarding")} danger confirm={t("Cancel onboarding")} busy={busy} onClose={() => setAsk(null)}
          body={<>{cancelParts[0]}<b>{name}</b>{cancelParts[1]}</>}
          onConfirm={() => run(() => setOnboardingStatus(id, "CANCELLED"))} />
      )}
    </>
  );
}

/** Creates the employee from a verified onboarding (portal access off until HR turns it on). */
export function AddEmployeeButton({ id, name, plan }: { id: string; name: string; plan: PlanInput }) {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const { options, errorMessage: optionsError, load } = useOptions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ workEmail: "", designation: plan.designation ?? "", departmentId: plan.departmentId ?? "", managerId: plan.managerId ?? "",
    roleId: plan.roleId ?? "", joiningDate: plan.joiningDate ?? "", location: plan.location ?? "", joiningOffice: "", shift: plan.location && plan.location !== "IN_IST" ? "US_DAY" : "IN_NIGHT" });
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, start] = useTransition();
  const bindField = (fieldName: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm({ ...form, [fieldName]: e.target.value }); setErrorMessage(""); };
  const india = !form.location || form.location === "IN_IST";
  const save = () => start(async () => {
    const result = await addOnboardedEmployee(id, { ...form, shift: india ? form.shift : "US_DAY" });
    if (result.ok) { toast(result.message!); setOpen(false); router.refresh(); } else setErrorMessage(result.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className="btn btn-gold" onClick={() => { setOpen(true); void load(); }}><Icon name="plus" size={14} />{t("Add employee")}</button>
      {open && (
        <Modal title={t("Add employee")} eyebrow={t("{name} · from onboarding", { name })} maxWidth={760} onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Adding…") : t("Add employee")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <p className="muted" style={{ margin: 0 }}>{t("Name, identity, contact and bank details come from the candidate's form; verified documents go on their record. Portal access stays off until you turn it on — then they can sign in with an emailed code on their work email.")}</p>
            <div className="grid2">
              <label className="field">{t("Work email *")} <span className="hint">{t("they sign in with it")}</span><input type="email" value={form.workEmail} onChange={bindField("workEmail")} maxLength={200} autoFocus /></label>
              <label className="field">{t("Designation *")}<input value={form.designation} onChange={bindField("designation")} maxLength={120} /></label>
            </div>
            <div className="grid3">
              <label className="field">{t("Department *")}
                <select value={form.departmentId} onChange={bindField("departmentId")}><option value="">—</option>{options?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
              </label>
              <label className="field">{t("Role *")}
                <select value={form.roleId} onChange={bindField("roleId")}><option value="">—</option>{options?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
              </label>
              <label className="field">{t("Reporting manager *")}
                <select value={form.managerId} onChange={bindField("managerId")}><option value="">—</option>{options?.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} — {manager.title}</option>)}</select>
              </label>
            </div>
            <div className="grid3">
              <label className="field">{t("Joining date *")}<input type="date" value={form.joiningDate} onChange={bindField("joiningDate")} /></label>
              <label className="field">{t("Work location")} <span className="hint">{t("India if not set")}</span>
                <select value={form.location} onChange={bindField("location")}><option value="">{t("Not set (India)")}</option>{LOCATIONS.map(([locationCode, locationLabel]) => <option key={locationCode} value={locationCode}>{t(locationLabel)}</option>)}</select>
              </label>
              {india ? (
                <label className="field">{t("Shift")}
                  <select value={form.shift} onChange={bindField("shift")}><option value="IN_NIGHT">{t("Night (US hours)")}</option><option value="IN_DAY">{t("Day")}</option></select>
                </label>
              ) : <span />}
            </div>
            <label className="field">{t("Joining office")} <span className="hint">{t("optional")}</span><input value={form.joiningOffice} onChange={bindField("joiningOffice")} maxLength={120} placeholder={t("e.g. Noida office")} /></label>
            {(errorMessage || optionsError) && <div className="err" role="alert">{errorMessage || optionsError}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

/** The business's default list of documents new onboardings ask for. */
export function DefaultDocumentsButton() {
  const readOnly = useReadOnly();
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<string[]>(DEFAULT_REQUIRED);
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, start] = useTransition();
  const openIt = () => {
    setErrorMessage("");
    setOpen(true);
    void getOnboardingDefaults().then((r) => (r.ok ? setDocs(r.data!.requiredDocs) : setErrorMessage(r.error)));
  };
  const save = () => start(async () => {
    const result = await saveOnboardingDefaults(docs);
    if (result.ok) { toast(result.message!); setOpen(false); } else setErrorMessage(result.error);
  });
  if (readOnly) return null;
  return (
    <>
      <button className="btn" onClick={openIt}><Icon name="doc" size={14} />{t("Default documents")}</button>
      {open && (
        <Modal title={t("Default documents")} eyebrow={t("What new onboardings ask for")} size="sm" onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></>}>
          <div className="col" style={{ gap: 10 }}>
            <p className="muted" style={{ margin: 0 }}>{t("You can still change the list for each candidate when you start their onboarding.")}</p>
            {Object.entries(DOC_KINDS).map(([documentKind, kindLabel]) => (
              <label key={documentKind} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={docs.includes(documentKind)} onChange={(e) => setDocs(e.target.checked ? [...docs, documentKind] : docs.filter((kind) => kind !== documentKind))} />{t(kindLabel)}
              </label>
            ))}
            {errorMessage && <div className="err" role="alert">{errorMessage}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}
