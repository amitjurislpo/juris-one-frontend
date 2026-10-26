
import Link from "@/lib/link";
import { useRouter } from "@/lib/router";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { BusinessProfile, PlanRow, RoleTemplate } from "@/lib/api-types";
import { formatRupees } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { phoneProblem, splitPhone } from "@/lib/phone";
import {
  addBusinessRole, addOwner, addSubscription, cancelSubscription, createBusiness, grantModule, removeBusinessRole, revokeModule, setBusinessStatus, setOwnerAccess, syncBusinessRole, updateBusiness,
  type BusinessInput, type GrantInput, type OwnerInput, type SubscriptionInput,
} from "./actions";

const TIME_ZONES = ["Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];

const blankProfile: BusinessInput = { name: "", legalName: "", code: "", employeePrefix: "", timeZone: "Asia/Kolkata", contactEmail: "", contactPhone: "", address: "", gstin: "" };

type FieldErrors = Partial<Record<string, string>>;

/** The message under a field that failed the check before sending. */
function FieldError({ message }: { message?: string }) {
  return message ? <small className="err" role="alert">{message}</small> : null;
}

function ProfileFields({ form, set, lockPrefix, errors }: { form: BusinessInput; set: (updatedProfile: BusinessInput) => void; lockPrefix?: boolean; errors?: FieldErrors }) {
  const t = useT();
  const fieldValue = (fieldName: keyof BusinessInput) => form[fieldName] ?? "";
  const onFieldChange = (fieldName: keyof BusinessInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set({ ...form, [fieldName]: e.target.value });
  return (
    <>
      <div className="grid2">
        <label className="field">{t("Business name *")}<input value={fieldValue("name")} onChange={onFieldChange("name")} maxLength={120} placeholder={t("e.g. Acme Advisors")} autoFocus aria-invalid={errors?.name ? true : undefined} /><FieldError message={errors?.name} /></label>
        <label className="field">{t("Legal name")} <span className="hint">{t("optional")}</span><input value={fieldValue("legalName")} onChange={onFieldChange("legalName")} maxLength={160} placeholder="Acme Advisors LLP" /></label>
      </div>
      <div className="grid3">
        <label className="field">{t("Short name")} <span className="hint">{t("auto if empty")}</span><input value={fieldValue("code")} onChange={onFieldChange("code")} maxLength={40} placeholder="acme-advisors" /></label>
        <label className="field">{t("Employee ID prefix")} <span className="hint">{t("2–5 letters")}</span>
          <input value={fieldValue("employeePrefix")} onChange={onFieldChange("employeePrefix")} maxLength={5} placeholder="AA" disabled={lockPrefix} title={lockPrefix ? t("Fixed once the business has people") : undefined} aria-invalid={errors?.employeePrefix ? true : undefined} />
          <FieldError message={errors?.employeePrefix} />
        </label>
        <label className="field">{t("Time zone")}
          <select value={fieldValue("timeZone")} onChange={onFieldChange("timeZone")}>{TIME_ZONES.map((timeZone) => <option key={timeZone}>{timeZone}</option>)}</select>
        </label>
      </div>
      <div className="grid3">
        <label className="field">{t("Contact email")}<input type="email" value={fieldValue("contactEmail")} onChange={onFieldChange("contactEmail")} maxLength={200} aria-invalid={errors?.contactEmail ? true : undefined} /><FieldError message={errors?.contactEmail} /></label>
        <div className="field">{t("Phone")}<PhoneInput {...splitPhone(fieldValue("contactPhone"))} onChange={(countryCode, phoneNumber) => set({ ...form, contactPhone: phoneNumber ? `${countryCode} ${phoneNumber}` : "" })} /></div>
        <label className="field">{t("GSTIN")}<input value={fieldValue("gstin")} onChange={onFieldChange("gstin")} maxLength={15} placeholder="22AAAAA0000A1Z5" /></label>
      </div>
      <label className="field">{t("Address")}<input value={fieldValue("address")} onChange={onFieldChange("address")} maxLength={400} /></label>
    </>
  );
}

function OwnerFields({ owner, set, optional, errors }: { owner: OwnerInput; set: (updatedOwner: OwnerInput) => void; optional?: boolean; errors?: FieldErrors }) {
  const t = useT();
  return (
    <div className="grid3">
      <label className="field">{optional ? t("Name") : t("Name *")}<input value={owner.name} onChange={(e) => set({ ...owner, name: e.target.value })} maxLength={120} aria-invalid={errors?.ownerName ? true : undefined} /><FieldError message={errors?.ownerName} /></label>
      <label className="field">{optional ? t("Email (signs in with it)") : t("Email (signs in with it) *")}<input type="email" value={owner.email} onChange={(e) => set({ ...owner, email: e.target.value })} maxLength={200} aria-invalid={errors?.ownerEmail ? true : undefined} /><FieldError message={errors?.ownerEmail} /></label>
    </div>
  );
}

function SubscriptionFields({ subscription, set, plans }: { subscription: SubscriptionInput; set: (updatedSubscription: SubscriptionInput) => void; plans: PlanRow[] }) {
  const t = useT();
  const plan = plans.find((p) => p.id === subscription.planId);
  return (
    <>
      <div className="grid2">
        <label className="field">{t("Plan")}
          <select value={subscription.planId} onChange={(e) => set({ ...subscription, planId: e.target.value })}>
            <option value="">{t("— choose a plan —")}</option>
            {plans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatRupees(plan.pricePaise)} / {t("{n} mo", { n: plan.periodMonths })}</option>)}
          </select>
        </label>
        <label className="field">{t("Price charged (₹)")} <span className="hint">{plan ? t("plan price {price}", { price: formatRupees(plan.pricePaise) }) : t("defaults to the plan")}</span>
          <input type="number" min={0} step="0.01" value={subscription.price ?? ""} onChange={(e) => set({ ...subscription, price: e.target.value === "" ? null : Number(e.target.value) })} />
        </label>
      </div>
      <div className="grid3">
        <label className="field">{t("Starts on")} <span className="hint">{t("default today")}</span><input type="date" value={subscription.startsOn ?? ""} onChange={(e) => set({ ...subscription, startsOn: e.target.value })} /></label>
        <label className="field">{t("Ends on")} <span className="hint">{t("default: plan period")}</span><input type="date" value={subscription.endsOn ?? ""} onChange={(e) => set({ ...subscription, endsOn: e.target.value })} /></label>
        <label className="field">{t("Notes")}<input value={subscription.notes ?? ""} onChange={(e) => set({ ...subscription, notes: e.target.value })} maxLength={300} placeholder={t("Invoice no., payment ref.")} /></label>
      </div>
    </>
  );
}

