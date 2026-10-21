import { useState } from "react";
import { PhotoField } from "@/components/PhotoField";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { useCurrentUser, useReadOnly } from "@/lib/session";
import { removeProfilePhoto, uploadProfilePhoto } from "./actions";

/** My profile: the signed-in person's own photo. */
export function PhotoCard() {
  const t = useT();
  const toast = useToast();
  const readOnly = useReadOnly();
  const { user } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  if (!user || readOnly) return null;
  const run = async (job: () => Promise<{ ok: true; msg?: string } | { ok: false; error: string }>) => {
    setBusy(true);
    const r = await job();
    setBusy(false);
    if (r.ok) { toast(r.msg ?? t("Photo saved")); return null; }
    return r.error;
  };
  return (
    <section className="card" style={{ padding: 18 }}>
      <div className="card-h"><h3>{t("Profile photo")}</h3></div>
      <PhotoField id={user.id} name={user.name} photo={user.photo} busy={busy}
        onPick={(blob) => run(() => uploadProfilePhoto(blob))} onRemove={() => run(removeProfilePhoto)} />
    </section>
  );
}
