import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { apiData } from "@/lib/api";
import type { TaskAssignee } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";

export interface PickedPerson { id: string; name: string; photo?: number | null; reportingManagerId?: string | null; reportingManagerName?: string | null }

/** People matching `search` (name or code) who can be picked for a task; at most 20 (GET /api/v1/tasks/assignees). */
export async function searchAssignees(search: string, projectId?: string | null): Promise<TaskAssignee[]> {
  const query = new URLSearchParams({ search });
  if (projectId) query.set("projectId", projectId);
  try {
    return await apiData<TaskAssignee[]>(`/api/v1/tasks/assignees?${query}`);
  } catch {
    return [];
  }
}

/**
 * Search-as-you-type person select: a button showing the chosen person; opening it gives a search box over a listbox
 * (arrow keys, Enter to pick, Esc to close). "Nobody" clears the choice. `excludeId` keeps one person out (the other
 * assignee box: the same person cannot be both).
 */
export function PersonPicker({ label, value, onChange, projectId, excludeId, isNobodyAllowed = true, disabled, hint }: {
  label: string; value: PickedPerson | null; onChange: (person: PickedPerson | null) => void;
  projectId?: string | null; excludeId?: string | null; isNobodyAllowed?: boolean; disabled?: boolean; hint?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TaskAssignee[]>([]);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // debounced like SearchBox (250 ms); a stale answer never replaces a newer one. An empty search lists the first people (members first).
  useEffect(() => {
    if (!open) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      void searchAssignees(search.trim(), projectId).then((people) => { if (isCurrent) { setResults(people); setActive(0); } });
    }, 250);
    return () => { isCurrent = false; clearTimeout(timer); };
  }, [search, open, projectId]);

  const shownResults = results.filter((person) => person.id !== excludeId);
  const options: (PickedPerson | null)[] = [...(isNobodyAllowed ? [null] : []), ...shownResults.map((person) => ({ id: person.id, name: person.name, photo: person.photo, reportingManagerId: person.reportingManagerId, reportingManagerName: person.reportingManagerName }))];
  const pick = (person: PickedPerson | null) => { setOpen(false); setSearch(""); setResults([]); onChange(person); };
  const openPicker = () => { if (disabled) return; setOpen(true); setActive(0); requestAnimationFrame(() => input.current?.focus()); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((index) => Math.min(options.length - 1, index + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active] !== undefined) pick(options[active]); }
  };

  return (
    <div className="person-picker" ref={wrap}>
      <span className="person-picker-label" id={labelId}>{label}{hint && <span className="hint"> · {hint}</span>}</span>
      {!open ? (
        <button type="button" className="person-picker-value" disabled={disabled} aria-labelledby={labelId} aria-haspopup="listbox" onClick={openPicker}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); openPicker(); } }}>
          {value ? <><Avatar id={value.id} name={value.name} photo={value.photo} style={{ width: 24, height: 24, fontSize: 10 }} /><span>{value.name}</span></> : <span className="muted">{t("Nobody")}</span>}
          {!disabled && <span aria-hidden="true" className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>▾</span>}
        </button>
      ) : (
        <>
          <input ref={input} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onKey} role="combobox" aria-expanded="true" aria-controls={listId}
            aria-activedescendant={options.length ? `${listId}-${active}` : undefined} aria-autocomplete="list" aria-label={t("Search people for {label}", { label })}
            placeholder={t("Type a name or code…")} maxLength={60} />
          <ul id={listId} role="listbox" aria-label={label} className="person-picker-list">
            {options.map((person, i) => (
              <li key={person?.id ?? "nobody"} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : undefined}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(person); }}>
                {person ? <><Avatar id={person.id} name={person.name} photo={person.photo} style={{ width: 22, height: 22, fontSize: 9 }} /><span>{person.name}</span>
                  <small className="muted">{results.find((result) => result.id === person.id)?.code}</small></> : <span className="muted">{t("Nobody")}</span>}
              </li>
            ))}
            {search.trim() && !shownResults.length && <li className="muted person-picker-hint" aria-disabled="true">{t("No one found")}</li>}
          </ul>
        </>
      )}
    </div>
  );
}
