import { Icon } from "@/components/Icon";

type StepperState = "active" | "complete" | "incomplete" | "unvisited" | "flagged";
export interface StepperItem { key: number; label: string; icon: string; state: StepperState; /** HR flagged something in this step; shown red even while it is the active step. */ isFlagged?: boolean }

/** Clickable progress bar: active = accent, complete = green check, incomplete = orange warning, unvisited = grey outline, flagged by HR = red. */
export function Stepper({ items, onSelect, label }: { items: StepperItem[]; onSelect: (key: number) => void; label: string }) {
  return (
    <nav className="stepper" aria-label={label}>
      <ol>
        {items.map((item) => (
          <li key={item.key} className={`step ${item.state}${item.isFlagged ? " flagged" : ""}`}>
            <button type="button" onClick={() => onSelect(item.key)} aria-current={item.state === "active" ? "step" : undefined}>
              <span className="step-dot"><Icon name={item.state === "complete" ? "check" : item.icon} size={18} /></span>
              <span className="step-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
