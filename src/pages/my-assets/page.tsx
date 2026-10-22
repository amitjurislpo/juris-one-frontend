import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { AssetAssignment } from "@/lib/api-types";
import { ASSET_TYPES, CONDITIONS } from "@/lib/assets";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear } from "@/lib/format";


const describe = (assignment: AssetAssignment, t: (text: string) => string) => [assignment.make, assignment.model].filter(Boolean).join(" ") || (ASSET_TYPES[assignment.type] ? t(ASSET_TYPES[assignment.type]) : assignment.type);

/** The company equipment assigned to the signed-in user, now and before. */
export default function MyAssetsPage() {
  const { t } = usePage();
  const data = useData<{ current: AssetAssignment[]; past: AssetAssignment[] }>("/api/assets/mine");
  if (!data) return <PageLoading />;
  const { current, past } = data;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Company")} title={<>{t("My")} <em>{t("assets")}</em></>} sub={t("Laptops, phones and other equipment the company has given you. Please return them to HR when you leave or swap them.")} />
      <section className="card enter" style={{ ["--i" as string]: 1 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("Assigned to me")}</h3></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Asset")}</th><th>{t("Tag")}</th><th className="hide-sm">{t("Serial")}</th><th>{t("Since")}</th><th className="hide-sm">{t("Notes")}</th></tr></thead>
            <tbody>
              {current.map((assignment) => (
                <tr key={assignment.id}>
                  <td><div className="person"><span className="kpi-ico" style={{ width: 34, height: 34, background: "var(--accentsoft)", color: "var(--accent)" }}><Icon name="layers" size={16} /></span><div><b>{describe(assignment, t)}</b><small>{ASSET_TYPES[assignment.type] ? t(ASSET_TYPES[assignment.type]) : assignment.type}</small></div></div></td>
                  <td className="num">{assignment.tag}</td>
                  <td className="muted hide-sm">{assignment.serial ?? "—"}</td>
                  <td>{formatDayMonthYear(assignment.assignedOn)}</td>
                  <td className="muted hide-sm">{assignment.assignNotes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!current.length && <div className="empty"><b className="display">{t("Nothing assigned")}</b><span className="muted">{t("When HR gives you a laptop, phone or other equipment it will show up here.")}</span></div>}
      </section>
      {past.length > 0 && (
        <section className="card enter" style={{ ["--i" as string]: 2 }}>
          <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("Returned")}</h3></div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>{t("Asset")}</th><th>{t("Tag")}</th><th>{t("From")}</th><th>{t("Returned")}</th><th>{t("Condition")}</th></tr></thead>
              <tbody>
                {past.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><b>{describe(assignment, t)}</b></td>
                    <td className="num">{assignment.tag}</td>
                    <td>{formatDayMonthYear(assignment.assignedOn)}</td>
                    <td>{assignment.returnedOn ? formatDayMonthYear(assignment.returnedOn) : "—"}</td>
                    <td>{assignment.returnCondition ? t(CONDITIONS[assignment.returnCondition]) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
