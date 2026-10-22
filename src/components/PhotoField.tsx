import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/i18n/client";
import { squarePhoto } from "@/lib/photo";

/**
 * Picture picker: the current photo (or initials) as a large circle, with "Choose / Change photo" and "Remove photo".
 * A picked file is cropped and shrunk here and handed to `onPick`; `pending` is a picked-but-not-yet-saved picture
 * (shown instead of the saved one). Errors (wrong type, unreadable file, server refusal from `onPick`) show underneath.
 */
export function PhotoField({ id, name, photo, pending, onPick, onRemove, busy, disabled }: {
  id?: string; name: string; photo?: number | null; pending?: Blob | null; busy?: boolean; disabled?: boolean;
  onPick: (photo: Blob) => Promise<string | null | void> | void; onRemove?: () => Promise<string | null | void> | void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) { setPreview(null); return; }
    const url = URL.createObjectURL(pending);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    try {
      const errorMessage = await onPick(await squarePhoto(file));
      if (errorMessage) setErr(errorMessage);
    } catch (e) {
      setErr(t((e as Error).message));
    }
  };
  const remove = async () => { setErr(""); const errorMessage = await onRemove?.(); if (errorMessage) setErr(errorMessage); };
  const has = !!photo || !!pending;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      {preview
        ? <span className="avatar lg photo-lg"><img src={preview} alt={name} /></span>
        : <Avatar id={id} name={name} photo={photo} isLarge style={{ width: 84, height: 84, fontSize: 28 }} />}
      <div className="col" style={{ gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm" disabled={busy || disabled} onClick={() => input.current?.click()}>{has ? t("Change photo") : t("Choose photo")}</button>
          {has && onRemove && <button type="button" className="btn btn-sm btn-ghost" disabled={busy || disabled} onClick={remove}>{t("Remove photo")}</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
        <small className="faint">{t("JPG, PNG or WebP. It is shown to everyone in your company.")}</small>
        {err && <span className="err" role="alert">{err}</span>}
      </div>
    </div>
  );
}
