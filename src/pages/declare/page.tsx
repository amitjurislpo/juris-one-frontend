import { PageHeader } from "@/components/PageHeader";
import { PageLoading, useData, usePage } from "@/lib/page";
import { DeclareClient, type ItemView } from "./DeclareClient";


type DeclarationData =
  | { financialYear: string; india: false }
  | { financialYear: string; india: true; hasStructure: false }
  | {
      financialYear: string; india: true; hasStructure: true; regime: "NEW" | "OLD"; overridden: boolean; canChangeRegime: boolean; windowOpen: boolean; windowText: string;
      newTax: number; oldTax: number; monthlyTds: number; epf: number; profile: { metro: boolean; parentsSenior: boolean; landlordPan: string }; items: ItemView[];
    };

export default function DeclarePage() {
  const { t } = usePage();
  const data = useData<DeclarationData>("/api/v1/declarations");
  if (!data) return <PageLoading />;
  if (!data.india) {
    return <div className="col"><PageHeader eyebrow={t("Tax year {fy}", { fy: data.financialYear })} title={t("Tax")} emphasis={t("declarations")} /><div className="empty"><b className="display">{t("Not applicable")}</b><span className="muted">{t("Tax declarations are for the India payroll. US team taxes are handled by the US payroll provider.")}</span></div></div>;
  }
  if (!data.hasStructure) {
    return <div className="col"><PageHeader eyebrow={t("Tax year {fy}", { fy: data.financialYear })} title={t("Tax")} emphasis={t("declarations")} /><div className="empty"><b className="display">{t("No salary structure yet")}</b><span className="muted">{t("Finance hasn't set up your salary structure yet — tax estimates appear once it's in place.")}</span></div></div>;
  }
  return (
    <div className="col">
      <PageHeader eyebrow={t("Tax year {fy}", { fy: data.financialYear })} title={t("Tax")} emphasis={t("declarations")} sub={t("Choose your tax regime. On the old regime, declare investments and upload proofs — Finance verifies them before they reduce your TDS.")} />
      <DeclareClient
        regime={data.regime}
        overridden={data.overridden}
        canChangeRegime={data.canChangeRegime}
        windowOpen={data.windowOpen}
        windowText={data.windowText}
        newTax={data.newTax}
        oldTax={data.oldTax}
        monthlyTds={data.monthlyTds}
        epf={data.epf}
        profile={data.profile}
        items={data.items}
      />
    </div>
  );
}
