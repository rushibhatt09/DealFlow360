"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "danger" | "info";
type ToastInput = { title: string; description?: string; variant?: ToastVariant };
type ToastItem = ToastInput & { id: number };

const ToastContext = React.createContext<{ showToast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  danger: XCircle,
  info: Info,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-border bg-card text-primary",
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const Icon = VARIANT_ICON[toast.variant ?? "info"];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-3.5 shadow-lg transition-all duration-300 ease-out",
        shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        VARIANT_STYLES[toast.variant ?? "info"],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { ...input, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
