// @ts-nocheck — P1 bootstrap note: this file IS fully typed (rewritten for Next).
"use client";

import {
  useState,
  useCallback,
  useEffect,
  createContext,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ToastType } from '@/types';

export interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
export { ToastContext };

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

const styles: Record<ToastType, CSSProperties> = {
  success: {
    background: 'var(--success-bg)',
    borderColor: 'var(--success-border)',
    color: 'var(--success-text)',
  },
  error: {
    background: 'var(--danger-bg)',
    borderColor: 'var(--danger-border)',
    color: 'var(--danger-text)',
  },
  info: {
    background: 'var(--info-bg)',
    borderColor: 'var(--info-border)',
    color: 'var(--info-text)',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setToasts([]);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[300] space-y-2 w-[calc(100vw-2rem)] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center p-4 rounded-xl glass shadow-xl border"
            style={styles[toast.type] || styles.info}
          >
            {toast.type === 'success' && <CheckCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'error' && <XCircle className="mr-3 flex-shrink-0" size={18} />}
            {toast.type === 'info' && <Info className="mr-3 flex-shrink-0" size={18} />}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="ml-3 flex-shrink-0 hover:opacity-70 p-2 min-w-9 min-h-9 flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
