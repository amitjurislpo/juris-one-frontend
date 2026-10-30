import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear } from "@/lib/format";
import { shiftLabel } from "@/lib/shifts";
import { PhotoCard } from "./PhotoCard";
import { ProfileForm, type MyProfile } from "./ProfileForm";


/** Everyone's own record: job details (read-only), and personal details they keep up to date themselves. */
export default function ProfilePage() {
  const { t } = usePage();
  const profile = useData<MyProfile>("/api/v1/profile");
  if (!profile) return <PageLoading />;
  const readOnlyRows: [string, string | null][] = [
    [t("Employee ID"), profile.code], [t("Work email"), profile.email], [t("Phone"), profile.phone], [t("Designation"), profile.designation], [t("Department"), profile.department], [t("Role"), profile.role],
    [t("Reporting manager"), profile.manager], [t("Date of joining"), formatDayMonthYear(profile.dateOfJoining)], [t("Joining office"), profile.joiningOffice], [t("Work location"), profile.location],
    [t("Shift"), profile.shift ? shiftLabel(profile.shift, t) : profile.shift], [t("PAN"), profile.pan], [t("Aadhaar"), profile.aadhaar], [t("Bank account"), profile.bank],
  ];

  return (
    <div className="col">
      <PageHeader eyebrow={t("Account")} title={profile.firstName} emphasis={[profile.middleName, profile.lastName].filter(Boolean).join(" ")}
        sub={t("Keep your personal details up to date. Your name, work email, phone, IDs and bank details are changed by HR.")} />
      <div className="enter" style={{ ["--i" as string]: 1 }}><PhotoCard /></div>
      <div className="grid2 enter" style={{ ["--i" as string]: 1, alignItems: "start" }}>
        <section className="card" style={{ padding: 18 }}>
          <div className="card-h"><h3>{t("Job & records")}</h3><small className="muted">{t("Managed by HR")}</small></div>
          {readOnlyRows.map(([label, fieldValue]) => <div key={label} className="kv"><span className="muted">{label}</span><b style={{ textAlign: "right" }}>{fieldValue || "—"}</b></div>)}
        </section>
        <ProfileForm profile={profile} />
      </div>
      {profile.documents.length > 0 && (
        <section className="card enter" style={{ ["--i" as string]: 2, padding: 18 }}>
          <div className="card-h"><h3>{t("My documents")}</h3><small className="muted">{t("Verified during onboarding")}</small></div>
          {profile.documents.map((profileDocument) => (
            <div key={profileDocument.id} className="kv">
              <span>{profileDocument.label}</span>
              <a className="linkish" href={`/api/v1/profile/documents/${profileDocument.id}/file`} target="_blank" rel="noopener">{profileDocument.fileName}</a>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
