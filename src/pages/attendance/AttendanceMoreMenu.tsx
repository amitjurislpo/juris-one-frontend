import { Icon } from "@/components/Icon";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useT } from "@/lib/i18n/client";

/** The "…" menu of the Attendance summary: Export CSV, Export PDF, Print and Help. */
export function AttendanceMoreMenu({ exportLink, onHelp }: { exportLink: (format: "csv" | "pdf") => string; onHelp: () => void }) {
  const t = useT();
  return (
    <DropdownMenu triggerClassName="icon-btn" trigger={<Icon name="more" size={18} />} triggerLabel={t("More options")} menuLabel={t("More options")} minWidth={180}>
      {(close) => <>
        <a role="menuitem" href={exportLink("csv")} download onClick={close}><Icon name="download" size={14} /> {t("Export CSV")}</a>
        <a role="menuitem" href={exportLink("pdf")} download onClick={close}><Icon name="download" size={14} /> {t("Export PDF")}</a>
        <button type="button" role="menuitem" onClick={() => { close(); window.print(); }}><Icon name="print" size={14} /> {t("Print")}</button>
        <div className="sep"></div>
        <button type="button" role="menuitem" onClick={() => { close(); onHelp(); }}><Icon name="info" size={14} /> {t("Help")}</button>
      </>}
    </DropdownMenu>
  );
}
