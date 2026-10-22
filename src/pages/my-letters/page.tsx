import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import type { IssuedLetter } from "@/lib/api-types";
import { PageLoading, useData, usePage } from "@/lib/page";
import { formatDayMonthYear, isoDateIn } from "@/lib/format";


/** Letters HR has issued to the signed-in employee (offer, appointment, experience, relieving, employment verification). */
export default function MyLettersPage() {
  const { user, t } = usePage();
  const rows = useData<IssuedLetter[]>("/api/letters/mine");
  if (!rows) return <PageLoading />;

  return (
    <div className="col">
      <PageHeader eyebrow={t("Documents")} title={t("My")} emphasis={t("letters")} sub={t("Letters issued to you by HR. Each has a reference number and never changes once issued; download the PDF for your records.")} />
      <div className="slip-grid">
        {rows.map((letter, i) => (
          <div key={letter.id} className="card slip-card enter" style={{ ["--i" as string]: i }}>
            <span className="spot"></span>
            <span className="slip-ico"><Icon name="doc" size={20} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left", flex: 1, minWidth: 0 }}>
              <b className="display" style={{ fontSize: 20 }}>{letter.subject}</b>
              <span className="faint" style={{ fontSize: 12.5 }}>{letter.templateName} · {t("issued {date} by {name}", { date: formatDayMonthYear(isoDateIn(letter.issuedAt, user.timeZone)), name: letter.issuedBy })}</span>
              <span className="faint mono" style={{ fontSize: 11.5 }}>{letter.reference}</span>
            </span>
            <a className="btn btn-sm btn-gold" href={`/api/letters/${letter.id}/pdf`} download><Icon name="download" size={14} />{t("PDF")}</a>
          </div>
        ))}
      </div>
      {!rows.length && (
        <div className="empty">
          <b className="display">{t("No letters yet")}</b>
          <span className="muted">{t("Letters HR issues to you, such as an appointment or experience letter, will appear here.")}</span>
        </div>
      )}
    </div>
  );
}
