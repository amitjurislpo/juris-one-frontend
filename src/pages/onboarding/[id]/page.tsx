import Link from "@/lib/link";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDateTime, formatDayMonthYear } from "@/lib/format";
import { AddEmployeeButton, DocumentDecision, EditPlanButton, OnboardingActions } from "../OnboardingClient";
import { ONBOARDING_STATUS, type OnboardingStatus } from "../status";


interface Detail {
  id: string; candidateName: string; personalEmail: string; designation: string | null; departmentId: string | null; roleId: string | null; managerId: string | null;
  joiningDate: string | null; location: string; requiredDocs: string[]; status: OnboardingStatus; hrComment: string | null; linkExpiresAt: string | null;
  submittedAt: string | null; verifiedAt: string | null; employeeId: string | null; employeeCode: string | null;
  form: Record<string, string | null>;
  documents: { id: string; kind: string; label: string; fileName: string; mime: string; size: number; status: "PENDING" | "VERIFIED" | "REJECTED"; comment: string | null;
    uploadedAt: string; verifiedBy: string | null }[];
  checklist: { kind: string; label: string; needed: number; uploaded: number; verified: number }[];
}

const DOC = { PENDING: { cls: "warn", text: "To check" }, VERIFIED: { cls: "ok", text: "Verified" }, REJECTED: { cls: "bad", text: "Rejected" } } as const;

const FIELDS: [string, string][] = [
  ["fullName", "Full name"], ["fatherName", "Father's name"], ["dateOfBirth", "Date of birth"], ["gender", "Gender"], ["phone", "Mobile"],
  ["currentAddress", "Current address"], ["permanentAddress", "Permanent address"], ["pan", "PAN"], ["aadhaar", "Aadhaar"], ["uan", "UAN"],
  ["bankName", "Bank"], ["bankAccount", "Account"], ["ifsc", "IFSC"], ["previousEmployer", "Previous employer"], ["previousDesignation", "Previous designation"],
  ["emergencyName", "Emergency contact"], ["emergencyRelation", "Relationship"], ["emergencyPhone", "Emergency phone"],
];

/** HR's review of one onboarding: the candidate's answers (identity numbers masked), documents, decisions and "Add employee". */
export default function OnboardingReviewPage() {
  const { user, t, params } = usePage();
  const { id } = params;
  const data = useData<Detail>(`/api/onboardings/${encodeURIComponent(id)}`);
  if (!data) return <PageLoading />;
  const st = ONBOARDING_STATUS[data.status];
  const plan = { candidateName: data.candidateName, personalEmail: data.personalEmail, designation: data.designation ?? "", departmentId: data.departmentId ?? "",
    roleId: data.roleId ?? "", managerId: data.managerId ?? "", joiningDate: data.joiningDate ?? "", location: data.location, requiredDocs: data.requiredDocs };
  const decidable = ["SUBMITTED", "IN_PROGRESS", "CHANGES_REQUESTED", "INVITED"].includes(data.status);
  const closed = data.status === "ADDED" || data.status === "CANCELLED";

  return (
    <div className="col">
      <PageHeader back="/onboarding" eyebrow={<><Link href="/onboarding" className="linkish">{t("Onboarding")}</Link> / {data.personalEmail}</>} title={data.candidateName}
        sub={<><span className={`chip ${st.cls}`}>{t(st.text)}</span>{" "}
          {data.designation ?? t("No designation yet")}{data.joiningDate ? ` · ${t("joining {date}", { date: formatDayMonthYear(data.joiningDate) })}` : ""}
          {data.linkExpiresAt && !closed ? ` · ${t("link valid until {date}", { date: formatDayMonthYear(data.linkExpiresAt.slice(0, 10)) })}` : ""}
          {data.employeeCode && data.employeeId ? <> · {t("added as")} <Link className="linkish" href={`/employees?search=${data.employeeCode}`}>{data.employeeCode}</Link> — {t("turn on portal access in Employees so they can sign in")}</> : null}</>}>
        {!closed && <EditPlanButton id={data.id} plan={plan} />}
        <OnboardingActions id={data.id} status={data.status} name={data.candidateName} />
        {data.status === "VERIFIED" && <AddEmployeeButton id={data.id} name={data.candidateName} plan={plan} />}
      </PageHeader>

      {data.hrComment && data.status === "CHANGES_REQUESTED" && (
        <div className="card enter" style={{ padding: 14, background: "var(--warnbg)", borderColor: "transparent" }}><b>{t("Sent back:")}</b> {data.hrComment}</div>
      )}

      <div className="grid2 enter" style={{ ["--i" as string]: 1, alignItems: "start" }}>
        <section className="card" style={{ padding: 18 }}>
          <div className="card-h"><h3>{t("Candidate's details")}</h3><small className="muted">{data.submittedAt ? t("Submitted {when}", { when: formatDateTime(new Date(data.submittedAt), user.timeZone) }) : t("Not submitted yet")}</small></div>
          {FIELDS.map(([k, l]) => (
            <div key={k} className="kv"><span className="muted">{t(l)}</span><b style={{ textAlign: "right", whiteSpace: "pre-wrap" }}>{data.form[k] || "—"}</b></div>
          ))}
          <p className="faint" style={{ fontSize: 12, margin: "10px 0 0" }}>{t("Identity and bank numbers are shown masked; check them against the documents.")}</p>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="card-h"><h3>{t("Required documents")}</h3></div>
          {data.checklist.map((c) => (
            <div key={c.kind} className="kv">
              <span>{t(c.label)}</span>
              <span className={`chip ${c.verified >= c.needed ? "ok" : c.uploaded >= c.needed ? "warn" : "neutral"}`}>{t("{verified}/{needed} verified", { verified: c.verified, needed: c.needed })}{c.uploaded > c.verified ? ` · ${t("{n} to check", { n: c.uploaded - c.verified })}` : ""}</span>
            </div>
          ))}
          {!data.checklist.length && <p className="muted">{t("No documents required.")}</p>}
        </section>
      </div>

      <section className="card enter" style={{ ["--i" as string]: 2 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("Uploaded documents")}</h3></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Document")}</th><th>{t("File")}</th><th>{t("Status")}</th><th className="hide-sm">{t("Uploaded")}</th><th></th></tr></thead>
            <tbody>
              {data.documents.map((x) => (
                <tr key={x.id}>
                  <td><b>{t(x.label)}</b></td>
                  <td><a className="linkish" href={`/api/onboardings/${data.id}/documents/${x.id}/file`} target="_blank" rel="noopener">{x.fileName}</a> <small className="muted">{Math.max(1, Math.round(x.size / 1024))} KB</small></td>
                  <td><span className={`chip ${DOC[x.status].cls}`}>{t(DOC[x.status].text)}</span>{x.comment && <><br /><small className="muted">{x.comment}</small></>}{x.verifiedBy && <><br /><small className="faint">{t("by {name}", { name: x.verifiedBy })}</small></>}</td>
                  <td className="muted hide-sm">{formatDateTime(new Date(x.uploadedAt), user.timeZone)}</td>
                  <td className="r">{decidable && <DocumentDecision id={data.id} docId={x.id} name={x.fileName} status={x.status} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.documents.length && <div className="empty"><span className="muted">{t("Nothing uploaded yet.")}</span></div>}
      </section>
    </div>
  );
}
