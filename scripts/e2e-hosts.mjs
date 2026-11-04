// The web addresses of the end-to-end run. By default everything is http://localhost:<web port>. With E2E_TENANT_HOST=1 the API runs with
// per-business addresses switched on (jurisone.tenant-host.enabled + enforce, base domain localhost): the demo business is opened at
// http://juris-consultants.localhost:<web port> and the platform (super admin) at http://admin.localhost:<web port>. Chromium resolves
// every *.localhost name to this machine, so no hosts-file entry is needed.
import { e2ePorts } from "./e2e-slot.mjs";

export const isTenantHostRun = process.env.E2E_TENANT_HOST === "1";
export const DEMO_BUSINESS_CODE = "juris-consultants";

/** The bare address, used for health checks and as the API's configured web origin (its scheme and port are the ones every business address uses). */
export const apexOrigin = `http://localhost:${e2ePorts.web}`;

/** The address of one business, or of the platform console for the label "admin" (the apex address when per-business addresses are off). */
export function businessOrigin(businessCode) {
  return isTenantHostRun ? `http://${businessCode}.localhost:${e2ePorts.web}` : apexOrigin;
}
