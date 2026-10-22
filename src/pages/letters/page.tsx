import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { IssuedLetter, LetterField, LetterTemplateRow } from "@/lib/api-types";
import { can } from "@/lib/session";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, isoDateIn } from "@/lib/format";
import { IssueLetter, TemplatesTable, TYPE_LABEL, type EmployeeChoice } from "./LettersClient";


/** HR: issue offer, appointment, experience, relieving and employment-verification letters from editable templates. */
export default function LettersPage() {
  const { user, t } = usePage();
  const templates = useData<LetterTemplateRow[]>("/api/letters/templates");
  const employees = useData<EmployeeChoice[]>("/api/letters/employees");
  const issued = useData<IssuedLetter[]>("/api/letters");
  const meta = useData<{ fields: LetterField[] }>("/api/letters/fields");
  if (!templates || !employees || !issued || !meta) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("People ops")} title={t("HR")} emphasis={t("letters")}
        sub={t("Pick a template and an employee. The letter gets a reference number, a PDF and a permanent record, and the employee finds it under My letters. Letters that state a salary can only be issued by someone who manages salary structures.")} />
      <IssueLetter templates={templates} employees={employees} canSalary={can(user, "struct.manage")} />
      <TemplatesTable templates={templates} fields={meta.fields} />

      <section className="card enter" style={{ ["--i" as string]: 3 }}>
        <div className="card-h" style={{ padding: "16px 18px 0" }}><h3>{t("Issued letters")}</h3></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>{t("Reference")}</th><th>{t("Employee")}</th><th className="hide-sm">{t("Letter")}</th><th className="hide-sm">{t("Issued")}</th><th></th></tr></thead>
            <tbody>
              {issued.map((letter) => (
                <tr key={letter.id}>
                  <td className="mono" style={{ fontSize: 12.5 }}>{letter.reference}</td>
                  <td><b>{letter.employeeName}</b> <span className="muted mono" style={{ fontSize: 12 }}>{letter.employeeCode}</span></td>
                  <td className="muted hide-sm">{t(TYPE_LABEL[letter.type])}{letter.needsSalary && <span className="chip warn nodot" style={{ marginLeft: 6 }}>{t("States salary")}</span>}</td>
                  <td className="muted hide-sm">{formatDayMonthYear(isoDateIn(letter.issuedAt, user.timeZone))} · {letter.issuedBy}</td>
                  <td className="r">
                    {letter.canOpen ? <a className="btn btn-sm" href={`/api/letters/${letter.id}/pdf`} download><Icon name="download" size={14} />{t("PDF")}</a>
                      : <span className="faint" style={{ fontSize: 12 }}>{t("Salary letter")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!issued.length && <div className="empty"><b className="display">{t("No letters issued yet")}</b><span className="muted">{t("Choose a template and an employee above.")}</span></div>}
      </section>
    </div>
  );
}
