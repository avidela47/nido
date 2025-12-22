"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "ok" | "error";
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = uid();
    const toast: Toast = { id, ...t };

    setItems((prev) => [toast, ...prev].slice(0, 3));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-9999 flex w-[320px] flex-col gap-2">
        {items.map((t) => {
          const tone =
            t.variant === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800";

          return (
            <div
              key={t.id}
              className={`rounded-2xl border px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ${tone}`}
            >
              <div className="text-sm font-semibold">{t.title}</div>
              {t.description ? (
                <div className="mt-1 text-xs opacity-90">{t.description}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}

