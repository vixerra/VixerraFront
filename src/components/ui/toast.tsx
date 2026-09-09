"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "default" }) => {
      const id = ++idCounter;
      setItems((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 shadow-floating"
          >
            <ToastIcon variant={item.variant} />
            <div className="min-w-0 flex-1">
              <p className="text-label text-ink">{item.title}</p>
              {item.description && (
                <p className="mt-1 text-caption text-muted">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className={cn(
                "shrink-0 rounded-full p-1 text-muted transition-colors",
                "hover:bg-white/8 hover:text-ink",
              )}
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />;
  }
  if (variant === "error") {
    return <XCircle className="size-5 shrink-0 text-accent" aria-hidden="true" />;
  }
  return <Info className="size-5 shrink-0 text-brand" aria-hidden="true" />;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
