import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import type { OnboardingApi } from "../actions";
import { groupSlots } from "../attachmentSlots";
import { FileSlot } from "../FileSlot";
import type { AttachmentSlot } from "../types";

/** Step 6: one collapsible section per slot group; every upload or removal (through `api`: the employee's own or HR's on-behalf one) ends with `onChanged` so the payload is fetched again. */
export function StepAttachments({ slots, onChanged, isReadOnly, api }: { slots: AttachmentSlot[]; onChanged: () => void; isReadOnly: boolean; api: OnboardingApi }) {
  const t = useT();

  async function add(slotKey: string, file: File, onProgress: (percent: number) => void): Promise<string | null> {
    const result = await api.uploadAttachment(slotKey, file, onProgress);
    if (!result.ok) return result.error;
    onChanged();
    return null;
  }

  async function remove(attachmentId: string): Promise<string | null> {
    const result = await api.deleteAttachment(attachmentId);
    if (!result.ok) return result.error;
    onChanged();
    return null;
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {groupSlots(slots).map(({ group, slots: groupedSlots }) => (
        <details key={group} open className="card pad">
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="chevD" size={16} />{t(group)}
          </summary>
          <div className="col" style={{ gap: 22, marginTop: 16 }}>
            {groupedSlots.map((slot) => (
              <FileSlot key={slot.slotKey} slot={slot} isReadOnly={isReadOnly} onAdd={(file, onProgress) => add(slot.slotKey, file, onProgress)} onRemove={remove} attachmentUrl={api.attachmentUrl} />
            ))}
          </div>
        </details>
      ))}
      {!slots.length && <div className="empty"><span className="muted">{t("No attachments are needed yet.")}</span></div>}
    </div>
  );
}
