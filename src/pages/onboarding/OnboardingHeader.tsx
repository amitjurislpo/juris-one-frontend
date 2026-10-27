import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/shell/Toasts";
import { useT } from "@/lib/i18n/client";
import { squarePhoto } from "@/lib/photo";
import { useCurrentUser } from "@/lib/session";
import { uploadProfilePhoto } from "../profile/actions";
import type { OnboardingHeader as OnboardingHeaderData } from "./types";

/**
 * The top of every onboarding screen: "Hi, NAME", the hint line and the employee card (photo with a pencil badge, ID, point of
 * contact with an (i) that shows the contact details, department, location, designation). `canEditPhoto` is for the employee's own screens.
 */
export function OnboardingHeader({ header, canEditPhoto, title }: { header: OnboardingHeaderData; canEditPhoto: boolean; title?: string }) {
  const t = useT();
  const toast = useToast();
  const { user } = useCurrentUser();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const contact = header.pointOfContact;

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setIsBusy(true);
    try {
      const result = await uploadProfilePhoto(await squarePhoto(file));
      toast(result.ok ? t("Photo saved") : result.error, result.ok ? undefined : "bad");
    } catch (problem) {
      toast(t((problem as Error).message), "bad");
    }
    setIsBusy(false);
  }

  return (
    <header className="onboarding-head enter">
      <div>
        <h1 className="display">{title ?? t("Hi, {name}", { name: header.name.toUpperCase() })}</h1>
        <p className="muted">{t("Help us know you better! Provide all your employment information.")}</p>
      </div>
      <div className="card pad onboarding-card">
        <div className="onboarding-photo">
          {canEditPhoto && user
            ? <Avatar id={user.id} name={header.name} photo={user.photo} isLarge style={{ width: 72, height: 72, fontSize: 24 }} />
            : header.photoUrl ? <img className="avatar lg" style={{ width: 72, height: 72 }} src={header.photoUrl} alt={header.name} /> : <Avatar name={header.name} isLarge style={{ width: 72, height: 72, fontSize: 24 }} />}
          {canEditPhoto && (
            <>
              <button type="button" className="onboarding-photo-edit" disabled={isBusy} aria-label={t("Change photo")} onClick={() => fileInput.current?.click()}><Icon name="edit" size={13} /></button>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { void changePhoto(event.target.files?.[0]); event.target.value = ""; }} />
            </>
          )}
        </div>
        <dl className="onboarding-facts">
          <div><dt>{t("Name")}</dt><dd>{header.name}</dd></div>
          <div><dt>{t("Emp ID")}</dt><dd>{header.employeeCode}</dd></div>
          <div>
            <dt>{t("Point of contact")}</dt>
            <dd>
              {contact?.name ?? "-"}
              {contact && (
                <span className="onboarding-contact" tabIndex={0} aria-label={t("Contact details")}>
                  <Icon name="info" size={14} />
                  <span className="onboarding-contact-tip" role="tooltip">{[contact.name, contact.email, contact.phone].filter(Boolean).join(" · ")}</span>
                </span>
              )}
            </dd>
          </div>
          <div><dt>{t("Department")}</dt><dd>{header.department ?? "-"}</dd></div>
          <div><dt>{t("Location")}</dt><dd>{header.location ?? "-"}</dd></div>
          <div><dt>{t("Designation")}</dt><dd>{header.designation ?? "-"}</dd></div>
        </dl>
      </div>
    </header>
  );
}
