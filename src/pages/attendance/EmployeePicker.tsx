import { useEffect, useState } from "react";
import { apiData } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import { usePage } from "@/lib/page";

export interface PickedEmployee { id: string; name: string }

/**
 * Admin / HR pick the employee a request is raised for (search by name or code in the business directory); nothing picked means the request
 * is for the signed-in user. Shows nothing to anybody without the approval permission. The server checks the permission and the business again.
 */
export function EmployeePicker({ value, onChange }: { value: PickedEmployee | null; onChange: (employee: PickedEmployee | null) => void }) {
  const t = useT();
  const { user } = usePage();
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<PickedEmployee[]>([]);
  const canRaiseForOthers = user.perms.has("appr.reg");

  useEffect(() => {
    if (!canRaiseForOthers || search.trim().length < 2) { setPeople([]); return; }
    let current = true;
    const timer = setTimeout(() => {
      apiData<{ rows: PickedEmployee[] }>(`/api/v1/directory?search=${encodeURIComponent(search.trim())}`)
        .then((found) => { if (current) setPeople(found.rows.filter((row) => row.id !== user.id)); })
        .catch(() => {});
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [search, canRaiseForOthers, user.id]);

  if (!canRaiseForOthers) return null;
  return (
    <div className="field">{t("Employee")} <span className="hint">{t("leave empty for yourself")}</span>
      {value ? (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <b>{value.name}</b>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { onChange(null); setSearch(""); }}>{t("Change")}</button>
        </div>
      ) : (
        <>
          <input value={search} placeholder={t("Search by employee")} onChange={(e) => setSearch(e.target.value)} />
          {people.length > 0 && (
            <div className="col" style={{ gap: 2, marginTop: 4 }}>
              {people.map((person) => <button type="button" key={person.id} className="btn btn-sm btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => { onChange(person); setPeople([]); }}>{person.name}</button>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
