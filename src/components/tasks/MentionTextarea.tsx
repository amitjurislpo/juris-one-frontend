import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { TaskAssignee } from "@/lib/api-types";
import { useT } from "@/lib/i18n/client";
import { insertMention, mentionQueryAt } from "@/lib/tasks";
import { searchAssignees } from "./PersonPicker";

/**
 * A textarea where typing `@` and a few letters offers people (arrow keys, Enter or Tab to pick, Esc to close). The
 * text shows `@Name`; the picked people are reported in `mentioned` so the caller stores them as `@{uuid}` tokens
 * (namesToMentions). Ctrl+Enter submits.
 */
export function MentionTextarea({ label, value, onChange, mentioned, onMentionedChange, projectId, placeholder, rows = 3, maxLength, onSubmit, autoFocus, isLabelHidden }: {
  label: string; value: string; onChange: (text: string) => void;
  mentioned: { id: string; name: string }[]; onMentionedChange: (mentioned: { id: string; name: string }[]) => void;
  projectId?: string | null; placeholder?: string; rows?: number; maxLength?: number; onSubmit?: () => void; autoFocus?: boolean; isLabelHidden?: boolean;
}) {
  const t = useT();
  const area = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [people, setPeople] = useState<TaskAssignee[]>([]);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (!query) return;
    let isCurrent = true;
    const timer = setTimeout(() => { void searchAssignees(query, projectId).then((found) => { if (isCurrent) { setPeople(found.slice(0, 8)); setActive(0); } }); }, 200);
    return () => { isCurrent = false; clearTimeout(timer); };
  }, [query, projectId]);

  const isOpen = !!query && people.length > 0;
  const updateQuery = (text: string, caret: number) => {
    const next = mentionQueryAt(text, caret);
    setQuery(next);
    if (!next) setPeople([]);
  };
  const pick = (person: TaskAssignee) => {
    const element = area.current!;
    const result = insertMention(value, element.selectionStart, person.name);
    onChange(result.text);
    if (!mentioned.some((entry) => entry.id === person.id)) onMentionedChange([...mentioned, { id: person.id, name: person.name }]);
    setQuery(null);
    setPeople([]);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(result.caret, result.caret); });
  };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((index) => (index + 1) % people.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((index) => (index - 1 + people.length) % people.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(people[active]); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setQuery(null); setPeople([]); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onSubmit) { e.preventDefault(); onSubmit(); }
  };

  return (
    <div className="mention-box">
      <label className="field">
        <span className={isLabelHidden ? "sr-only" : undefined}>{label}</span>
        <textarea ref={area} value={value} rows={rows} maxLength={maxLength} placeholder={placeholder} autoFocus={autoFocus}
          role="combobox" aria-expanded={isOpen} aria-controls={isOpen ? listId : undefined} aria-autocomplete="list"
          aria-activedescendant={isOpen ? `${listId}-${active}` : undefined}
          onChange={(e) => { onChange(e.target.value); updateQuery(e.target.value, e.target.selectionStart); }}
          onKeyDown={onKey}
          onClick={(e) => updateQuery(e.currentTarget.value, e.currentTarget.selectionStart)}
          onBlur={() => setTimeout(() => { setQuery(null); setPeople([]); }, 150)} />
      </label>
      {isOpen && (
        <ul id={listId} role="listbox" aria-label={t("People to mention")} className="person-picker-list mention-list">
          {people.map((person, i) => (
            <li key={person.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : undefined}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(person); }}>
              <Avatar id={person.id} name={person.name} photo={person.photo} style={{ width: 22, height: 22, fontSize: 9 }} /><span>{person.name}</span><small className="muted">{person.code}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
