import { Icon } from "@/components/Icon";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useT } from "@/lib/i18n/client";
import { REQUEST_LABEL, type RequestKind } from "./requestKinds";

/**
 * The "Request" button of the Attendance summary: a menu of the requests that can be raised from this page (regularization, On Duty, remote
 * work). Choosing one opens its form on the same page.
 */
export function RequestMenu({ kinds, onChoose }: { kinds: RequestKind[]; onChoose: (kind: RequestKind) => void }) {
  const t = useT();
  return (
    <DropdownMenu triggerClassName="btn btn-gold" trigger={<>{t("Request")} <Icon name="chevD" size={14} /></>} menuLabel={t("Request")}>
      {(close) => kinds.map((kind) => <button key={kind} type="button" role="menuitem" onClick={() => { close(); onChoose(kind); }}>{t(REQUEST_LABEL[kind])}</button>)}
    </DropdownMenu>
  );
}
