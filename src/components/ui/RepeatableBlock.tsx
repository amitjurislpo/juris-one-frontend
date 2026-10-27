import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";

/** One numbered block of a repeatable group ("Education 1", "Member 2"): title, an x to remove (when allowed) and the fields in a grid. */
export function RepeatableBlock({ title, onRemove, children }: { title: string; onRemove?: () => void; children: React.ReactNode }) {
  const t = useT();
  return (
    <section className="repeat-block" aria-label={title}>
      <div className="repeat-block-h">
        <h4>{title}</h4>
        {onRemove && <button type="button" className="icon-btn" onClick={onRemove} aria-label={t("Remove {title}", { title })}><Icon name="x" size={16} /></button>}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}
