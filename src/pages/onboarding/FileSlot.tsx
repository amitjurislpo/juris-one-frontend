import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { attachmentProblem, formatFileSize } from "./attachmentSlots";
import type { AttachmentSlot } from "./types";

/** One upload slot: heading (red * when mandatory), (i) tooltip, the files already added (view / remove), and an "Add Attachment" tile. */
export function FileSlot({ slot, isReadOnly, onAdd, onRemove, attachmentUrl }: {
  slot: AttachmentSlot;
  isReadOnly: boolean;
  /** Uploads one file; resolves with an error text or null. */
  onAdd: (file: File, onProgress: (percent: number) => void) => Promise<string | null>;
  /** Removes one file; resolves with an error text or null. */
  onRemove: (fileId: string) => Promise<string | null>;
  attachmentUrl: (fileId: string, isDownload: boolean) => string;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function addFile(file: File | undefined) {
    if (!file) return;
    const localProblem = attachmentProblem(file);
    if (localProblem) { setProblem(t(localProblem)); return; }
    setProblem("");
    setProgress(0);
    const serverProblem = await onAdd(file, setProgress);
    setProgress(null);
    if (serverProblem) setProblem(serverProblem);
    if (input.current) input.current.value = "";
  }

  async function removeFile(fileId: string) {
    setRemovingId(fileId);
    const serverProblem = await onRemove(fileId);
    setRemovingId(null);
    setProblem(serverProblem ?? "");
  }

  return (
    <div className="col" style={{ gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <b style={{ fontSize: 14 }}>{slot.title}{slot.isMandatory && <span style={{ color: "var(--bad)" }} aria-label={t("Required")}> *</span>}</b>
        {slot.tooltip && (
          <>
            <button type="button" className="icon-btn" aria-label={t("More information")} aria-expanded={isTipOpen} onClick={() => setIsTipOpen(!isTipOpen)} onMouseEnter={() => setIsTipOpen(true)} onMouseLeave={() => setIsTipOpen(false)} onBlur={() => setIsTipOpen(false)}>
              <Icon name="info" size={15} />
            </button>
            {isTipOpen && <div role="tooltip" className="card pad" style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, maxWidth: 360, fontSize: 12.5, whiteSpace: "pre-line" }}>{slot.tooltip}</div>}
          </>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {slot.files.map((file) => (
          <div key={file.id} className="card pad" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220, maxWidth: 320, padding: 12 }}>
            <Icon name="doc" size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div title={file.fileName} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500 }}>{file.fileName}</div>
              <small className="faint">{formatFileSize(file.sizeBytes)}</small>
            </div>
            <a className="icon-btn" href={attachmentUrl(file.id, false)} target="_blank" rel="noreferrer" aria-label={t("View {name}", { name: file.fileName })}><Icon name="eye" size={16} /></a>
            {!isReadOnly && <button type="button" className="icon-btn" disabled={removingId === file.id} onClick={() => removeFile(file.id)} aria-label={t("Remove {name}", { name: file.fileName })}><Icon name="x" size={16} /></button>}
          </div>
        ))}
        {!isReadOnly && (
          <button type="button" className="card" disabled={progress !== null} onClick={() => input.current?.click()}
            style={{ minWidth: 160, minHeight: 64, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderStyle: "dashed", cursor: "pointer", background: "transparent" }}>
            {progress === null ? (
              <><Icon name="plus" size={16} /><span style={{ fontSize: 13, fontWeight: 500 }}>{t("Add Attachment")}</span></>
            ) : (
              <><span style={{ fontSize: 13 }}>{t("Uploading… {percent}%", { percent: progress })}</span><progress value={progress} max={100} style={{ width: 120 }} /></>
            )}
          </button>
        )}
        <input ref={input} type="file" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => addFile(event.target.files?.[0])} />
      </div>
      {!isReadOnly && <small className="faint">{t("Only pdf, doc, docx, jpg & png. Max 10MB")}</small>}
      {problem && <span className="err" role="alert">{problem}</span>}
    </div>
  );
}
