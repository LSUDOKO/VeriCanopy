"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; title: string; body?: string; kind?: "info" | "success" | "warn" | "error" };
const Ctx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 7000);
  }, []);
  const color = { info: "var(--teal)", success: "var(--canopy)", warn: "var(--amber)", error: "var(--red)" };
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="card p-3 shadow-lg" style={{ borderLeft: `4px solid ${color[t.kind ?? "info"]}` }}>
            <div className="font-medium text-sm">{t.title}</div>
            {t.body && <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>{t.body}</div>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
