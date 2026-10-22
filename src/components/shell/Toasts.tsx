
import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "@/components/Icon";

type Kind = "ok" | "bad";
interface Toast { id: number; message: string; kind: Kind }

const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(Ctx);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Kind = "ok") => {
    const id = ++seq;
    setToasts((previousToasts) => [...previousToasts, { id, message, kind }]);
    setTimeout(() => setToasts((currentToasts) => currentToasts.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span className="ti" style={toast.kind === "bad" ? { background: "var(--badbg)", color: "var(--bad)" } : undefined}>
              <Icon name={toast.kind === "bad" ? "x" : "ok"} size={14} />
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
