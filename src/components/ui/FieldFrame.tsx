import { useId, type ReactNode } from "react";

/**
 * The label, red star, error message and error styling shared by every wizard field. `children` receives the id of the
 * control and the id of the error message so the control can label itself and point at its error.
 */
export function FieldFrame({ label, isRequired, error, hint, isWide, children }: {
  label: string; isRequired?: boolean; error?: string; hint?: string; isWide?: boolean;
  children: (ids: { controlId: string; describedBy: string | undefined; isInvalid: boolean }) => ReactNode;
}) {
  const controlId = useId();
  const errorId = `${controlId}-error`;
  return (
    <div className={`field${error ? " has-error" : ""}${isWide ? " field-wide" : ""}`}>
      <label htmlFor={controlId}>{label}{isRequired && <span className="field-required" aria-hidden="true"> *</span>}</label>
      {children({ controlId, describedBy: error ? errorId : undefined, isInvalid: !!error })}
      {error && <span id={errorId} className="err" role="alert">{error}</span>}
      {hint && !error && <span className="hint">{hint}</span>}
    </div>
  );
}
