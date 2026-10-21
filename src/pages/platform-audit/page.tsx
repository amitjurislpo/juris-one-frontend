import { AuditTable } from "../audit/AuditTable";

/** The super admin's audit log across all businesses. */
export default function PlatformAuditPage() {
  return <AuditTable platform />;
}