/** Problem with the business phone ("+91 8888788888"), or null when it is blank or valid. */
const businessPhoneProblem = (business: BusinessInput) => {
  const { code, number } = splitPhone(business.contactPhone ?? "");
  return number ? phoneProblem(code, number) : null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is wrong with the new-business form, field by field (empty when it can be sent). The sub admin is optional, but name and email go together. */
function newBusinessProblems(business: BusinessInput, owner: OwnerInput, t: ReturnType<typeof useT>): FieldErrors {
  const problems: FieldErrors = {};
  if (!business.name.trim()) problems.name = t("Enter the business name.");
  if (business.employeePrefix && !/^[A-Za-z]{2,5}$/.test(business.employeePrefix)) problems.employeePrefix = t("Use 2 to 5 letters.");
  if (business.contactEmail && !EMAIL_PATTERN.test(business.contactEmail)) problems.contactEmail = t("Enter a valid email address.");
  if (owner.name.trim() || owner.email.trim()) {
    if (!owner.name.trim()) problems.ownerName = t("Enter the sub admin's name.");
    if (!owner.email.trim()) problems.ownerEmail = t("Enter the sub admin's email.");
    else if (!EMAIL_PATTERN.test(owner.email.trim())) problems.ownerEmail = t("Enter a valid email address.");
  }
  return problems;
}

const clean = <T extends object>(source: T): T => Object.fromEntries(Object.entries(source).filter(([, entryValue]) => entryValue !== "" && entryValue !== null && entryValue !== undefined)) as T;

export function NewBusinessButton({ plans, templates }: { plans: PlanRow[]; templates: RoleTemplate[] }) {
  const toast = useToast();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [businessInput, setBusinessInput] = useState<BusinessInput>(blankProfile);
  const [subscriptionInput, setSubscriptionInput] = useState<SubscriptionInput>({ planId: "" });
  const [ownerInput, setOwnerInput] = useState<OwnerInput>({ name: "", email: "" });
  const [roles, setRoles] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setErr(""); setFieldErrors({}); setBusinessInput(blankProfile); setSubscriptionInput({ planId: "" }); setOwnerInput({ name: "", email: "" }); setRoles([]); };
  const save = () => start(async () => {
    const problems = newBusinessProblems(businessInput, ownerInput, t);
    setFieldErrors(problems);
    if (Object.keys(problems).length) { setErr(t("Check the highlighted fields.")); return; }
    const bad = businessPhoneProblem(businessInput);
    if (bad) { setErr(bad); return; }
    const createResult = await createBusiness({ business: clean(businessInput), subscription: subscriptionInput.planId ? clean(subscriptionInput) : undefined, owner: ownerInput.name || ownerInput.email ? clean(ownerInput) : undefined, roles });
    if (createResult.ok) { toast(createResult.message!); close(); router.push(`/platform/${createResult.data!.id}`); } else setErr(createResult.error);
  });
  return (
    <>
      <button className="btn btn-gold btn-lg" onClick={() => setOpen(true)}><Icon name="plus" size={16} />{t("New business")}</button>
      {open && (
        <Modal title={t("New business")} eyebrow={t("Platform")} maxWidth={760} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Creating…") : t("Create business")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <ProfileFields form={businessInput} set={(x) => { setBusinessInput(x); setErr(""); setFieldErrors({}); }} errors={fieldErrors} />
            <h4 style={{ margin: "6px 0 0" }}>{t("Subscription")}</h4>
            <SubscriptionFields subscription={subscriptionInput} set={(updatedInput) => { setSubscriptionInput(updatedInput); setErr(""); }} plans={plans} />
            <h4 style={{ margin: "6px 0 0" }}>{t("Sub admin")} <span className="hint muted">{t("— runs the business; optional, can be added later. If you fill one field, fill both.")}</span></h4>
            <OwnerFields owner={ownerInput} set={(x) => { setOwnerInput(x); setErr(""); setFieldErrors({}); }} errors={fieldErrors} optional />
            <h4 style={{ margin: "6px 0 0" }}>{t("Roles for this business")} <span className="hint muted">{t("— the business admin can't create roles, so pick what it needs")}</span></h4>
            <RolePicker templates={templates} chosen={roles} set={(x) => { setRoles(x); setErr(""); }} />
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

/** Mandatory roles are always given; the rest are ticked per business. */
function RolePicker({ templates, chosen, set }: { templates: RoleTemplate[]; chosen: string[]; set: (keys: string[]) => void }) {
  const t = useT();
  return (
    <div className="grid3">
      {templates.filter((template) => template.active).map((template) => (
        <label key={template.key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
          <input type="checkbox" checked={template.mandatory || chosen.includes(template.key)} disabled={template.mandatory}
            onChange={(e) => set(e.target.checked ? [...chosen, template.key] : chosen.filter((chosenKey) => chosenKey !== template.key))} />
          {template.name}{template.mandatory && <span className="hint muted">{t("always included")}</span>}
        </label>
      ))}
    </div>
  );
}

export function AddBusinessRoleButton({ businessId, templates }: { businessId: string; templates: RoleTemplate[] }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(templates[0]?.key ?? "");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const none = templates.length === 0;
  const close = () => { setOpen(false); setErr(""); };
  return (
    <>
      <button className="btn btn-sm" onClick={() => { setKey(templates[0]?.key ?? ""); setOpen(true); }}><Icon name="plus" size={14} />{t("Add role")}</button>
      {open && (
        <Modal title={t("Add role")} eyebrow={t("Gives this business a role from the catalogue")} size="sm" onClose={close}
          footer={none ? <button className="btn btn-gold" onClick={close}>{t("OK")}</button> : <><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => start(async () => {
              const addRoleResult = await addBusinessRole(businessId, key);
              if (addRoleResult.ok) { toast(t("Role added")); close(); } else setErr(addRoleResult.error);
            })}>{busy ? t("Adding…") : t("Add role")}</button></>}>
          {none ? (
            <p className="muted" style={{ margin: 0 }}>
              {t("This business already has every available role. To give it a different one, first create it under")} <Link className="linkish" href="/platform/roles">{t("Role templates")}</Link>.
            </p>
          ) : <div className="col" style={{ gap: 14 }}>
            <label className="field">{t("Role")}
              <select value={key} onChange={(e) => { setKey(e.target.value); setErr(""); }}>{templates.map((roleTemplate) => <option key={roleTemplate.key} value={roleTemplate.key}>{roleTemplate.name}</option>)}</select>
            </label>
            {err && <div className="err" role="alert">{err}</div>}
          </div>}
        </Modal>
      )}
    </>
  );
}

/** Update-from-template and remove for one role of a business. */
export function BusinessRoleActions({ businessId, role }: { businessId: string; role: { id: string; name: string; employees: number; mandatory: boolean } }) {
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState<"sync" | "remove" | null>(null);
  const [busy, start] = useTransition();
  const why = role.mandatory ? t("Every business has this role") : role.employees > 0 ? t("Move people to another role first") : undefined;
  const run = (act: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => {
    const actionResult = await act();
    toast(actionResult.ok ? (actionResult.message ?? t("Done")) : (actionResult.error ?? t("Failed")), actionResult.ok ? undefined : "bad");
    setAsk(null);
  });
  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setAsk("sync")}>{t("Update from template")}</button>
      <button className="btn btn-sm btn-ghost" disabled={!!why} title={why} onClick={() => setAsk("remove")} aria-label={t("Remove {name}", { name: role.name })}><Icon name="trash" size={14} /></button>
      {ask === "sync" && (
        <ConfirmDialog title={t("Update from template")} confirm={t("Update role")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Copy the current permissions of the {name} template over this business's role? People holding it get the new permissions straight away.", { name: role.name })}</>}
          onConfirm={() => run(() => syncBusinessRole(businessId, role.id))} />
      )}
      {ask === "remove" && (
        <ConfirmDialog title={t("Remove role")} danger confirm={t("Remove")} busy={busy} onClose={() => setAsk(null)}
          body={<>{t("Remove the {name} role from this business?", { name: role.name })}</>}
          onConfirm={() => run(() => removeBusinessRole(businessId, role.id))} />
      )}
    </>
  );
}

export function EditBusinessButton({ id, profile, hasPeople }: { id: string; profile: BusinessProfile; hasPeople: boolean }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const init: BusinessInput = Object.fromEntries(Object.entries(profile).map(([fieldName, profileValue]) => [fieldName, profileValue ?? ""])) as unknown as BusinessInput;
  const [editedBusiness, setEditedBusiness] = useState<BusinessInput>(init);
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const save = () => start(async () => {
    const bad = businessPhoneProblem(editedBusiness);
    if (bad) { setErr(bad); return; }
    const updateResult = await updateBusiness(id, editedBusiness);
    if (updateResult.ok) { toast(updateResult.message!); setOpen(false); } else setErr(updateResult.error);
  });
  return (
    <>
      <button className="btn" onClick={() => { setEditedBusiness(init); setOpen(true); }}><Icon name="edit" size={14} />{t("Edit details")}</button>
      {open && (
        <Modal title={t("Business details")} eyebrow={profile.name} maxWidth={760} onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <ProfileFields form={editedBusiness} set={(updatedBusiness) => { setEditedBusiness(updatedBusiness); setErr(""); }} lockPrefix={hasPeople} />
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function BusinessStatusButton({ id, name, status }: { id: string; name: string; status: "ACTIVE" | "SUSPENDED" }) {
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  const suspend = status === "ACTIVE";
  return (
    <>
      <button className={`btn ${suspend ? "btn-ghost" : "btn-gold"}`} onClick={() => setAsk(true)}><Icon name={suspend ? "lock" : "ok"} size={14} />{suspend ? t("Suspend") : t("Reactivate")}</button>
      {ask && (
        <ConfirmDialog title={suspend ? t("Suspend business") : t("Reactivate business")} danger={suspend} confirm={suspend ? t("Suspend") : t("Reactivate")} dismiss={t("Close")} busy={busy} onClose={() => setAsk(false)}
          body={suspend ? <>{t("Suspend {name}? Everyone in it is signed out at once and can't sign in until you reactivate it. Its data is kept.", { name })}</> : <>{t("Let people in {name} sign in again?", { name })}</>}
          onConfirm={() => start(async () => { const statusResult = await setBusinessStatus(id, suspend ? "SUSPENDED" : "ACTIVE"); toast(statusResult.ok ? statusResult.message! : statusResult.error, statusResult.ok ? undefined : "bad"); setAsk(false); })} />
      )}
    </>
  );
}

export function AddOwnerButton({ id }: { id: string }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [additionalOwner, setAdditionalOwner] = useState<OwnerInput>({ name: "", email: "" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setErr(""); setAdditionalOwner({ name: "", email: "" }); };
  const save = () => start(async () => {
    const addOwnerResult = await addOwner(id, clean(additionalOwner));
    if (addOwnerResult.ok) { toast(addOwnerResult.message!); close(); } else setErr(addOwnerResult.error);
  });
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={14} />{t("Add sub admin")}</button>
      {open && (
        <Modal title={t("Add sub admin")} eyebrow={t("Runs this business")} maxWidth={720} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Adding…") : t("Add sub admin")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <OwnerFields owner={additionalOwner} set={(x) => { setAdditionalOwner(x); setErr(""); }} />
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function OwnerAccessSwitch({ businessId, ownerId, name, isEnabled }: { businessId: string; ownerId: string; name: string; isEnabled: boolean }) {
  const toast = useToast();
  const t = useT();
  const [busy, start] = useTransition();
  return (
    <button className="switch" role="switch" aria-checked={isEnabled} disabled={busy} aria-label={isEnabled ? t("Turn off access for {name}", { name }) : t("Turn on access for {name}", { name })}
      onClick={() => start(async () => { const accessResult = await setOwnerAccess(businessId, ownerId, !isEnabled); toast(accessResult.ok ? accessResult.message! : accessResult.error, accessResult.ok ? undefined : "bad"); })}><i></i></button>
  );
}

export function AddSubscriptionButton({ id, plans, label }: { id: string; plans: PlanRow[]; label: string }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState<SubscriptionInput>({ planId: "" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const close = () => { setOpen(false); setErr(""); setNewSubscription({ planId: "" }); };
  const save = () => start(async () => {
    if (!newSubscription.planId) { setErr(t("Choose a plan.")); return; }
    const subscriptionResult = await addSubscription(id, clean(newSubscription));
    if (subscriptionResult.ok) { toast(subscriptionResult.message!); close(); } else setErr(subscriptionResult.error);
  });
  return (
    <>
      <button className="btn btn-sm btn-gold" onClick={() => setOpen(true)}><Icon name="plus" size={14} />{label}</button>
      {open && (
        <Modal title={label} eyebrow={t("Subscription")} maxWidth={720} onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Saving…") : t("Save")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <SubscriptionFields subscription={newSubscription} set={(updatedSubscription) => { setNewSubscription(updatedSubscription); setErr(""); }} plans={plans} />
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function CancelSubscriptionButton({ businessId, subscriptionId, label }: { businessId: string; subscriptionId: string; label: string }) {
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setAsk(true)} aria-label={t("Cancel {label}", { label })}><Icon name="x" size={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Cancel subscription")} danger confirm={t("Cancel subscription")} dismiss={t("Keep it")} busy={busy} onClose={() => setAsk(false)}
          body={<>{t("Cancel {label}? If it covers today, the business loses access straight away and nobody in it can sign in until a new subscription starts. (An expired subscription is different: people can still sign in to view and export.)", { label })}</>}
          onConfirm={() => start(async () => { const cancelResult = await cancelSubscription(businessId, subscriptionId); toast(cancelResult.ok ? cancelResult.message! : cancelResult.error, cancelResult.ok ? undefined : "bad"); setAsk(false); })} />
      )}
    </>
  );
}

export function GrantJurisTrackButton({ id }: { id: string }) {
  const toast = useToast();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [grantInput, setGrantInput] = useState<GrantInput>({ source: "COMPLIMENTARY" });
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const set = (x: Partial<GrantInput>) => { setGrantInput({ ...grantInput, ...x }); setErr(""); };
  const close = () => { setOpen(false); setErr(""); setGrantInput({ source: "COMPLIMENTARY" }); };
  const paid = grantInput.source === "PAID";
  const save = () => start(async () => {
    const grantResult = await grantModule(id, clean(paid ? grantInput : { ...grantInput, price: undefined }));
    if (grantResult.ok) { toast(grantResult.message!); close(); } else setErr(grantResult.error);
  });
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}><Icon name="sparkle" size={14} />{t("Grant Juris Track")}</button>
      {open && (
        <Modal title={t("Grant Juris Track")} eyebrow={t("On its own, whatever the plan")} size="sm" onClose={close}
          footer={<><button className="btn btn-ghost" onClick={close}>{t("Cancel")}</button><button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? t("Granting…") : t("Grant")}</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <div className="field">{t("Type")}
              <div style={{ display: "flex", gap: 16 }}>
                {(["COMPLIMENTARY", "PAID"] as const).map((grantSource) => (
                  <label key={grantSource} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                    <input type="radio" name="source" checked={grantInput.source === grantSource} onChange={() => set({ source: grantSource })} />{grantSource === "PAID" ? t("Paid") : t("Complimentary (free)")}
                  </label>
                ))}
              </div>
            </div>
            {paid && (
              <label className="field">{t("Price paid (₹) *")}<input type="number" min={1} step="0.01" value={grantInput.price ?? ""} onChange={(e) => set({ price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            )}
            <div className="grid2">
              <label className="field">{t("Starts on")} <span className="hint">{t("default today")}</span><input type="date" value={grantInput.startsOn ?? ""} onChange={(e) => set({ startsOn: e.target.value })} /></label>
              <label className="field">{t("Ends on")} {paid ? "*" : <span className="hint">{t("empty = no end")}</span>}<input type="date" value={grantInput.endsOn ?? ""} onChange={(e) => set({ endsOn: e.target.value })} /></label>
            </div>
            <label className="field">{t("Notes")}<input value={grantInput.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} maxLength={300} placeholder={t("Invoice no., reason")} /></label>
            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function RevokeGrantButton({ businessId, grantId, label }: { businessId: string; grantId: string; label: string }) {
  const toast = useToast();
  const t = useT();
  const [ask, setAsk] = useState(false);
  const [busy, start] = useTransition();
  return (
    <>
      <button className="btn btn-sm btn-ghost" onClick={() => setAsk(true)} aria-label={t("Revoke {label}", { label })}><Icon name="x" size={14} /></button>
      {ask && (
        <ConfirmDialog title={t("Revoke Juris Track")} danger confirm={t("Revoke")} busy={busy} onClose={() => setAsk(false)}
          body={<>{t("Revoke {label}? Unless the business's plan includes Juris Track, it disappears from their menu straight away. The grant stays on record.", { label })}</>}
          onConfirm={() => start(async () => { const revokeResult = await revokeModule(businessId, grantId); toast(revokeResult.ok ? revokeResult.message! : revokeResult.error, revokeResult.ok ? undefined : "bad"); setAsk(false); })} />
      )}
    </>
  );
}
