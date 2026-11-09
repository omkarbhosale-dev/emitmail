"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, Info, WarningCircle, XCircle, X } from "@phosphor-icons/react";
import { ToastMessage } from "@/types";

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((options: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...options, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-kumo-base border border-kumo-line shadow-lg transition-all animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "error" ? (
                <XCircle size={18} weight="fill" className="text-kumo-danger" />
              ) : t.type === "warning" ? (
                <WarningCircle size={18} weight="fill" className="text-cf-amber" />
              ) : t.type === "info" ? (
                <Info size={18} weight="fill" className="text-cf-chart-blue" />
              ) : (
                <CheckCircle size={18} weight="fill" className="text-cf-success" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-kumo-strong">{t.title}</div>
              {t.description && (
                <div className="text-xs text-kumo-subtle mt-0.5 leading-relaxed">{t.description}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-kumo-muted hover:text-kumo-strong p-1 rounded transition-colors"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
